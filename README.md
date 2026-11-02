# Repasa

Your notes → an AI-generated quiz → you know what to review.

Final project for *Desarrollo de Software Web* (UPB 2026).

## Features

- **Landing** with SEO metadata, `robots.txt`, and `sitemap.xml`.
- **Login / Sign up** with field-level validation (Zod on client and server). Passwords are hashed with bcrypt, and sessions use a JWT in an `httpOnly` cookie.
- **Dashboard** showing quizzes taken, overall average, saved notes, score per topic, and the weakest topic with a "Repasar ahora" button.
- **Mis apuntes**: full CRUD with topic filter and search. Each note shows questions answered, correct, wrong and accuracy. A side panel tracks progress: answered questions, accuracy, day streak (current and best), this week compared with last week, a correct/wrong bar per topic, a 12-week consistency heatmap, questions per week, and a table view of the same numbers. Days are counted in Colombia time.
- **Crear apunte con IA**: enter a topic and level (básico, intermedio, avanzado). The AI writes a specialized study note (introduction, key concepts, explanation, examples, common mistakes, summary) that the user reviews and edits before saving. Non-study topics are rejected.
- **Generar quiz**: an AI model chosen with `AI_PROVIDER` (free Google Gemini and Groq with permanent keys: if one fails, the other answers; Claude through the Anthropic API or Vercel AI Gateway are optional). `node --env-file=.env.local scripts/check-ai.mjs` tests each key and grades the quality of both, with three difficulty levels, structured JSON output, and note-length validation (200–8000 characters).
- **Subir archivo**: drag and drop a .pdf, .docx, .txt, or .md (up to 4 MB). Short documents load as-is; long ones are condensed by AI into a note that fits the limit.
- **Resolver quiz**: focus mode, one question at a time, points with streak bonus, confetti on correct answers, question navigator, timer, keyboard shortcuts (1-4 / A-D, arrows), and buttons to restart or finish early (unanswered questions count as wrong).
- **Resultados**: 3D trophy (gold, silver, bronze by score), animated score, points, best streak, confetti at 70% or more, and each mistake with the correct answer. **Quiz de refuerzo con IA** generates a new quiz (5 or 10 questions) that tests the missed concepts from new angles. You can also repeat only the missed questions or the whole quiz shuffled.
- **Interactive backdrop and mascot (quiz and results)**: the page background is a screensaver-style canvas of glowing particles that link up, orbit the pointer, ripple on click and send a wave on every answer (green and gold for a hit, red-violet for a miss; it warms with the streak). Repi stands beside the quiz in a small, antialiased, transparent 3D canvas. He can be any of 21 rigged monsters (Quaternius, CC0), picked with the "Cambiar mascota" menu or drawn at random. Each mood maps to a clip when the monster has one and always to a procedural layer (hop, squash and stretch, lean, sway, shake), so even monsters with only an Idle loop react. Textures were denoised and upscaled to 1024 px, normals are smoothed and the material has a soft sheen. Falls back to an emoji without WebGL.
- **Ranked ladder and achievements**: XP puts you on a League-style ladder (Hierro, Bronce, Plata, Oro, Platino, Esmeralda, Diamante, Maestro, Gran Maestro, Retador) with four divisions and LP up to Diamante, shown with an SVG crest that grows wings and a crown with the tier. Every topic has its own mastery rank and counts as conquered from Oro (accuracy-weighted, so guessing does not climb). Ten achievements have four tiers each (Común to Legendaria) and give achievement points, like WoW. Daily missions, a day streak, a combo bar in the quiz and a rank chip in the top bar complete the loop. The results page shows VICTORIA from 50% up (below that it only says to keep going, nobody "loses"), a letter grade (S+ to D), the XP earned, promotions and unlocked achievements. The /logros page shows the ladder, the conquest map and all achievements. All of it is derived from finished quizzes and notes, so it needs no extra tables.
- **Epic neon UI with light and dark themes**: glass panels, fluorescent bars, animated gradient borders, Space Grotesk and Inter, a particle constellation that reacts to the pointer and to every answer. Rank crests are vector art with a different silhouette per tier (shield, hex or diamond body; feather, leaf or flame wings; crown spikes; halo; round, faceted or star gem) and light effects that grow with the rank: aura, turning rays, twinkling sparks, a sheen and glow. A slim player bar stays under the top nav (rank, XP road, day streak with an animated flame and a countdown when it is at risk) and a compact interactive stats dock stays at the bottom of every page: streak with its milestone progress, the week chart, accuracy ring, answers, quizzes and today's goal. Each block opens a detail card on click, and the dock folds into a pill that remembers its state. Mascots are measured in their idle pose, centred and framed by the camera from their real size; pages fade in softly and the victory screen has rays, a score gauge, a grade medal and smooth count-ups. The dashboard hero tilts the crest towards the pointer and celebrates on click, and the whole ladder is clickable. The quiz is a HUD with one glowing cell per question, XP and combo with flame, a big question card with a rotating gradient border, option cards with keycaps, and a mascot beside it. Buttons throw bursts, and a rank-up gets a full-screen celebration. The sun/moon button saves the theme.
- **Trophies**: gold, silver, and bronze cups built from a 128-segment lathe profile with tube handles, PBR metal with micro-scratch maps, an HDRI for reflections, and a marble-and-wood plinth.
- **Design**: React Three Fiber + drei landing hero, Motion animations (kinetic headline, scroll reveals, bento grid, spotlight tilt cards, question transitions, animated counters), aurora gradients, grain, and a topic marquee. 3D loads lazily and falls back to a static UI without WebGL or with reduced motion.

