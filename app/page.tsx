/*
 * Página principal do ENARE Daily. Apresenta três questões diárias,
 * gerencia seleção de respostas, confirma resultados e exibe
 * estatísticas e opções de compartilhamento. Também lida com
 * autenticação simples via nickname.
 */
'use client';

import { useState, useEffect } from 'react';
import { Question } from '@/components/Question';
import { ShareCard } from '@/components/ShareCard';
import { Stats } from '@/components/Stats';
import { UsernameModal } from '@/components/UsernameModal';
import { supabase } from '@/lib/supabase';
import { getDailyQuestions } from '@/utils/questionSelector';

interface QuestionType {
  id: string;
  year: string;
  content: string;
  alternatives: Record<string, string>;
  correct_answer: string;
  hasImage: boolean;
  imageUrl?: string;
  imageDescription?: string | null;
}

interface AnswerState {
  [questionId: string]: string;
}

export default function Home() {
  const [user, setUser] = useState<{ id: string; nickname: string } | null>(null);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [questions, setQuestions] = useState<QuestionType[]>([]);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    // Carregar desafio diário e usuário ao montar
    loadDailyChallenge();
    checkUser();
  }, []);

  /**
   * Calcula o número do dia a partir de uma data base (2024-01-01).
   * Útil para exibir quantos desafios já ocorreram.
   */
  function getDayNumber() {
    const startDate = new Date('2024-01-01');
    const today = new Date();
    const diff = today.getTime() - startDate.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  }

  /**
   * Carrega as questões para a data atual ou para uma data específica
   * passada via query string (?date=YYYY-MM-DD).
   */
  async function loadDailyChallenge() {
    setLoading(true);
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const dateParam = searchParams.get('date');
      const date = dateParam ? new Date(dateParam) : new Date();
      const qs = await getDailyQuestions(date);
      setQuestions(qs as unknown as QuestionType[]);
    } catch (err) {
      console.error('Erro ao carregar questões:', err);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Verifica se já existe um usuário salvo no localStorage. Caso contrário,
   * exibe o modal para criação de nickname.
   */
  function checkUser() {
    const id = localStorage.getItem('enare_user_id');
    const nickname = localStorage.getItem('enare_nickname');
    if (id && nickname) {
      setUser({ id, nickname });
      fetchStreak(id);
    } else {
      setShowUsernameModal(true);
    }
  }

  /**
   * Busca o streak atual do usuário no Supabase e atualiza o estado.
   */
  async function fetchStreak(userId: string) {
    const { data } = await supabase
      .from('streaks')
      .select('current_streak')
      .eq('user_id', userId)
      .single();
    if (data) {
      setStreak(data.current_streak);
    }
  }

  /**
   * Lida com a seleção de uma alternativa para uma questão específica.
   */
  function handleAnswer(questionId: string, answer: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  }

  /**
   * Submete as respostas do usuário ao Supabase e exibe o resultado.
   */
  async function submitAnswers() {
    if (!user) return;
    try {
      // Inserir respostas individualmente
      const todayStr = new Date().toISOString().split('T')[0];
      for (const q of questions) {
        const selectedAnswer = answers[q.id];
        const isCorrect = selectedAnswer === q.correct_answer;
        await supabase.from('answers').insert({
          user_id: user.id,
          date: todayStr,
          question_id: q.id,
          selected_answer: selectedAnswer,
          is_correct: isCorrect,
          time_spent_seconds: null,
        });
      }
      // Atualizar streak localmente (fetch após inserção)
      fetchStreak(user.id);
    } catch (err) {
      console.error('Erro ao salvar respostas:', err);
    }
    setShowResults(true);
  }

  /**
   * Calcula estatísticas de resultados: número de acertos e
   * lista de objetos indicando se cada questão foi respondida corretamente.
   */
  function calculateResults() {
    const results = questions.map((q) => {
      const selected = answers[q.id];
      return {
        isCorrect: selected === q.correct_answer,
      };
    });
    const correct = results.filter((r) => r.isCorrect).length;
    return {
      correct,
      total: results.length,
      questions: results,
    };
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
        <p className="text-gray-600">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {showUsernameModal && !user && (
        <UsernameModal
          onComplete={(newUser) => {
            setUser(newUser);
            setShowUsernameModal(false);
            fetchStreak(newUser.id);
          }}
        />
      )}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🏥 ENARE DAILY 🏥</h1>
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
          {questions.map((question) => (
            <div key={question.id}>
              <h2 className="text-xl font-semibold mb-3 text-gray-700">
                Questão ENARE {question.year}
              </h2>
              <Question
                question={question}
                selectedAnswer={answers[question.id] || null}
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
            disabled={Object.keys(answers).length !== 3 || !user}
            className="w-full mt-8 py-4 bg-blue-600 text-white rounded-lg font-semibold disabled:bg-gray-400 hover:bg-blue-700 transition-colors"
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
        {/* Footer */}
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