# Repasa

Your notes → an AI-generated quiz → you know what to review.

Final project for *Desarrollo de Software Web* (UPB 2026).

## Features

- **Landing** with SEO metadata, `robots.txt`, and `sitemap.xml`.
- **Login / Sign up** with field-level validation (Zod on client and server). Passwords are hashed with bcrypt, and sessions use a JWT in an `httpOnly` cookie.
- **Dashboard** showing quizzes taken, overall average, saved notes, score per topic, and the weakest topic with a "Repasar ahora" button.
- **Mis apuntes**: full CRUD with topic filter and search.
- **Crear apunte con IA**: enter a topic, optional focus, and level (básico, intermedio, avanzado). The AI writes a specialized study note (introduction, key concepts, explanation, examples, common mistakes, summary) that the user reviews and edits before saving. Non-study topics are rejected.
- **Generar quiz**: an open-weights model (`openai/gpt-oss-120b` via Vercel AI Gateway, falling back to `deepseek/deepseek-v4-flash`) writes 5/10/15 multiple-choice questions from a note, with three difficulty levels, structured JSON output, and note-length validation (200–8000 characters).
- **Subir archivo**: drag and drop a .pdf, .docx, .txt, or .md (up to 4 MB). Short documents load as-is; long ones are condensed by AI into a note that fits the limit.
- **Resolver quiz**: focus mode, one question at a time, points with streak bonus, confetti on correct answers, question navigator, timer, keyboard shortcuts (1-4 / A-D, arrows), and buttons to restart or finish early (unanswered questions count as wrong).
- **Resultados**: 3D trophy (gold, silver, bronze by score), animated score, points, best streak, confetti at 70% or more, and each mistake with the correct answer. **Quiz de refuerzo con IA** generates a new quiz (5 or 10 questions) that tests the missed concepts from new angles. You can also repeat only the missed questions or the whole quiz shuffled.
- **Design**: React Three Fiber + drei 3D scenes (landing hero, trophy), Motion animations (kinetic headline, scroll reveals, staggered bento grid, spotlight tilt cards, question transitions, animated counters), aurora gradients, grain, and a topic marquee. 3D loads lazily and falls back to static UI without WebGL or with reduced motion.

## Stack

- Next.js 16 (App Router, route handlers as REST API, `proxy.ts` for route protection)
- Tailwind CSS 4, Rubik + Nunito Sans
- three.js + React Three Fiber + drei, Motion, canvas-confetti
- Postgres on Neon + Drizzle ORM
- `jose` (JWT), `bcryptjs`, `zod`
- AI SDK + Vercel AI Gateway (OIDC auth on Vercel)

## REST API

| Method | Route | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Log in |
| POST | `/api/auth/logout` | Log out |
| GET/POST | `/api/notes` | List / create notes |
| POST | `/api/notes/import` | Read an uploaded file into a note draft (multipart, field `file`) |
| POST | `/api/notes/generate` | Generate an AI note draft (not saved) |
| GET/PUT/DELETE | `/api/notes/:id` | Read / update / delete a note |
| GET/POST | `/api/quizzes` | List / generate a quiz with AI |
| GET | `/api/quizzes/:id` | Quiz detail |
| POST | `/api/quizzes/:id/submit` | Submit answers (score is computed on the server) |
| POST | `/api/quizzes/:id/reinforce` | AI quiz targeting the missed concepts: `{"count":5|10}` |
| POST | `/api/quizzes/:id/review` | New quiz from a finished one: `{"mode":"errors"}` (wrong answers) or `{"mode":"all"}` (shuffled repeat) |
| GET | `/api/stats` | Dashboard stats |

## Local development

```bash
cp .env.example .env.local   # or: vercel env pull .env.local
npm install
npm run db:push              # create tables
npm run dev
```

## Deploy

Deployed on Vercel. Set `DATABASE_URL` and `JWT_SECRET` in the project's environment variables, then run `npm run db:push` once against the production database.
