import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function updateImageUrls() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not found');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Read the image metadata file
  const imageMetadata = JSON.parse(fs.readFileSync('metadados_imagens_enare.json', 'utf-8'));

  console.log('🖼️ Updating image URLs in database...');

  let updatedCount = 0;
  let errorCount = 0;

  // Create a mapping from question files to Cloudinary URLs
  const urlMapping: { [key: string]: string } = {};

  for (const [filePath, cloudinaryUrl] of Object.entries(imageMetadata)) {
    // Extract question info from file path
    // Example: "imagens_enare_2021-2022\\questao_01_figura_1.png"
    const match = filePath.match(/imagens_enare_([\d-]+)\\questao_(\d+)_figura_\d+\.(png|jpg)/);

    if (match) {
      const year = match[1];
      const questionNumber = parseInt(match[2]);
      const questionId = `${year}-${String(questionNumber).padStart(3, '0')}`;

      urlMapping[questionId] = cloudinaryUrl as string;
    }
  }

  console.log(`Found ${Object.keys(urlMapping).length} image URLs to update`);

  // Update each question in the database
  for (const [questionId, imageUrl] of Object.entries(urlMapping)) {
    try {
      const { error } = await supabase
        .from('questions')
        .update({ image_url: imageUrl })
        .eq('id', questionId);

      if (error) {
        console.error(`❌ Error updating ${questionId}:`, error);
        errorCount++;
      } else {
        console.log(`✅ Updated ${questionId}`);
        updatedCount++;
      }
    } catch (err) {
      console.error(`❌ Exception updating ${questionId}:`, err);
      errorCount++;
    }
  }

  console.log(`\n📊 Update Summary:`);
  console.log(`✅ Successfully updated: ${updatedCount} questions`);
  console.log(`❌ Errors: ${errorCount} questions`);

  // Verify updates
  console.log('\n🔍 Verifying updates...');
  const { data: questionsWithImages } = await supabase
    .from('questions')
    .select('id, image_url')
    .eq('has_image', true);

  if (questionsWithImages) {
    const cloudinaryCount = questionsWithImages.filter(q =>
      q.image_url && q.image_url.includes('cloudinary.com')
    ).length;

    console.log(`📈 Questions with Cloudinary URLs: ${cloudinaryCount}/${questionsWithImages.length}`);
  }
}

updateImageUrls().catch(console.error);