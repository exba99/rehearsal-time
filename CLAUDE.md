# Rehearsal Time — CLAUDE.md

Outil perso de répétition orale (talk SRNT-E 2026, 12 min + Q&A) : enregistrement micro → transcription → feedback Claude.

## Stack
- Next.js 16 (App Router) + TypeScript, déployé sur Vercel (auto-deploy sur push `main`).
- Pas de BDD : progression en `localStorage` (clé `rehearsal-time:progress:v1`).
- Audio : `MediaRecorder` (webm/opus sur Chrome/Firefox, mp4/aac sur Safari). **Jamais** `SpeechRecognition` (non supporté sur Safari).
- `/api/transcribe` : Groq Whisper (`whisper-large-v3-turbo`), multipart champ `audio`.
- `/api/feedback` : `mode: "script" | "qa"`, prompts dans `lib/prompts.ts`, appel Claude dans `lib/claude.ts` avec 2 fournisseurs :
  - `subscription` : Claude Agent SDK authentifié par le `claude login` de la machine (usage perso, en local uniquement ; sans outils, sans réglages locaux).
  - `api` : clé `ANTHROPIC_API_KEY` (obligatoire sur Vercel).
- Accès iPhone : `npm run phone` + `cloudflared tunnel --url http://localhost:3000` (lien HTTPS public) ; `APP_PASSWORD` active une protection Basic Auth via `proxy.ts`. HTTPS requis pour le micro sur Safari.

## Commandes
- `npm run dev` — local (http://localhost:3000)
- `npm run build` / `npm run typecheck`

## Env (serveur uniquement, jamais `NEXT_PUBLIC_`)
`GROQ_API_KEY` ; `FEEDBACK_PROVIDER` (`subscription` | `api`, défaut : `api` si une clé est présente) ; `ANTHROPIC_API_KEY` + `ANTHROPIC_MODEL` en mode api ; `CLAUDE_SUBSCRIPTION_MODEL` optionnel. Local : `.env.local` (gitignored). Prod : Vercel Environment Variables.

## Conventions
- Données du talk : `lib/segments.json` (18 segments ; source : `docs/script-source.txt`), `lib/questions.json` (16 questions). Modifier là, pas dans les composants.
- Couleurs via variables CSS dans `app/globals.css` (navy `#1F3A56`, corail `#C1562E`), dark mode via `prefers-color-scheme`.
- Toute nouvelle fonctionnalité doit marcher sur Safari iOS (tap targets ≥ 44px, pas d'API Chrome-only).
- Le champ texte manuel reste toujours disponible en secours du micro.
- Audio du feedback : synthèse vocale du navigateur (`lib/speech.ts`, voix anglaise féminine choisie dans `VoicePicker`). Dans le texte renvoyé par Claude, tout passage entre `{{ }}` devient une pastille lisible (`components/Feedback.tsx`) ; les prompts imposent ce balisage.
