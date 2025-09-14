import seedrandom from 'seedrandom';
import { supabase } from '@/lib/supabase';

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
    return questions.map((q) => q.data);
  }

  // Gerar novas questões
  const rng = seedrandom(dateString);
  const years = ['2021-2022', '2022-2023', '2023-2024'];
  const selectedQuestions: any[] = [];

  for (const year of years) {
    const { count } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('year', year);
    const randomIndex = Math.floor((rng() as number) * (count ?? 0)) + 1;
    const { data: question } = await supabase
      .from('questions')
      .select('*')
      .eq('year', year)
      .eq('number', randomIndex)
      .single();
    if (question) {
      selectedQuestions.push(question);
    }
  }

  // Salvar no cache
  if (selectedQuestions.length === 3) {
    await supabase.from('daily_questions').insert({
      date: dateString,
      question_2021_2022: selectedQuestions[0].id,
      question_2022_2023: selectedQuestions[1].id,
      question_2023_2024: selectedQuestions[2].id,
    });
  }
  return selectedQuestions;
}