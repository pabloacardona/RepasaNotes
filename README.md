# Repasa

Your notes → an AI-generated quiz → you know what to review.

Final project for *Desarrollo de Software Web* (UPB 2026). Live: https://repasa-theta.vercel.app

## Features

### Study

- **Notes** (`/apuntes`): full CRUD with topic filter and search, plus a study-stats panel (answered, accuracy, day streak, weekly comparison, per-topic bars, 12-week heatmap). Days are counted in Colombia time.
- **AI notes**: enter a topic and level (básico, intermedio, avanzado) and the AI writes a structured study note that you review and edit before saving. Non-study topics are rejected.
- **Import files**: drag and drop a .pdf, .docx, .txt or .md (up to 4 MB). Long documents are condensed by AI to fit the note limit.
- **Notes from photos**: attach up to 6 photos of notebooks, whiteboards or slides. They are shrunk in the browser and a vision model (Gemini) transcribes them into a note. Code and charts it can read are kept as code blocks and chart blocks.
- **AI quizzes**: 5, 10 or 15 questions at three difficulty levels, structured output validated server side. Providers are chosen with `AI_PROVIDER` (Google Gemini and Groq free tiers, Anthropic, or Vercel AI Gateway) with automatic fallback.

### Playing a quiz

- Focus mode: one question at a time, points with a streak bonus, timer, question navigator, keyboard shortcuts (1-4 / A-D, arrows).
- **Hint lives**: 3 lives in a 5-question quiz, 5 in a 10-question quiz and 6 in a 15-question quiz. A life buys an AI hint that helps you infer the answer without revealing it. A failed hint costs nothing.
- **Code and charts in questions**: fenced code blocks get syntax colours (JS, Python, SQL, and similar), inline `code` is styled, and a `chart` block renders bar, line or pie charts as responsive SVG. Answers and explanations support the same syntax.
- Calm study backdrop: three blurred colour fields drift very slowly and shift hue over minutes. Pure CSS, respects reduced motion.
- A combo (3+ correct in a row) lights a subtle flame along the question card, growing at 5 and turning blue-white at 8.
- A 3D mascot (21 rigged monsters, Quaternius CC0) reacts to each answer.

### Sharing

- **Share a quiz** from its results page, by link and QR code (copy or download the QR). Two modes:
  - *Same quiz for everyone*: same questions, with question and answer order shuffled for each person.
  - *A different quiz for each person*: the AI writes new questions from the same note for every visitor, so classmates study the same topic but never get the same quiz.
- Shared quizzes open at `/s/<id>` without an account. Results stay on the visitor's screen. The public AI endpoints are rate limited.

### Progress and game layer

- League-style rank ladder (Hierro to Retador) with divisions, XP, per-topic mastery, ten achievements with four tiers, daily quests with a bonus, and a day streak.
- **Dashboard**: score per topic and the topic to reinforce in one card at the top, then your rank, a compact streak with a week of luminous wave cells, and a "Hoy" panel with the daily goal and quests. Plaque collection and the rank path (collapsible) sit below.
- **Results**: score ring, grade (S+ to D), XP, promotions, unlocked achievements, and a reinforcement quiz generated from the concepts you missed.
- **Forge banner** on the new-quiz page: a chubby cartoon blacksmith (rigged KayKit character, CC0) in an Olympian forge hammers an anvil. The hammer, anvil and effects are timed from the sampled animation clip: sparks, a shockwave ring, a light flash, the glowing ingot and a small camera shake all fire at the exact moment of the blow. Textures are Poly Haven PBR at 2k. It loads lazily, pauses off screen, uses 1k textures on small devices and falls back to a static icon without WebGL or with reduced motion.

### Account

- **Authentication**: email and password (bcrypt, JWT in an `httpOnly` cookie), plus optional **Firebase Authentication** (email and Google). Firebase ID tokens are verified on the server against Google's public keys and exchanged for the same session cookie. Only verified emails are accepted, and accounts are matched by email so older password accounts keep their data.
- **Profile photo**: change it from the user menu. The image is cropped to a square and shrunk to 256 px in the browser, and stored as a small data URL.
- **Mascot picker**: one compact control. Change the mascot with the arrows, the mouse wheel, touchpad scroll or a swipe; the dice picks a random one on every visit. The choice is saved on the account.
- Light and dark themes, responsive layout from phone to desktop.

