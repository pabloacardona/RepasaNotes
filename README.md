# Repasa

Your notes → an AI-generated quiz → you know what to review.

Final project for *Desarrollo de Software Web* (UPB 2026).

## Features

- **Landing** with SEO metadata, `robots.txt`, and `sitemap.xml`.
- **Login / Sign up** with field-level validation (Zod on client and server). Passwords are hashed with bcrypt, and sessions use a JWT in an `httpOnly` cookie.
- **Dashboard** showing quizzes taken, overall average, saved notes, score per topic, and the weakest topic with a "Repasar ahora" button.
- **Mis apuntes**: full CRUD with topic filter and search.
- **Generar quiz**: an open-weights model (`openai/gpt-oss-120b` via Vercel AI Gateway, falling back to `deepseek/deepseek-v4-flash`) writes 5/10/15 multiple-choice questions from a note, with three difficulty levels, structured JSON output, and note-length validation (200–8000 characters).
- **Resolver quiz**: focus mode, one question at a time, a progress bar, and instant feedback with an explanation.
- **Resultados**: score, each mistake with the correct answer, and "Repasar errores", which builds a new quiz from only the questions you missed.

## Stack

- Next.js 16 (App Router, route handlers as REST API, `proxy.ts` for route protection)
- Tailwind CSS 4, Rubik + Nunito Sans
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
| GET/PUT/DELETE | `/api/notes/:id` | Read / update / delete a note |
| GET/POST | `/api/quizzes` | List / generate a quiz with AI |
| GET | `/api/quizzes/:id` | Quiz detail |
| POST | `/api/quizzes/:id/submit` | Submit answers (score is computed on the server) |
| POST | `/api/quizzes/:id/review` | New quiz with only the wrong answers |
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
