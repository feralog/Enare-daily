# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ENARE Daily is a gamified web application that serves 3 daily medical exam questions (ENARE) from different years (2021-2022, 2022-2023, 2023-2024). Built as a Wordle-style daily challenge for medical students with ranking, streaks, and sharing features.

## Tech Stack

- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Animation**: Framer Motion
- **UI Components**: React Hot Toast for notifications, React Calendar
- **Backend**: Supabase (PostgreSQL) for database and user management
- **Images**: Cloudinary for image hosting and optimization
- **Deployment**: Designed for Vercel

## Commands

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
```

### Data Processing Scripts
```bash
npm run process-questions  # Process markdown question files and upload to Supabase
npm run upload-images     # Upload images to Cloudinary (part of processing)
```

## Architecture

### Core System Flow
1. **Question Selection**: Deterministic daily question selection using `seedrandom` with date as seed
2. **Caching**: Daily questions cached in `daily_questions` table to ensure consistency
3. **User Management**: Simple nickname-based authentication stored in localStorage + Supabase
4. **Image Handling**: Cloudinary integration with custom Next.js image loader for optimization

### Key Components

#### Question Display (`components/Question.tsx`)
- Renders question content, images, and multiple-choice alternatives
- Handles image loading errors and provides accessibility descriptions
- Visual feedback for selected answers and results

#### Daily Question Selector (`utils/questionSelector.ts`)
- Uses seedrandom for deterministic question selection by date
- Implements caching system via Supabase
- Ensures one question per year (2021-2022, 2022-2023, 2023-2024) per day

#### Image Optimization (`utils/imageOptimization.ts`)
- Custom Cloudinary loader for Next.js Image component
- Automatic format and quality optimization
- Fallback handling for image errors

### Database Schema (Supabase)

Key tables:
- `users`: Simple nickname-based user records
- `questions`: Question content, alternatives, answers, and image metadata
- `answers`: User responses with correctness tracking
- `streaks`: User streak tracking (current and max)
- `daily_questions`: Cache for daily question selections

### Data Processing

The application includes scripts to process markdown question files:
- Extract question content, alternatives, and correct answers
- Upload images to Cloudinary
- Populate Supabase database
- Handle image descriptions for accessibility

## File Structure

```
app/
├── page.tsx           # Main daily challenge page
├── ranking/page.tsx   # User ranking page
└── archive/page.tsx   # Calendar view for past days

components/
├── Question.tsx       # Question display component
├── ShareCard.tsx      # Results sharing component
├── Stats.tsx          # Results statistics
└── UsernameModal.tsx  # Initial user setup

lib/
└── supabase.ts        # Supabase client configuration

utils/
├── questionSelector.ts    # Daily question selection logic
└── imageOptimization.ts   # Cloudinary image handling

data/
├── questoes_enare_*.md   # Question source files
├── gabarito_enare_*.md   # Answer key files
└── images/               # Local image files for processing

scripts/
└── processQuestions.ts   # Data processing script
```

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
NEXT_PUBLIC_SITE_URL=
```

## Development Notes

- Questions are deterministically selected by date to ensure all users see the same questions
- Image handling includes fallback mechanisms and accessibility descriptions
- User authentication is simplified (nickname only) for ease of use among friend groups
- The system supports viewing and answering questions from previous dates via archive page
- Results can be shared in a Wordle-style format with emoji indicators