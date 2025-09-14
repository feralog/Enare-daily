import { useState, FormEvent } from 'react';
import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  nickname: string;
}

interface UsernameModalProps {
  onComplete: (user: User) => void;
}

/**
 * Modal inicial para que o usuário escolha um nickname. Verifica
 * se o nome já está em uso e cria um novo registro no Supabase.
 */
export function UsernameModal({ onComplete }: UsernameModalProps) {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Verificar se já existe
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
      const { data, error: insertError } = await supabase
        .from('users')
        .insert({ nickname })
        .select()
        .single();
      if (insertError) {
        throw insertError;
      }
      // Persistir localmente
      if (data) {
        localStorage.setItem('enare_user_id', data.id);
        localStorage.setItem('enare_nickname', nickname);
        document.cookie = `enare_user=${data.id}; max-age=31536000; path=/`;
        onComplete(data as User);
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao criar usuário. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Bem-vindo ao ENARE Daily!</h2>
        <p className="text-gray-600 mb-6">Escolha um nome para aparecer no ranking:</p>
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
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <button
            type="submit"
            disabled={loading || nickname.length < 2}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold disabled:bg-gray-400 hover:bg-blue-700 transition-colors"
          >
            {loading ? 'Criando...' : 'Começar'}
          </button>
        </form>
      </div>
    </div>
  );
}