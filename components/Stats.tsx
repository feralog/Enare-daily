import { motion } from 'framer-motion';

interface QuestionResult {
  isCorrect: boolean;
}

interface Results {
  correct: number;
  total: number;
  questions: QuestionResult[];
}

/**
 * Componente que exibe um resumo de desempenho do usuário após
 * concluir o desafio diário. Exibe o número de acertos e um
 * feedback textual dinâmico, além de emojis para cada questão.
 */
export function Stats({ results }: { results: Results }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8 p-6 bg-white rounded-lg shadow-lg"
    >
      <h3 className="text-2xl font-bold text-center mb-4">
        Resultado: {results.correct}/{results.total}
      </h3>
      <div className="flex justify-center space-x-4 text-4xl">
        {results.questions.map((q, i) => (
          <motion.span
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.2 }}
          >
            {q.isCorrect ? '✅' : '❌'}
          </motion.span>
        ))}
      </div>
      <div className="mt-4 text-center">
        <p className="text-gray-600">
          {results.correct === 3 && '🎉 Perfeito! Você acertou todas!'}
          {results.correct === 2 && '👏 Muito bem! Quase lá!'}
          {results.correct === 1 && '💪 Continue estudando!'}
          {results.correct === 0 && '📚 Hora de revisar o conteúdo!'}
        </p>
      </div>
    </motion.div>
  );
}