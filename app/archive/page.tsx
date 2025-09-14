'use client';

import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import { supabase } from '@/lib/supabase';

/**
 * Página de dias anteriores. Mostra um calendário permitindo ao
 * usuário acessar desafios passados ou ver quais dias já foram
 * respondidos. Datas futuras ficam desabilitadas.
 */
export default function Archive() {
  const [answeredDates, setAnsweredDates] = useState<string[]>([]);

  useEffect(() => {
    fetchAnsweredDates();
  }, []);

  async function fetchAnsweredDates() {
    // Busca do Supabase todos os registros de respostas do usuário
    const userId = localStorage.getItem('enare_user_id');
    if (!userId) return;
    const { data } = await supabase
      .from('answers')
      .select('date')
      .eq('user_id', userId);
    if (data) {
      const unique = Array.from(new Set(data.map((a: any) => a.date)));
      setAnsweredDates(unique);
    }
  }

  // Define estilos de cada dia no calendário
  const tileClassName = ({ date }: { date: Date }) => {
    const dateStr = date.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    if (dateStr > today) return 'future-date';
    if (answeredDates.includes(dateStr)) return 'answered-date';
    if (dateStr < '2024-01-01') return 'unavailable-date';
    return 'available-date';
  };

  const handleDateClick = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    if (dateStr <= today && !answeredDates.includes(dateStr)) {
      window.location.href = `/?date=${dateStr}`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">📅 Dias Anteriores</h1>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <Calendar onClickDay={handleDateClick} tileClassName={tileClassName} locale="pt-BR" />
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