## 3D and image assets

All CC0 unless noted:

- **Blacksmith**: KayKit "Adventurers" Character Pack (Barbarian), by Kay Lousberg. The head, laurel, apron, gauntlets, belt and hammer are built in code.
- **Mascots**: Quaternius "Cute Animated Monsters".
- **Textures and HDRI**: Poly Haven (metal_plate_02, rust_coarse_01, terlenka, brown_leather, marble_tiles, marble_01, and the kloofendal_48d_partly_cloudy_puresky HDRI). Converted to webp.
- Credits for the forge assets are in `public/3d/forge/CREDITS.txt`.

## Stack

- Next.js 16 (App Router, route handlers as REST API, `proxy.ts` for route protection)
- Tailwind CSS 4, Space Grotesk + Inter
- three.js, React Three Fiber, drei, Motion, canvas-confetti
- Postgres on Neon + Drizzle ORM
- `jose` (JWT), `bcryptjs`, `zod`, Firebase Authentication (optional), `qrcode`
- AI SDK with Google Gemini, Groq, Anthropic or Vercel AI Gateway providers (see `.env.example`)

## REST API

| Method | Route | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Log in |
| POST | `/api/auth/firebase` | Exchange a Firebase ID token for the session cookie |
| POST | `/api/auth/logout` | Log out |
| PUT/DELETE | `/api/profile/avatar` | Set / remove the profile photo (small data URL) |
| PUT | `/api/mascot` | Save the chosen mascot |
| GET/POST | `/api/notes` | List / create notes |
| POST | `/api/notes/import` | Read an uploaded file (`file`) or photos (`photos`, up to 6) into a note draft |
| POST | `/api/notes/generate` | Generate an AI note draft (not saved) |
| GET/PUT/DELETE | `/api/notes/:id` | Read / update / delete a note |
| GET/POST | `/api/quizzes` | List / generate a quiz with AI |
| GET | `/api/quizzes/:id` | Quiz detail |
| POST | `/api/quizzes/:id/submit` | Submit answers (score is computed on the server) |
| POST | `/api/quizzes/:id/hint` | One AI hint for a question: `{"index":0}` |
| POST | `/api/quizzes/:id/reinforce` | AI quiz targeting the missed concepts: `{"count":5\|10}` |
| POST | `/api/quizzes/:id/review` | New quiz from a finished one: `{"mode":"errors"}` or `{"mode":"all"}` |
| POST | `/api/share` | Publish a quiz as a link: `{"quizId":"…","mode":"fixed"\|"variant"}` |
| POST | `/api/share/:id/play` | Public: get a shuffled copy (or an AI variant) of a shared quiz |
| POST | `/api/share/:id/hint` | Public, rate limited: AI hint for a shared-quiz question |
| GET | `/api/stats` | Dashboard stats |

## Local development

```bash
cp .env.example .env.local   # or: vercel env pull .env.local
npm install
npm run db:push              # create or update tables
npm run dev
```

`npm run db:push` is needed again after pulling changes that touch `lib/db/schema.ts` (it added `users.avatar` and `shared_quizzes`).

### Firebase Authentication (optional)

1. Create a Firebase project and register a web app.
2. In Authentication → Sign-in method, enable **Email/Password** and **Google**.
3. Put the web app values in `.env.local` (and in Vercel): `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`.
4. Add your domains (localhost and the Vercel URL) to Authentication → Settings → Authorized domains.

Without these variables the Google button is hidden and email + password keeps working.

## Deploy

Deployed on Vercel. Set `DATABASE_URL` and `JWT_SECRET` (plus the AI keys and the optional Firebase variables) in the project's environment variables, and run `npm run db:push` against the production database after schema changes. Deploy with `vercel --prod`.
