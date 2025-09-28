# Learningly AI

Document‑driven learning with Next.js + Supabase. Upload materials, chat with context, and generate online exams.

## Run locally
```bash
npm install
npm run dev
```
App: http://localhost:3000

## Minimal env (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# Optional
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_OPENAI_API_KEY=...  # or NEXT_PUBLIC_GOOGLE_API_KEY=...
```

## Structure
- app/ – pages & API (reading, exam‑prep, auth, search, quiz)
- components/ – UI and feature components
- hooks/ – auth, subscription, document context
- lib/ – supabase, stripe, openai, services
- public/ – static assets
- docs/ – guides & SQL (keeps root tidy)

## Scripts
```bash
npm run build
npm start
npm run type-check
npm run lint
```

Notes: Stripe is optional. Setup/how‑to files live in docs/.
