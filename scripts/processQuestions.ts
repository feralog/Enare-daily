import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import cloudinary from 'cloudinary';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

/*
 * Script para processar as questões do ENARE em formato Markdown.
 *
 * Este script percorre os arquivos de questões de cada ano, extrai
 * enunciados, alternativas, respostas corretas e informações de
 * imagem. As imagens são carregadas para o Cloudinary e um JSON
 * com todos os registros é salvo ou enviado para o Supabase.
 *
 * Para executar:
 *   npm run process-questions
 */

interface ProcessedQuestion {
  id: string;
  year: string;
  number: number;
  content: string;
  alternatives: {
    A: string;
    B: string;
    C: string;
    D: string;
    E: string;
  };
  correctAnswer: string;
  hasImage: boolean;
  imageUrl?: string | null;
  imageDescription?: string | null;
  tags: string[];
}

async function uploadImageToCloudinary(imagePath: string): Promise<string> {
  // Configurar Cloudinary
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    console.warn('Variáveis de ambiente do Cloudinary não definidas. Retornando caminho original.');
    return imagePath;
  }
  cloudinary.v2.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
  const result = await cloudinary.v2.uploader.upload(imagePath, {
    folder: 'enare-daily',
    resource_type: 'image',
    quality: 'auto:good',
    fetch_format: 'auto',
  });
  return result.secure_url;
}

function extractContent(questionContent: string): string {
  // Remove heading, image markdown, descriptions and alternatives
  return questionContent
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\*\*Descrição Técnica da Imagem:\*\*[\s\S]*?(?=(\*\*Alternativas|$))/g, '')
    .replace(/\*\*Alternativas:\*\*[\s\S]*?(?=(\*\*Tags|$))/g, '')
    .replace(/\*\*Tags:\*\*[\s\S]*?(?=(---|$))/g, '')
    .replace(/---\s*$/g, '')
    .trim();
}

function extractAlternatives(questionContent: string) {
  const altRegex = /\*\*Alternativas:\*\*[\s\S]*?- A\)\s*(.*?)(?=\n\n|- B\))/s;
  const bRegex = /- B\)\s*(.*?)(?=\n\n|- C\))/s;
  const cRegex = /- C\)\s*(.*?)(?=\n\n|- D\))/s;
  const dRegex = /- D\)\s*(.*?)(?=\n\n|- E\))/s;
  const eRegex = /- E\)\s*(.*?)(?=\n\n|\*\*Tags|$)/s;

  const aMatch = questionContent.match(altRegex);
  const bMatch = questionContent.match(bRegex);
  const cMatch = questionContent.match(cRegex);
  const dMatch = questionContent.match(dRegex);
  const eMatch = questionContent.match(eRegex);

  if (!aMatch || !bMatch || !cMatch || !dMatch || !eMatch) {
    console.log('Failed to extract alternatives from:', questionContent.substring(0, 500));
    throw new Error('Não foi possível extrair alternativas');
  }

  return {
    A: aMatch[1].trim(),
    B: bMatch[1].trim(),
    C: cMatch[1].trim(),
    D: dMatch[1].trim(),
    E: eMatch[1].trim(),
  };
}

function extractCorrectAnswer(gabarito: string, questionNumber: number): string | null {
  // Look for table format: | 1 | D | Sim - Outra |
  const regex = new RegExp(`\\|\\s*${questionNumber}\\s*\\|\\s*([A-EX]?)\\s*\\|`, 'i');
  const match = gabarito.match(regex);
  if (!match) throw new Error(`Resposta não encontrada para a questão ${questionNumber}`);
  const answer = match[1]?.toUpperCase().trim();
  // Return null for cancelled questions (marked with X or empty)
  return (!answer || answer === 'X') ? null : answer;
}

function extractTags(questionContent: string): string[] {
  const tagRegex = /\*\*Tags:\*\*\s*(.*?)(?=\n|$)/;
  const match = questionContent.match(tagRegex);
  if (!match || !match[1].trim()) return [];
  return match[1]
    .split(',')
    .map((t) => t.trim().replace('#', ''))
    .filter((t) => t.length > 0);
}

export async function processQuestions() {
  const years = ['2021-2022', '2022-2023', '2023-2024'];
  const allQuestions: ProcessedQuestion[] = [];
  for (const year of years) {
    const mdPath = path.join('data', `questoes_enare_${year}.md`);
    const gabPath = path.join('data', `gabarito_enare_${year}.md`);
    const mdContent = fs.readFileSync(mdPath, 'utf-8');
    const gabarito = fs.readFileSync(gabPath, 'utf-8');
    const questionRegex = /## Questão (\d+)([\s\S]*?)(?=## Questão|$)/g;
    let match;
    while ((match = questionRegex.exec(mdContent)) !== null) {
      const questionNumber = parseInt(match[1], 10);
      const questionContent = match[2];
      const imageMatch = questionContent.match(/!\[.*?\]\((.*?)\)/);
      let imageUrl: string | null = null;
      let hasImage = false;
      if (imageMatch) {
        hasImage = true;
        const localImagePath = path.join('data', imageMatch[1]);
        if (fs.existsSync(localImagePath)) {
          // eslint-disable-next-line no-await-in-loop
          imageUrl = await uploadImageToCloudinary(localImagePath);
        }
      }
      const imageDescRegex = /\*\*\[Descrição Técnica da Imagem\]:\*\*([\s\S]*?)(?=\*\*Alternativas|$)/;
      const imageDescMatch = questionContent.match(imageDescRegex);
      const imageDescription = imageDescMatch ? imageDescMatch[1].trim() : null;

      // Check if question was cancelled
      const correctAnswer = extractCorrectAnswer(gabarito, questionNumber);
      if (correctAnswer === null) {
        console.log(`Skipping cancelled question ${questionNumber} from ${year}`);
        continue;
      }

      allQuestions.push({
        id: `${year}-${String(questionNumber).padStart(3, '0')}`,
        year,
        number: questionNumber,
        content: extractContent(questionContent),
        alternatives: extractAlternatives(questionContent),
        correctAnswer,
        hasImage,
        imageUrl,
        imageDescription,
        tags: extractTags(questionContent),
      });
    }
  }
  // Salvar localmente como JSON para importação posterior
  fs.writeFileSync('processed_questions.json', JSON.stringify(allQuestions, null, 2));
  console.log(`Processadas ${allQuestions.length} questões.`);
  // Opcional: enviar ao Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    for (const q of allQuestions) {
      // eslint-disable-next-line no-await-in-loop
      await supabase.from('questions').upsert({
        id: q.id,
        year: q.year,
        number: q.number,
        content: q.content,
        alternative_a: q.alternatives.A,
        alternative_b: q.alternatives.B,
        alternative_c: q.alternatives.C,
        alternative_d: q.alternatives.D,
        alternative_e: q.alternatives.E,
        correct_answer: q.correctAnswer,
        has_image: q.hasImage,
        image_url: q.imageUrl,
        image_description: q.imageDescription,
        tags: q.tags,
      });
    }
    console.log('Questões inseridas no Supabase.');
  }
}

// Run the script if executed directly
processQuestions().catch((err) => {
  console.error(err);
  process.exit(1);
});