import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface QuestionResult {
  isCorrect: boolean;
}

interface Results {
  correct: number;
  questions: QuestionResult[];
}

/**
 * Permite que o usuário compartilhe seus resultados do dia nas redes.
 * Utiliza a API de compartilhamento nativa quando disponível e
 * oferece fallback para copiar o texto para a área de transferência.
 */
export function ShareCard({ results, streak }: { results: Results; streak: number }) {
  const [copied, setCopied] = useState(false);

  const generateShareText = () => {
    const date = new Date().toLocaleDateString('pt-BR');
    const emojis = results.questions.map((q) => (q.isCorrect ? '✅' : '❌')).join(' ');
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
    return `🏥 ENARE Daily ${date}\n\nAcertei ${results.correct}/3 questões!\n${emojis}\n\n${streak > 0 ? `Streak: 🔥 ${streak} dias\n` : ''}Jogue também: ${siteUrl}`;
  };

  const handleShare = async () => {
    const text = generateShareText();
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch (err) {
        console.log('Share cancelled', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success('Copiado para a área de transferência!');
        setTimeout(() => setCopied(false), 3000);
      } catch (err) {
        toast.error('Não foi possível copiar o texto.');
      }
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
      <button
        onClick={handleShare}
        className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center"
      >
        {copied ? '✅ Copiado!' : '📤 Compartilhar Resultado'}
      </button>
    </motion.div>
  );
}