-- Supabase Database Schema for ENARE Daily
-- Run this in your Supabase SQL Editor

-- Tabela de usuários
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de questões (para referência e controle)
CREATE TABLE questions (
  id VARCHAR(20) PRIMARY KEY, -- formato: "2021-2022-001"
  year VARCHAR(10) NOT NULL,
  number INTEGER NOT NULL,
  content TEXT NOT NULL,
  alternative_a TEXT NOT NULL,
  alternative_b TEXT NOT NULL,
  alternative_c TEXT NOT NULL,
  alternative_d TEXT NOT NULL,
  alternative_e TEXT NOT NULL,
  correct_answer CHAR(1) NOT NULL,
  has_image BOOLEAN DEFAULT FALSE,
  image_url TEXT,
  image_description TEXT,
  tags TEXT[]
);

-- Tabela de respostas
CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  date DATE NOT NULL,
  question_id VARCHAR(20) REFERENCES questions(id),
  selected_answer CHAR(1),
  is_correct BOOLEAN,
  time_spent_seconds INTEGER,
  answered_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, date, question_id)
);

-- Tabela de streaks
CREATE TABLE streaks (
  user_id UUID REFERENCES users(id) PRIMARY KEY,
  current_streak INTEGER DEFAULT 0,
  max_streak INTEGER DEFAULT 0,
  last_activity DATE
);

-- Tabela de questões diárias (cache)
CREATE TABLE daily_questions (
  date DATE PRIMARY KEY,
  question_2021_2022 VARCHAR(20) REFERENCES questions(id),
  question_2022_2023 VARCHAR(20) REFERENCES questions(id),
  question_2023_2024 VARCHAR(20) REFERENCES questions(id)
);

-- View para ranking
CREATE VIEW ranking AS
SELECT
  u.nickname,
  COUNT(CASE WHEN a.is_correct THEN 1 END) as correct_answers,
  COUNT(a.id) as total_answers,
  ROUND(COUNT(CASE WHEN a.is_correct THEN 1 END)::NUMERIC / NULLIF(COUNT(a.id), 0) * 100, 1) as accuracy,
  COALESCE(s.current_streak, 0) as current_streak,
  COALESCE(s.max_streak, 0) as max_streak
FROM users u
LEFT JOIN answers a ON u.id = a.user_id
LEFT JOIN streaks s ON u.id = s.user_id
GROUP BY u.nickname, s.current_streak, s.max_streak
ORDER BY correct_answers DESC;

-- Enable Row Level Security
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_questions ENABLE ROW LEVEL SECURITY;

-- Policies for public access (since we're using simple nickname auth)
CREATE POLICY "Questions are viewable by everyone"
ON questions FOR SELECT
USING (true);

CREATE POLICY "Users are viewable by everyone"
ON users FOR SELECT
USING (true);

CREATE POLICY "Users can insert themselves"
ON users FOR INSERT
WITH CHECK (true);

CREATE POLICY "Answers are viewable by everyone"
ON answers FOR SELECT
USING (true);

CREATE POLICY "Users can insert answers"
ON answers FOR INSERT
WITH CHECK (true);

CREATE POLICY "Streaks are viewable by everyone"
ON streaks FOR SELECT
USING (true);

CREATE POLICY "Users can insert/update their streaks"
ON streaks FOR ALL
USING (true);

CREATE POLICY "Daily questions are viewable by everyone"
ON daily_questions FOR SELECT
USING (true);

CREATE POLICY "Daily questions can be inserted"
ON daily_questions FOR INSERT
WITH CHECK (true);

-- Function to update streaks automatically
CREATE OR REPLACE FUNCTION update_user_streak()
RETURNS TRIGGER AS $$
DECLARE
  user_streak_record RECORD;
  yesterday_date DATE;
  today_date DATE;
  answered_all_today BOOLEAN;
BEGIN
  today_date := NEW.date;
  yesterday_date := today_date - INTERVAL '1 day';

  -- Check if user answered all 3 questions for today
  SELECT COUNT(*) = 3 INTO answered_all_today
  FROM answers
  WHERE user_id = NEW.user_id AND date = today_date;

  -- Only update streak if all questions are answered
  IF answered_all_today THEN
    -- Get current streak record
    SELECT * INTO user_streak_record
    FROM streaks
    WHERE user_id = NEW.user_id;

    IF user_streak_record IS NULL THEN
      -- First time user
      INSERT INTO streaks (user_id, current_streak, max_streak, last_activity)
      VALUES (NEW.user_id, 1, 1, today_date);
    ELSE
      -- Check if yesterday was answered
      IF user_streak_record.last_activity = yesterday_date THEN
        -- Continue streak
        UPDATE streaks
        SET
          current_streak = current_streak + 1,
          max_streak = GREATEST(max_streak, current_streak + 1),
          last_activity = today_date
        WHERE user_id = NEW.user_id;
      ELSIF user_streak_record.last_activity = today_date THEN
        -- Same day, don't change streak
        NULL;
      ELSE
        -- Streak broken, restart
        UPDATE streaks
        SET
          current_streak = 1,
          max_streak = GREATEST(max_streak, 1),
          last_activity = today_date
        WHERE user_id = NEW.user_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update streaks
CREATE TRIGGER update_streak_trigger
  AFTER INSERT ON answers
  FOR EACH ROW
  EXECUTE FUNCTION update_user_streak();