# Learningly AI

A Next.js 15 (App Router) application for document‑driven learning: upload materials, generate summaries and quizzes, chat with context, and run online/exam‑prep workflows with Stripe subscriptions and Supabase auth/storage.

## Quick start

1) Prerequisites
- Node.js ≥ 18.17
- Supabase project (URL + anon key; service key for admin scripts)
- Optional: Stripe test keys, OpenAI key, Google Generative AI key

2) Install and run
```bash
npm install
npm run dev
```
Open http://localhost:3000

3) Minimal environment (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# LLMs (at least one)
NEXT_PUBLIC_OPENAI_API_KEY=...
# or
NEXT_PUBLIC_GOOGLE_API_KEY=...

# Stripe (optional)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_FREEMIUM_PRICE_ID=...
STRIPE_PREMIUM_PRICE_ID=...
```

## Structure (high level)
- `app/` – pages and API routes
  - `(app)/exam-prep` – full-length exam prep + online exam session
  - `(app)/reading` – upload/parse, document chat and context
  - `api/` – server routes (auth, reading, search, exam‑prep, quiz, usage, webhooks)
- `components/` – UI and feature components (reading, writing, subscription, etc.)
- `hooks/` – React hooks (auth, subscription, document context, usage limits)
- `lib/` – clients/services (supabase, stripe, openai, token manager, etc.)
- `middleware.ts` – auth/session middleware
- `public/` – static assets
- Root SQL/setup docs – references and one‑off helpers

## Common scripts
```bash
npm run dev          # start dev server
npm run build        # build
npm start            # start prod build
npm run type-check   # ts checks
npm run lint         # eslint
```

## Feature highlights
- Upload and parse PDFs/TXT/DOCX to Supabase Storage
- Reading workspace with contextual chat
- Online exam prep: LLM‑based questions generated from uploaded documents
- Writing assistant (paraphrase, grammar, length)
- Subscriptions & usage limits with Stripe + Supabase

## Notes
- Keep runtime directories (`app/`, `components/`, `hooks/`, `lib/`) where they are to avoid breaking imports.
- Admin/setup SQL and scripts remain at repo root for convenience; see file names for purpose.

MIT License