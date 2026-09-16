# Rehearsal Time

Outil personnel pour répéter **à voix haute** une présentation scientifique en anglais (SRNT-E 2026, 12 minutes + Q&A), avec un retour IA sur le fond, la formulation et le timing.

## Pourquoi
Le prototype Artifact ne pouvait pas utiliser le micro (iframe sandboxée) et reposait sur `SpeechRecognition`, absent de Safari. Cette version est une vraie page web : l'audio est capturé avec `MediaRecorder` (supporté partout, iPhone compris), transcrit côté serveur par Whisper (Groq), puis évalué par Claude.

## Fonctionnalités
- **Full Speech** — 17 segments, texte de référence (masquable), mots-ancres, budget de temps, enregistrement + chrono, transcription éditable, feedback. Segments cochés et temps conservés dans le navigateur ; total cumulé affiché face à 12:00.
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

## Utiliser sur iPhone, depuis n'importe quel réseau
1. Installer **Tailscale** sur le Mac et sur l'iPhone, connecté au même compte.
2. Console Tailscale → **DNS** : activer *MagicDNS* et *HTTPS Certificates*.
3. Sur le Mac : lancer l'app en mode production, plus rapide et sans blocage côté téléphone : `caffeinate -i npm run phone`, puis dans un autre terminal `tailscale serve --bg 3000`
4. Sur l'iPhone (Tailscale activé) : ouvrir l'URL affichée, `https://<nom-du-mac>.<tailnet>.ts.net`. L'app n'est visible que par tes appareils.

Arrêter le partage : `tailscale serve --https=443 off`.

## Déploiement Vercel (optionnel, payant)
Le mode abonnement ne fonctionne qu'en local. Sur Vercel : `FEEDBACK_PROVIDER=api`, `ANTHROPIC_API_KEY`, `GROQ_API_KEY` dans *Environment Variables*. Push sur `main` → déploiement automatique.
