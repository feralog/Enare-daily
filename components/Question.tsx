import Image from 'next/image';
import { useState } from 'react';
import { motion } from 'framer-motion';

interface QuestionProps {
  question: {
    id: string;
    year?: string;
    content: string;
    alternatives: Record<string, string>;
    hasImage: boolean;
    imageUrl?: string;
    imageDescription?: string | null;
  };
  selectedAnswer: string | null;
  onSelectAnswer: (answer: string) => void;
  showResult: boolean;
  correctAnswer?: string;
}

/**
 * Componente de exibição de uma questão. Renderiza o enunciado,
 * a imagem (quando presente) e as alternativas. Suporta feedback
 * visual ao selecionar respostas e ao exibir o resultado.
 */
export function Question({ question, selectedAnswer, onSelectAnswer, showResult, correctAnswer }: QuestionProps) {
  const [imageError, setImageError] = useState(false);
  const [showDescription, setShowDescription] = useState(false);

  return (
    <motion.div className="bg-white rounded-lg shadow-md p-6 mb-4">
      <div className="mb-4">
        <p className="text-gray-800 leading-relaxed whitespace-pre-line">
          {question.content}
        </p>
        {question.hasImage && question.imageUrl && (
          <div className="my-4">
            {!imageError ? (
              <div className="relative">
                <Image
                  src={question.imageUrl}
                  alt="Imagem da questão"
                  width={600}
                  height={400}
                  className="w-full h-auto rounded-lg"
                  onError={() => setImageError(true)}
                  priority
                />
                {question.imageDescription && (
                  <button
                    onClick={() => setShowDescription(!showDescription)}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    {showDescription ? '📖 Ocultar' : '📖 Ver'} descrição da imagem
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-sm text-gray-600">⚠️ Erro ao carregar imagem</p>
              </div>
            )}
            {showDescription && question.imageDescription && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-2 p-3 bg-blue-50 rounded-lg"
              >
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {question.imageDescription}
                </p>
              </motion.div>
            )}
          </div>
        )}
      </div>
      <div className="space-y-2">
        {question.alternatives && Object.entries(question.alternatives).map(([letter, text]) => {
          // Determinar estilos com base no estado
          let classes = 'w-full text-left p-3 rounded-lg transition-all';
          if (!showResult && selectedAnswer === letter) {
            classes += ' bg-blue-100 border-2 border-blue-400';
          } else if (!showResult) {
            classes += ' bg-gray-50 hover:bg-gray-100 border-2 border-transparent';
          }
          if (showResult && correctAnswer) {
            if (letter === correctAnswer) {
              classes += ' bg-green-100 border-2 border-green-500';
            } else if (letter === selectedAnswer && letter !== correctAnswer) {
              classes += ' bg-red-100 border-2 border-red-500';
            } else {
              classes += ' bg-gray-50 opacity-50';
            }
          }
          return (
            <button
              key={letter}
              onClick={() => !showResult && onSelectAnswer(letter)}
              disabled={showResult}
              className={classes}
            >
              <span className="font-semibold">{letter})</span> {text}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}