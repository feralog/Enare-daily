import seedrandom from 'seedrandom';
import { supabase } from '@/lib/supabase';

// Transform database question format to frontend format
function transformQuestion(dbQuestion: any) {
  if (!dbQuestion) return null;

  return {
    id: dbQuestion.id,
    year: dbQuestion.year,
    content: dbQuestion.content,
    alternatives: {
      A: dbQuestion.alternative_a,
      B: dbQuestion.alternative_b,
      C: dbQuestion.alternative_c,
      D: dbQuestion.alternative_d,
      E: dbQuestion.alternative_e,
    },
    correct_answer: dbQuestion.correct_answer,
    hasImage: dbQuestion.has_image,
    imageUrl: dbQuestion.image_url,
    imageDescription: dbQuestion.image_description,
  };
}

/**
 * Seleciona três questões diárias, uma de cada ano, de forma determinística
 * com base na data informada. Utiliza um algoritmo de seleção que
 * suporta cache via Supabase.
 *
 * @param date Data para a qual as questões devem ser selecionadas
 * @returns Lista de três questões completas
 */
export async function getDailyQuestions(date: Date) {
  const dateString = date.toISOString().split('T')[0];
  // Verificar cache
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
      supabase.from('questions').select('*').eq('id', cached.question_2023_2024).single(),
    ]);
    return questions.map((q) => transformQuestion(q.data)).filter(q => q !== null);
  }

  // Gerar novas questões
  const rng = seedrandom(dateString);
  const years = ['2021-2022', '2022-2023', '2023-2024'];
  const selectedQuestions: any[] = [];
  const selectedIds: string[] = [];

  for (const year of years) {
    // Get all questions for this year and pick one randomly
    const { data: allQuestions } = await supabase
      .from('questions')
      .select('*')
      .eq('year', year);

    if (allQuestions && allQuestions.length > 0) {
      const randomIndex = Math.floor((rng() as number) * allQuestions.length);
      const dbQuestion = allQuestions[randomIndex];
      const question = transformQuestion(dbQuestion);
      if (question && dbQuestion) {
        selectedQuestions.push(question);
        selectedIds.push(dbQuestion.id);
      }
    }
  }

  // Salvar no cache
  if (selectedQuestions.length === 3) {
    await supabase.from('daily_questions').insert({
      date: dateString,
      question_2021_2022: selectedIds[0],
      question_2022_2023: selectedIds[1],
      question_2023_2024: selectedIds[2],
    });
  }
  return selectedQuestions;
}