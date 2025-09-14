# Prompt para Criação do ENARE Daily - Jogo de Questões Diárias

## Visão Geral do Projeto
Criar uma aplicação web estilo "Wordle" para questões diárias do ENARE. A aplicação deve servir 3 questões por dia (uma de cada ano: 2021-2022, 2022-2023, 2023-2024) para um grupo de 3 amigos estudantes de medicina, com sistema de ranking, streak e compartilhamento.

## Arquivos Base Disponíveis
```
- questoes_enare_2021-2022.md (106 KB)
- questoes_enare_2022-2023.md (86 KB) 
- questoes_enare_2023-2024.md (111 KB)
- gabarito_enare_2021-2022.md
- gabarito_enare_2022-2023.md
- gabarito_enare_2023-2024.md
- imagens_enare_2021-2022/ (336 KB)
- imagens_enare_2022-2023/ (880 KB)
- imagens_enare_2023-2024/ (676 KB)
- metadados_imagens_enare.json
```

## Stack Tecnológica Requerida

### Frontend
- Next.js 14 com App Router
- TypeScript
- Tailwind CSS
- Framer Motion (animações)
- React Hot Toast (notificações)

### Backend/Database
- Supabase (PostgreSQL gratuito)
- Autenticação: apenas nickname (sem senha)

### Hospedagem
- Vercel (frontend)
- Imagens: Cloudinary (gratuito, até 25GB) ou Supabase Storage

## Estrutura do Banco de Dados (Supabase)

```sql
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
  ROUND(COUNT(CASE WHEN a.is_correct THEN 1 END)::NUMERIC / COUNT(a.id) * 100, 1) as accuracy,
  s.current_streak,
  s.max_streak
FROM users u
LEFT JOIN answers a ON u.id = a.user_id
LEFT JOIN streaks s ON u.id = s.user_id
GROUP BY u.nickname, s.current_streak, s.max_streak
ORDER BY correct_answers DESC;
```

## Processamento e Tratamento de Imagens

### 1. Script de Processamento Inicial

```typescript
// scripts/processQuestionsWithImages.ts
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import cloudinary from 'cloudinary';

interface ProcessedQuestion {
  id: string;
  year: string;
  number: number;
  content: string;
  alternatives: {
    A: string;
    B: string;
    C: string;
    D: string;
    E: string;
  };
  correctAnswer: string;
  hasImage: boolean;
  imagePath?: string;
  imageUrl?: string;
  imageDescription?: string;
  tags: string[];
}

async function uploadImageToCloudinary(imagePath: string): Promise<string> {
  // Configurar Cloudinary
  cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  try {
    const result = await cloudinary.v2.uploader.upload(imagePath, {
      folder: 'enare-daily',
      resource_type: 'image',
      quality: 'auto:good',
      fetch_format: 'auto'
    });
    return result.secure_url;
  } catch (error) {
    console.error('Erro ao fazer upload da imagem:', error);
    throw error;
  }
}

async function processQuestions() {
  const years = ['2021-2022', '2022-2023', '2023-2024'];
  const allQuestions: ProcessedQuestion[] = [];

  for (const year of years) {
    // Ler arquivo markdown
    const mdContent = fs.readFileSync(`questoes_enare_${year}.md`, 'utf-8');
    const gabarito = fs.readFileSync(`gabarito_enare_${year}.md`, 'utf-8');
    
    // Extrair questões com regex
    const questionRegex = /## Questão (\d+)(.*?)(?=## Questão|\z)/gs;
    const matches = [...mdContent.matchAll(questionRegex)];
    
    for (const match of matches) {
      const questionNumber = parseInt(match[1]);
      const questionContent = match[2];
      
      // Verificar se tem imagem
      const imageMatch = questionContent.match(/!\[.*?\]\((.*?)\)/);
      let imageUrl = null;
      let hasImage = false;
      
      if (imageMatch) {
        hasImage = true;
        const localImagePath = imageMatch[1];
        
        // Upload para Cloudinary
        if (fs.existsSync(localImagePath)) {
          imageUrl = await uploadImageToCloudinary(localImagePath);
        }
      }
      
      // Extrair descrição da imagem se houver
      const imageDescRegex = /\*\*\[Descrição Técnica da Imagem\]:\*\*(.*?)(?=\*\*Alternativas|\z)/s;
      const imageDescMatch = questionContent.match(imageDescRegex);
      const imageDescription = imageDescMatch ? imageDescMatch[1].trim() : null;
      
      // Processar e adicionar à lista
      allQuestions.push({
        id: `${year}-${String(questionNumber).padStart(3, '0')}`,
        year,
        number: questionNumber,
        content: extractContent(questionContent),
        alternatives: extractAlternatives(questionContent),
        correctAnswer: extractCorrectAnswer(gabarito, questionNumber),
        hasImage,
        imageUrl,
        imageDescription,
        tags: extractTags(questionContent)
      });
    }
  }
  
  // Salvar no Supabase
  await saveToSupabase(allQuestions);
}
```

