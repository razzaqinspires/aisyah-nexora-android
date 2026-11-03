# Project Registry Entry

- **Project ID:** PRJ-AISYAH-ANDROID-001
- **Name:** AISYAH Android — Nexora AI
- **Owner:** Arifi Razzaq
- **Assistant persona:** Aisyah
- **AI model/system name:** Nexora
- **Created:** 2026-11-02
- **Status:** Initial scaffold created; build and runtime validation pending
- **Platform:** Android first
- **Client:** Flutter
- **Backend:** Node.js (ES modules)
- **Database:** PostgreSQL + pgvector
- **Authentication target:** Firebase Authentication / Google sign-in
- **AI strategy:** Local model first where compatible; cloud fallback
- **Memory strategy:** Private per-user RAG, separate approved shared knowledge
- **Secrets:** Never commit `.env`, API keys, OAuth secrets, service-account JSON, or tokens

## Validation record

- Source files generated: yes
- ZIP integrity: to be checked after packaging
- Flutter compile: NOT RUN (Flutter SDK unavailable in authoring environment)
- Backend source/test syntax: PASS (`node --check`)
- Backend tests: NOT RUN (dependencies not installed in authoring environment)
- Android APK: NOT BUILT
- Deployment: NOT RUN

## Change log

### 2026-11-02 — Initial Android-first scaffold
- Added Flutter chat client shell.
- Added Node.js API with health endpoint, Firebase token verification boundary,
  local/cloud model routing interface, and request validation.
- Added PostgreSQL schema with per-user ownership and row-level security policies.
- Added setup, architecture, privacy, safety, and roadmap documentation.
