-- Fix RLS policies to allow question insertion
-- Run this in Supabase SQL Editor

-- Drop existing question policies
DROP POLICY IF EXISTS "Questions are viewable by everyone" ON questions;

-- Create new policies that allow both SELECT and INSERT
CREATE POLICY "Questions are publicly accessible"
ON questions FOR ALL
USING (true)
WITH CHECK (true);

-- Also ensure INSERT is allowed for daily_questions
DROP POLICY IF EXISTS "Daily questions are viewable by everyone" ON daily_questions;
DROP POLICY IF EXISTS "Daily questions can be inserted" ON daily_questions;

CREATE POLICY "Daily questions are publicly accessible"
ON daily_questions FOR ALL
USING (true)
WITH CHECK (true);