## 3D assets

All CC0:

- **Repi**: Quaternius "Cute Animated Monsters" (21 characters, textures denoised and embedded as WebP).
- **Trophy materials and reflections**: Poly Haven (marble_01, wood_table_worn, metal_plate textures and the kloofendal_48d_partly_cloudy_puresky HDRI).

Everything is optimized with gltf-transform (meshopt compression, WebP textures, mesh simplification where safe). The full 3D folder is about 2.3 MB.

## Stack

- Next.js 16 (App Router, route handlers as REST API, `proxy.ts` for route protection)
- Tailwind CSS 4, Rubik + Nunito Sans
- three.js + React Three Fiber + drei + @react-three/postprocessing, Motion, canvas-confetti
- Postgres on Neon + Drizzle ORM
- `jose` (JWT), `bcryptjs`, `zod`
- AI SDK with Google Gemini, Groq, Anthropic or Vercel AI Gateway providers (see `.env.example`)

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

## Latest polish

- The stats dock is now a solid indigo bar with its own colours in both themes, so it never blends with the page.
- "Mis apuntes" is one centred column: header, search and topic chips, a two-column grid of note cards with topic colours and accuracy bars, restyled AI and file panels, and the study stats folded into a details block.
- The player name and avatar with an online dot are always visible in the nav and in the quiz header.
- While a quiz combo burns (3+ in a row) the question card catches fire: flames and embers along its top edge that grow at 5 and turn blue-white at 8, with a hot glowing border. They ignite and go out smoothly.
- Mascot clips no longer slide the character sideways: the Body bone's X and Z are pinned so the model stays centred while it jumps, dances or reacts.

- The palette moved from blue and green to a warm ember mood (rose, amber and plum), in both themes, including the particle backdrop, the buttons, the bars and the bottom bar. The "Repasa" wordmark is always yellow.
- Achievements use vector medals (a faceted frame in the rarity colour and a hand-drawn glyph per achievement: swords, bulb, scroll, compass, flame, diamond, horned helm, candle, castle, wings), with a padlock silhouette when locked.
- The notes page always shows a compact stats panel: five tiles, an eight-week sparkline and the main topics.
- A click anywhere on the bottom bar hides it (a block opens its detail card instead); the pill brings it back.

- The rank-up scene is a body-level overlay (nothing can clip it) with three beats: the old crest charges up, a flash and shockwaves swap it for the new one, and the rank name rises in letter by letter. It scales to any screen.
- During a quiz the interface is a single centred card (max 560 px) with smaller type and a compact header, so the eyes stay on the question; the mascot sits small in the lower-right corner.

- The orange-to-yellow gradients are gone: buttons and bars are solid ember red, titles are fire-lit (a flickering glow), and the landing has animated flames along the bottom of the hero and above the "Gana. Sube." title (`components/game/flame-row.tsx`).
- The landing mascot is framed with wider margins, its speech bubble now sits above the canvas instead of over the model, and winged characters are no longer shrunk to fit their wings.

- The results screen is one calm column: a score ring with the grade and the verdict, one row with the XP and the rank bar (achievements as small chips), a one-line "reforzar" row, two buttons and the mistakes folded in a details block. A promotion still gets its own full-screen scene.
- The landing is calm and study-focused: drifting layered waves along the bottom of the hero and slow ripples around the mascot (`components/landing/waves.tsx`). The fire effects stay only inside a quiz, as feedback for a burning combo.

- Mascot speech bubbles now show quotes from philosophers and thinkers (lib/quotes.ts). Animations use one cross-faded clip at a time (reactions play once, then return to idle), which fixes the glitching.

- Landing performance: backdrop drawn at 1x with a low-res cached gradient, batched link strokes and cached glow sprites (auto lite mode on slow devices); 3D canvas capped at 1.5x with a smaller shadow map; epic borders animate in steps.
