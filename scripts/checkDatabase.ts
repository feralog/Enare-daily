import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkDatabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not found');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Count questions by year
  console.log('📊 Questions by year:');
  for (const year of ['2021-2022', '2022-2023', '2023-2024']) {
    const { count } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('year', year);

    console.log(`  ${year}: ${count} questions`);
  }

  // Total count
  const { count: total } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📈 Total questions: ${total}`);

  // Test question selection (like the app does)
  console.log('\n🎯 Testing daily question selection...');
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log(`Date: ${today}`);

    const years = ['2021-2022', '2022-2023', '2023-2024'];
    for (const year of years) {
      const { data, error } = await supabase
        .from('questions')
        .select('id, content')
        .eq('year', year)
        .limit(1);

      if (error) {
        console.error(`❌ Error fetching ${year}:`, error);
      } else if (data && data.length > 0) {
        console.log(`✅ ${year}: Found question ${data[0].id}`);
      } else {
        console.log(`❌ ${year}: No questions found`);
      }
    }
  } catch (err) {
    console.error('Error testing question selection:', err);
  }
}

checkDatabase().catch(console.error);