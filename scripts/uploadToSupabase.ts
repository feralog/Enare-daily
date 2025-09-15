import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function uploadQuestionsToSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not found in environment variables');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Read processed questions
  const questionsData = JSON.parse(fs.readFileSync('processed_questions.json', 'utf-8'));
  console.log(`Found ${questionsData.length} questions to upload`);

  // Check current count
  const { count: currentCount } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true });

  console.log(`Current questions in database: ${currentCount ?? 0}`);

  if ((currentCount ?? 0) > 0) {
    console.log('Questions already exist in database. Upserting...');
  }

  let successCount = 0;
  let errorCount = 0;

  for (const q of questionsData) {
    try {
      const { error } = await supabase.from('questions').upsert({
        id: q.id,
        year: q.year,
        number: q.number,
        content: q.content,
        alternative_a: q.alternatives.A,
        alternative_b: q.alternatives.B,
        alternative_c: q.alternatives.C,
        alternative_d: q.alternatives.D,
        alternative_e: q.alternatives.E,
        correct_answer: q.correctAnswer,
        has_image: q.hasImage,
        image_url: q.imageUrl,
        image_description: q.imageDescription,
        tags: q.tags,
      });

      if (error) {
        console.error(`Error inserting question ${q.id}:`, error);
        errorCount++;
      } else {
        successCount++;
        if (successCount % 50 === 0) {
          console.log(`Uploaded ${successCount} questions...`);
        }
      }
    } catch (err) {
      console.error(`Exception inserting question ${q.id}:`, err);
      errorCount++;
    }
  }

  console.log(`\n✅ Upload complete!`);
  console.log(`✓ Success: ${successCount} questions`);
  console.log(`✗ Errors: ${errorCount} questions`);

  // Verify final count
  const { count: finalCount } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Total questions in database: ${finalCount}`);
}

uploadQuestionsToSupabase().catch((err) => {
  console.error('Upload failed:', err);
  process.exit(1);
});