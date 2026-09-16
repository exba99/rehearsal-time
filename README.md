# Rehearsal Time

Outil personnel pour répéter **à voix haute** une présentation scientifique en anglais (SRNT-E 2026, 12 minutes + Q&A), avec un retour IA sur le fond, la formulation et le timing.

## Pourquoi
Le prototype Artifact ne pouvait pas utiliser le micro (iframe sandboxée) et reposait sur `SpeechRecognition`, absent de Safari. Cette version est une vraie page web : l'audio est capturé avec `MediaRecorder` (supporté partout, iPhone compris), transcrit côté serveur par Whisper (Groq), puis évalué par Claude.

## Fonctionnalités
- **Full Speech** — 17 segments, texte de référence (masquable), mots-ancres, budget de temps, enregistrement + chrono, transcription éditable, feedback. Segments cochés et temps conservés dans le navigateur ; total cumulé affiché face à 12:00.
- **Q&A Practice** — tirage aléatoire parmi 16 questions, même flux, feedback sur la pertinence et la structure en 3 temps (reconnaître / expliquer avec un chiffre / ouvrir).
- Saisie manuelle toujours possible si le micro est refusé.

## Lancer en local
```bash
npm install
cp .env.example .env.local   # puis renseigner ANTHROPIC_API_KEY et GROQ_API_KEY
npm run dev
```
Ouvrir http://localhost:3000. Le micro exige HTTPS sauf sur `localhost` — pour tester sur iPhone, utiliser le déploiement Vercel.

## Déploiement
Push sur `main` → déploiement automatique Vercel. Les clés sont définies dans *Project Settings → Environment Variables*, jamais dans le code.