### 2. Componente de Exibição de Questão com Imagem

```typescript
// components/Question.tsx
import Image from 'next/image';
import { useState } from 'react';
import { motion } from 'framer-motion';

interface QuestionProps {
  question: {
    id: string;
    content: string;
    alternatives: Record<string, string>;
    hasImage: boolean;
    imageUrl?: string;
    imageDescription?: string;
  };
  selectedAnswer: string | null;
  onSelectAnswer: (answer: string) => void;
  showResult: boolean;
  correctAnswer?: string;
}

export function Question({ question, selectedAnswer, onSelectAnswer, showResult, correctAnswer }: QuestionProps) {
  const [imageError, setImageError] = useState(false);
  const [showDescription, setShowDescription] = useState(false);

  return (
    <motion.div className="bg-white rounded-lg shadow-md p-6 mb-4">
      <div className="mb-4">
        <p className="text-gray-800 leading-relaxed">{question.content}</p>
        
        {question.hasImage && question.imageUrl && (
          <div className="my-4">
            {!imageError ? (
              <div className="relative">
                <Image
                  src={question.imageUrl}
                  alt="Imagem da questão"
                  width={600}
                  height={400}
                  className="w-full h-auto rounded-lg"
                  onError={() => setImageError(true)}
                  priority
                />
                
                {question.imageDescription && (
                  <button
                    onClick={() => setShowDescription(!showDescription)}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    {showDescription ? '📖 Ocultar' : '📖 Ver'} descrição da imagem
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-sm text-gray-600">
                  ⚠️ Erro ao carregar imagem
                </p>
              </div>
            )}
            
            {showDescription && question.imageDescription && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-2 p-3 bg-blue-50 rounded-lg"
              >
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {question.imageDescription}
                </p>
              </motion.div>
            )}
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        {Object.entries(question.alternatives).map(([letter, text]) => (
          <button
            key={letter}
            onClick={() => !showResult && onSelectAnswer(letter)}
            disabled={showResult}
            className={`
              w-full text-left p-3 rounded-lg transition-all
              ${!showResult && selectedAnswer === letter ? 'bg-blue-100 border-2 border-blue-400' : ''}
              ${!showResult && selectedAnswer !== letter ? 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent' : ''}
              ${showResult && letter === correctAnswer ? 'bg-green-100 border-2 border-green-500' : ''}
              ${showResult && letter === selectedAnswer && letter !== correctAnswer ? 'bg-red-100 border-2 border-red-500' : ''}
              ${showResult && letter !== correctAnswer && letter !== selectedAnswer ? 'bg-gray-50 opacity-50' : ''}
            `}
          >
            <span className="font-semibold">{letter})</span> {text}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
```

### 3. Otimização de Imagens

```typescript
// utils/imageOptimization.ts

export const cloudinaryLoader = ({ src, width, quality }: any) => {
  const params = ['f_auto', 'c_limit', `w_${width}`, `q_${quality || 'auto'}`];
  const paramsString = params.join(',');
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  
  // Se já é uma URL do Cloudinary, adicionar transformações
  if (src.includes('cloudinary.com')) {
    return src.replace('/upload/', `/upload/${paramsString}/`);
  }
  
  // Se é uma imagem local (fallback)
  return src;
};

// next.config.js
module.exports = {
  images: {
    loader: 'custom',
    loaderFile: './utils/imageOptimization.ts',
    domains: ['res.cloudinary.com'],
  },
};
```

## Funcionalidades Principais

### 1. Sistema de Questões Diárias

```typescript
// utils/questionSelector.ts
import seedrandom from 'seedrandom';
import { supabase } from '@/lib/supabase';

export async function getDailyQuestions(date: Date) {
  const dateString = date.toISOString().split('T')[0];
  
  // Verificar se já existe no cache
  const { data: cached } = await supabase
    .from('daily_questions')
    .select('*')
    .eq('date', dateString)
    .single();
    
  if (cached) {
    // Buscar questões completas
    const questions = await Promise.all([
      supabase.from('questions').select('*').eq('id', cached.question_2021_2022).single(),
      supabase.from('questions').select('*').eq('id', cached.question_2022_2023).single(),
      supabase.from('questions').select('*').eq('id', cached.question_2023_2024).single()
    ]);
    
    return questions.map(q => q.data);
  }
  
  // Gerar novas questões para o dia
  const rng = seedrandom(dateString);
  
  // Buscar total de questões por ano
  const years = ['2021-2022', '2022-2023', '2023-2024'];
  const selectedQuestions = [];
  
  for (const year of years) {
    const { count } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('year', year);
      
    const randomIndex = Math.floor(rng() * count) + 1;
    
    const { data: question } = await supabase
      .from('questions')
      .select('*')
      .eq('year', year)
      .eq('number', randomIndex)
      .single();
      
    selectedQuestions.push(question);
  }
  
  // Salvar no cache
  await supabase.from('daily_questions').insert({
    date: dateString,
    question_2021_2022: selectedQuestions[0].id,
    question_2022_2023: selectedQuestions[1].id,
    question_2023_2024: selectedQuestions[2].id
  });
  
  return selectedQuestions;
}
```

### 2. Interface Principal

```typescript
// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Question } from '@/components/Question';
import { ShareCard } from '@/components/ShareCard';
import { Stats } from '@/components/Stats';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [user, setUser] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    loadDailyChallenge();
    checkUser();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🏥 ENARE DAILY 🏥
          </h1>
          <p className="text-gray-600">
            Dia #{getDayNumber()} - {new Date().toLocaleDateString('pt-BR')}
          </p>
          {streak > 0 && (
            <p className="text-orange-500 font-semibold mt-2">
              🔥 Streak: {streak} {streak === 1 ? 'dia' : 'dias'}
            </p>
          )}
        </header>

        {/* Questões */}
        <div className="space-y-6">
          {questions.map((question, index) => (
            <div key={question.id}>
              <h2 className="text-xl font-semibold mb-3 text-gray-700">
                Questão ENARE {question.year}
              </h2>
              <Question
                question={question}
                selectedAnswer={answers[question.id]}
                onSelectAnswer={(answer) => handleAnswer(question.id, answer)}
                showResult={showResults}
                correctAnswer={showResults ? question.correct_answer : undefined}
              />
            </div>
          ))}
        </div>

        {/* Botão de Confirmar */}
        {!showResults && (
          <button
            onClick={submitAnswers}
            disabled={Object.keys(answers).length !== 3}
            className="w-full mt-8 py-4 bg-blue-600 text-white rounded-lg font-semibold
                     disabled:bg-gray-400 hover:bg-blue-700 transition-colors"
          >
            CONFIRMAR RESPOSTAS
          </button>
        )}

        {/* Resultados e Compartilhamento */}
        {showResults && (
          <>
            <Stats results={calculateResults()} />
            <ShareCard results={calculateResults()} streak={streak} />
          </>
        )}

        {/* Links do Footer */}
        <footer className="mt-12 flex justify-center space-x-8">
          <a href="/ranking" className="text-blue-600 hover:underline">
            📊 Ranking
          </a>
          <a href="/archive" className="text-blue-600 hover:underline">
            📅 Dias Anteriores
          </a>
        </footer>
      </div>
    </div>
  );
}
```

### 3. Sistema de Feedback Visual

```typescript
// components/Stats.tsx
export function Stats({ results }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8 p-6 bg-white rounded-lg shadow-lg"
    >
      <h3 className="text-2xl font-bold text-center mb-4">
        Resultado: {results.correct}/{results.total}
      </h3>
      
      <div className="flex justify-center space-x-4 text-4xl">
        {results.questions.map((q, i) => (
          <motion.span
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.2 }}
          >
            {q.isCorrect ? '✅' : '❌'}
          </motion.span>
        ))}
      </div>
      
      <div className="mt-4 text-center">
        <p className="text-gray-600">
          {results.correct === 3 && '🎉 Perfeito! Você acertou todas!'}
          {results.correct === 2 && '👏 Muito bem! Quase lá!'}
          {results.correct === 1 && '💪 Continue estudando!'}
          {results.correct === 0 && '📚 Hora de revisar o conteúdo!'}
        </p>
      </div>
    </motion.div>
  );
}
```

### 4. Card de Compartilhamento

```typescript
// components/ShareCard.tsx
import { useState } from 'react';
import toast from 'react-hot-toast';

export function ShareCard({ results, streak }) {
  const [copied, setCopied] = useState(false);
  
  const generateShareText = () => {
    const date = new Date().toLocaleDateString('pt-BR');
    const emojis = results.questions.map(q => q.isCorrect ? '✅' : '❌').join(' ');
    
    return `🏥 ENARE Daily ${date}
    
Acertei ${results.correct}/3 questões!
${emojis}

${streak > 0 ? `Streak: 🔥 ${streak} dias\n` : ''}
Jogue também: ${process.env.NEXT_PUBLIC_SITE_URL}`;
  };
  
  const handleShare = async () => {
    const text = generateShareText();
    
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copiado para a área de transferência!');
      setTimeout(() => setCopied(false), 3000);
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mt-6"
    >
      <button
        onClick={handleShare}
        className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold
                 hover:bg-green-700 transition-colors flex items-center justify-center"
      >
        {copied ? '✅ Copiado!' : '📤 Compartilhar Resultado'}
      </button>
    </motion.div>
  );
}
```

### 5. Página de Dias Anteriores

```typescript
// app/archive/page.tsx
import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import { supabase } from '@/lib/supabase';

export default function Archive() {
  const [answeredDates, setAnsweredDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  
  const tileClassName = ({ date }) => {
    const dateStr = date.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    
    if (dateStr > today) return 'future-date';
    if (answeredDates.includes(dateStr)) return 'answered-date';
    if (dateStr < '2024-01-01') return 'unavailable-date'; // Data de início do jogo
    return 'available-date';
  };
  
  const handleDateClick = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    
    if (dateStr <= today && !answeredDates.includes(dateStr)) {
      // Redirecionar para responder questões desse dia
      window.location.href = `/?date=${dateStr}`;
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          📅 Dias Anteriores
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <Calendar
            onChange={handleDateClick}
            tileClassName={tileClassName}
            locale="pt-BR"
          />
          
          <div className="mt-6 flex justify-around text-sm">
            <div className="flex items-center">
              <span className="w-4 h-4 bg-green-500 rounded mr-2"></span>
              Respondido
            </div>
            <div className="flex items-center">
              <span className="w-4 h-4 bg-blue-500 rounded mr-2"></span>
              Disponível
            </div>
            <div className="flex items-center">
              <span className="w-4 h-4 bg-gray-300 rounded mr-2"></span>
              Futuro
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 6. Sistema de Nome de Usuário

```typescript
// components/UsernameModal.tsx
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export function UsernameModal({ onComplete }) {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Verificar disponibilidade
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('nickname', nickname)
        .single();
        
      if (existing) {
        setError('Este nome já está em uso!');
        setLoading(false);
        return;
      }
      
      // Criar usuário
      const { data, error } = await supabase
        .from('users')
        .insert({ nickname })
        .select()
        .single();
        
      if (error) throw error;
      
      // Salvar em localStorage e cookie
      localStorage.setItem('enare_user_id', data.id);
      localStorage.setItem('enare_nickname', nickname);
      document.cookie = `enare_user=${data.id}; max-age=31536000; path=/`;
      
      onComplete(data);
    } catch (err) {
      setError('Erro ao criar usuário. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Bem-vindo ao ENARE Daily!</h2>
        <p className="text-gray-600 mb-6">
          Escolha um nome para aparecer no ranking:
        </p>
        
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Seu nome"
            maxLength={50}
            required
            className="w-full p-3 border rounded-lg mb-4"
          />
          
          {error && (
            <p className="text-red-500 text-sm mb-4">{error}</p>
          )}
          
          <button
            type="submit"
            disabled={loading || nickname.length < 2}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold
                     disabled:bg-gray-400 hover:bg-blue-700 transition-colors"
          >
            {loading ? 'Criando...' : 'Começar'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

## Features de Gamificação

### Badges/Conquistas
```typescript
const achievements = {
  firstWeek: {
    id: 'first_week',
    name: 'Primeira Semana',
    description: '7 dias consecutivos',
    icon: '🔥',
    condition: (stats) => stats.currentStreak >= 7
  },
  perfect: {
    id: 'perfect',
    name: 'Perfeição',
    description: 'Acertou 3/3 em um dia',
    icon: '💯',
    condition: (stats) => stats.perfectDays > 0
  },
  scholar: {
    id: 'scholar',
    name: 'Estudioso',
    description: '30 questões respondidas',
    icon: '📚',
    condition: (stats) => stats.totalAnswered >= 30
  },
  master: {
    id: 'master',
    name: 'Mestre',
    description: '50% das questões disponíveis',
    icon: '🏆',
    condition: (stats) => stats.completionRate >= 50
  }
};
```

## Configurações do Projeto

### package.json
```json
{
  "name": "enare-daily",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "process-questions": "ts-node scripts/processQuestions.ts",
    "upload-images": "ts-node scripts/uploadImages.ts"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "seedrandom": "^3.0.5",
    "framer-motion": "^10.16.0",
    "react-hot-toast": "^2.4.0",
    "date-fns": "^2.30.0",
    "react-calendar": "^4.7.0",
    "cloudinary": "^1.41.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/react": "^18.2.0",
    "@types/seedrandom": "^3.0.8",
    "typescript": "^5.3.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

### Variáveis de Ambiente (.env.local)
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Site
NEXT_PUBLIC_SITE_URL=https://enare-daily.vercel.app
```

## Deploy e Configuração

### 1. Preparação dos Dados
```bash
# Processar questões e fazer upload das imagens
npm run process-questions
npm run upload-images
```

### 2. Configurar Supabase
1. Criar projeto gratuito em supabase.com
2. Executar os SQLs de criação das tabelas
3. Configurar RLS (Row Level Security):
```sql
-- Permitir leitura pública das questões
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Questions are viewable by everyone" 
ON questions FOR SELECT 
USING (true);

-- Permitir inserção de respostas para usuários autenticados
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert their own answers" 
ON answers FOR INSERT 
WITH CHECK (auth.uid() = user_id);
```

### 3. Deploy na Vercel
```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel

# Configurar variáveis de ambiente no dashboard da Vercel
```

## Responsividade e PWA

### Manifest.json
```json
{
  "name": "ENARE Daily",
  "short_name": "ENARE Daily",
  "description": "Questões diárias do ENARE",
  "theme_color": "#2563eb",
  "background_color": "#f0f9ff",
  "display": "standalone",
  "scope": "/",
  "start_url": "/",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Service Worker (public/sw.js)
```javascript
const CACHE_NAME = 'enare-daily-v1';
const urlsToCache = [
  '/',
  '/offline.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
      .catch(() => caches.match('/offline.html'))
  );
});
```

## Resultado Esperado

Uma aplicação web moderna e gamificada que:

1. ✅ Serve 3 questões diárias do ENARE (uma de cada ano)
2. ✅ Exibe imagens médicas quando presentes nas questões
3. ✅ Oferece descrição alternativa das imagens para acessibilidade
4. ✅ Mantém ranking entre os 3 amigos
5. ✅ Tracking de progresso e streak
6. ✅ Permite recuperar dias perdidos via calendário
7. ✅ Gera cards de compartilhamento estilo Wordle
8. ✅ Funciona como PWA instalável no celular
9. ✅ Responsivo para mobile, tablet e desktop
10. ✅ Dados persistentes via Supabase (não localStorage)

## Observações Importantes

- **Imagens**: Todas as imagens são preservadas e hospedadas no Cloudinary com fallback para descrição textual
- **Performance**: Lazy loading de imagens e otimização automática via Cloudinary
- **Acessibilidade**: Descrições alternativas para todas as imagens médicas
- **Escalabilidade**: Estrutura preparada para adicionar mais anos de provas futuramente
- **Segurança**: RLS configurado no Supabase para proteger dados