import { createClient } from '@supabase/supabase-js';

/**
 * Instância compartilhada do Supabase para toda a aplicação.
 *
 * Utiliza as variáveis de ambiente definidas em `.env.local` ou
 * `.env.example`. Caso as variáveis não estejam definidas, lança
 * um erro informando o desenvolvedor.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'As variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY precisam estar definidas.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);