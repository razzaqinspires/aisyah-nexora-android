# AISYAH Android — Nexora AI Starter

**Project:** Project AISYAH  
**Assistant/persona:** Aisyah  
**AI model/system:** Nexora  
**Platform target:** Android first  
**Status:** Initial source scaffold; not yet compiled or deployment-tested.

This repository starts the Android client and Node.js backend for the AISYAH assistant.
It preserves the previously selected direction: Flutter, Node.js, PostgreSQL + pgvector,
Google authentication, per-user data isolation, hybrid RAG, local model first where
compatible, and cloud-provider fallback.

## Important status

- Flutter SDK was not available in the authoring environment; the Android app has not
  been compiled into an APK.
- Backend automated tests are included but must be run in a Node.js environment.
- Firebase credentials, Google OAuth configuration, PostgreSQL credentials, and model
  provider keys are intentionally not included.
- This is a clean starter scaffold, not a transfer of ChatGPT model weights, hidden
  internal state, or private account data. The app implements the Aisyah persona and
  Nexora integration points under the user's control.

## Repository layout

```text
aisyah-nexora-android/
├── apps/android/             # Flutter Android client
├── backend/                  # Node.js API and model router
├── database/                 # PostgreSQL + pgvector schema
├── docs/                     # Architecture, safety, roadmap
├── scripts/                  # Local development helpers
├── .env.example
└── PROJECT_REGISTRY.md
```

## Prerequisites

- Flutter stable SDK (Android toolchain configured)
- Node.js 20+
- PostgreSQL with pgvector extension
- Firebase project with Google sign-in enabled (for authenticated chat)
- Ollama or another OpenAI-compatible local model endpoint (optional)
- Cloud model API credentials (optional fallback)

## Start backend

```bash
cd backend
cp ../.env.example .env
npm install
npm test
npm run dev
```

`GET /health` is public. `POST /v1/chat` requires a valid Firebase ID token.
If Firebase is not configured, authenticated endpoints fail closed.

## Run Android app

```bash
cd apps/android
flutter pub get
flutter run --dart-define=NEXORA_API_BASE_URL=http://10.0.2.2:3000
```

For a physical Android device, replace `10.0.2.2` with the development computer's
LAN address. Configure Firebase Android files and OAuth SHA fingerprints before
Google sign-in is enabled in a later implementation step.

## Model routing

1. Local Ollama-compatible endpoint is attempted first.
2. If local inference is unavailable and cloud fallback is configured, use cloud.
3. If neither is available, return a controlled service-unavailable response.
4. Never log API keys, bearer tokens, or raw authentication credentials.

## Next steps

See `docs/ROADMAP.md` and `docs/SETUP_ANDROID.md`.
