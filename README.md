# 🏥 ENARE Daily

Uma aplicação web gamificada que serve 3 questões diárias do ENARE (Exame Nacional de Residência) para estudantes de medicina, com sistema de ranking, streaks e compartilhamento estilo Wordle.

## 🚀 Funcionalidades

- **Questões Diárias**: 3 questões por dia (uma de cada ano: 2021-2022, 2022-2023, 2023-2024)
- **Sistema de Gamificação**: Rankings, streaks e estatísticas
- **Compartilhamento**: Cards de resultado estilo Wordle
- **Calendário**: Acesso a questões de dias anteriores
- **Imagens Médicas**: Suporte completo com descrições para acessibilidade
- **PWA**: Instalável no celular como aplicativo

## 🛠️ Tecnologias

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Imagens**: Cloudinary
- **Animações**: Framer Motion
- **Deploy**: Vercel

## 📋 Configuração

### 1. Clone o repositório

```bash
git clone https://github.com/feralog/Enare-daily.git
cd Enare-daily
npm install
```

### 2. Configure as variáveis de ambiente

Copie `.env.example` para `.env.local` e configure:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Configure o banco de dados

Execute o SQL em `scripts/setupDatabase.sql` no seu painel do Supabase.

### 4. Processe as questões

```bash
npm run process-questions
```

### 5. Execute localmente

```bash
npm run dev
```

## 🚀 Deploy

### Vercel

1. Conecte seu repositório GitHub ao Vercel
2. Configure as variáveis de ambiente
3. Deploy automático!

## 📁 Estrutura do Projeto

```
├── app/                    # Páginas Next.js
├── components/             # Componentes React
├── data/                   # Dados das questões (markdown)
├── lib/                    # Configurações (Supabase)
├── utils/                  # Utilitários
├── scripts/                # Scripts de processamento
└── public/                 # Arquivos estáticos
```

## 🎯 Como Funciona

1. **Seleção Determinística**: Usa `seedrandom` para garantir que todos vejam as mesmas questões
2. **Cache Inteligente**: Questões diárias são cachadas no Supabase
3. **Autenticação Simples**: Apenas nickname, sem senhas
4. **Streaks Automáticos**: Calculados via triggers no banco de dados

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e pull requests.

## 📄 Licença

Este projeto é open source e está disponível sob a licença MIT.