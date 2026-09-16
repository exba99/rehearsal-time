# Rehearsal Time — CLAUDE.md

Outil perso de répétition orale (talk SRNT-E 2026, 12 min + Q&A) : enregistrement micro → transcription → feedback Claude.

## Stack
- Next.js 16 (App Router) + TypeScript, déployé sur Vercel (auto-deploy sur push `main`).
- Pas de BDD : progression en `localStorage` (clé `rehearsal-time:progress:v1`).
- Audio : `MediaRecorder` (webm/opus sur Chrome/Firefox, mp4/aac sur Safari). **Jamais** `SpeechRecognition` (non supporté sur Safari).
- `/api/transcribe` : Groq Whisper (`whisper-large-v3-turbo`), multipart champ `audio`.
- `/api/feedback` : Anthropic Messages API, `mode: "script" | "qa"`, prompts dans `lib/prompts.ts`.

## Commandes
- `npm run dev` — local (http://localhost:3000)
- `npm run build` / `npm run typecheck`

## Env (serveur uniquement, jamais `NEXT_PUBLIC_`)
`ANTHROPIC_API_KEY`, `GROQ_API_KEY`, optionnel `ANTHROPIC_MODEL` (défaut `claude-sonnet-4-5`). Local : `.env.local` (gitignored). Prod : Vercel Environment Variables.

## Conventions
- Données du talk : `lib/segments.json` (17 segments), `lib/questions.json` (16 questions). Modifier là, pas dans les composants.
- Couleurs via variables CSS dans `app/globals.css` (navy `#1F3A56`, corail `#C1562E`), dark mode via `prefers-color-scheme`.
- Toute nouvelle fonctionnalité doit marcher sur Safari iOS (tap targets ≥ 44px, pas d'API Chrome-only).
- Le champ texte manuel reste toujours disponible en secours du micro.
