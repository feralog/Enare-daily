'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface RankingRow {
  nickname: string;
  correct_answers: number;
  total_answers: number;
  accuracy: number;
  current_streak: number;
  max_streak: number;
}

/**
 * Página de ranking que lista os usuários ordenados pelo número de
 * acertos. Permite visualizar a precisão e streaks de cada jogador.
 */
export default function Ranking() {
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRanking();
  }, []);

  async function fetchRanking() {
    setLoading(true);
    const { data, error } = await supabase.from('ranking').select('*');
    if (error) {
      console.error('Erro ao buscar ranking', error);
    }
    if (data) {
      setRanking(data as RankingRow[]);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">📊 Ranking</h1>
        {loading ? (
          <p className="text-center text-gray-600">Carregando...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-lg shadow-md overflow-hidden">
              <thead className="bg-blue-600 text-white">
                <tr>
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Jogador</th>
                  <th className="px-4 py-2 text-left">Acertos</th>
                  <th className="px-4 py-2 text-left">Total</th>
                  <th className="px-4 py-2 text-left">Acurácia (%)</th>
                  <th className="px-4 py-2 text-left">Streak Atual</th>
                  <th className="px-4 py-2 text-left">Streak Máx</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((row, idx) => (
                  <tr
                    key={idx}
                    className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                  >
                    <td className="px-4 py-2 font-medium">{idx + 1}</td>
                    <td className="px-4 py-2">{row.nickname}</td>
                    <td className="px-4 py-2">{row.correct_answers}</td>
                    <td className="px-4 py-2">{row.total_answers}</td>
                    <td className="px-4 py-2">{row.accuracy}%</td>
                    <td className="px-4 py-2">{row.current_streak}</td>
                    <td className="px-4 py-2">{row.max_streak}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-6 text-center">
          <a href="/" className="text-blue-600 hover:underline">
            ← Voltar
          </a>
        </div>
      </div>
    </div>
  );
}