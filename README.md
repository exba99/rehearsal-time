# Rehearsal Time

Outil personnel pour répéter **à voix haute** une présentation scientifique en anglais (SRNT-E 2026, 12 minutes + Q&A), avec un retour IA sur le fond, la formulation et le timing.

## Pourquoi
Le prototype Artifact ne pouvait pas utiliser le micro (iframe sandboxée) et reposait sur `SpeechRecognition`, absent de Safari. Cette version est une vraie page web : l'audio est capturé avec `MediaRecorder` (supporté partout, iPhone compris), transcrit côté serveur par Whisper (Groq), puis évalué par Claude.

## Fonctionnalités
- **Full Speech** — 18 segments, texte de référence (masquable), mots-ancres, budget de temps, enregistrement + chrono, transcription éditable, feedback. Segments cochés et temps conservés dans le navigateur ; total cumulé affiché face à 12:00.
- **Q&A Practice** — tirage aléatoire parmi 16 questions, même flux, feedback sur la pertinence et la structure en 3 temps (reconnaître / expliquer avec un chiffre / ouvrir).
- Saisie manuelle toujours possible si le micro est refusé.

## Lancer en local (feedback via ton abonnement Claude)
Prérequis sur le Mac : Node 20+, et Claude Code connecté à ton abonnement (`npm i -g @anthropic-ai/claude-code`, puis `claude` → `/login`).

```bash
npm install
cp .env.example .env.local   # renseigner GROQ_API_KEY ; FEEDBACK_PROVIDER=subscription
caffeinate -i npm run dev    # caffeinate empêche le Mac de se mettre en veille
```
Ouvrir http://localhost:3000.

## Utiliser sur iPhone, depuis n'importe quel réseau (Cloudflare Tunnel)
Rien à installer sur l'iPhone. Sur le Mac, une seule fois : `brew install cloudflared`.

1. Dans `.env.local`, définir `APP_PASSWORD=` (le lien est public : ce mot de passe protège ton crédit Claude et ta clé Groq).
2. Terminal 1 : `caffeinate -i npm run phone`
3. Terminal 2 : `cloudflared tunnel --url http://localhost:3000`
4. Ouvrir sur l'iPhone l'adresse `https://…trycloudflare.com` affichée, puis saisir le mot de passe (nom d'utilisateur libre).

L'adresse change à chaque lancement de `cloudflared`. Ctrl+C dans le terminal 2 coupe l'accès public.

## Déploiement Vercel (optionnel, payant)
Le mode abonnement ne fonctionne qu'en local. Sur Vercel : `FEEDBACK_PROVIDER=api`, `ANTHROPIC_API_KEY`, `GROQ_API_KEY` dans *Environment Variables*. Push sur `main` → déploiement automatique.
