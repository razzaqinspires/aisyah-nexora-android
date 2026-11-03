# Project Registry Entry

- **Project ID:** PRJ-AISYAH-ANDROID-001
- **Registry ID:** RV-022
- **Name:** AISYAH Android — Nexora AI
- **Owner:** Arifi Razzaq
- **Assistant persona:** Aisyah
- **AI model/system name:** Nexora
- **Created:** 2026-11-02
- **Current version:** 0.5.0
- **Status:** Phase 4 source implemented; Firebase/database/device validation pending
- **Platform:** Android first
- **Client:** Flutter
- **Backend:** Node.js (ES modules), Express
- **Database:** PostgreSQL + pgvector
- **Authentication:** Firebase Authentication with Google provider
- **Identity mapping:** Firebase UID → internal PostgreSQL UUID
- **AI strategy:** Local model first where compatible; cloud fallback
- **Memory strategy:** Private per-user RAG, separate approved shared knowledge

## Phase 2 changes — 2026-11-03
- Added Google sign-in flow and Firebase auth-state gate.
- Added fresh Firebase ID token retrieval for each protected API request.
- Added backend Firebase ID token verification with revocation checking.
- Added server-side upsert of internal app user from verified Firebase claims.
- Added `GET /v1/me`.
- Changed chat ownership to use internal DB UUID rather than external Firebase UID.
- Added transaction-local RLS identity helper.
- Added auth and transaction unit tests.
- Added Firebase setup and database migration documentation.

## Validation record
- Source files updated: yes
- ZIP integrity: pending final packaging check
- Node syntax: pending final check
- Backend automated tests: NOT RUN; npm install timed out and dependencies are unavailable
- PostgreSQL RLS integration tests: NOT RUN (database not supplied)
- Node syntax check: PASS (`node --check` on backend src and test JavaScript)
- Flutter analyze/compile: NOT RUN (Flutter SDK unavailable in authoring environment)
- Firebase sign-in: NOT RUN (project configuration and SHA fingerprints not supplied)
- Android APK: NOT BUILT
- Deployment: NOT RUN

## Security requirements
- Never commit `.env`, API keys, OAuth secrets, service-account JSON, or tokens.
- Runtime DB role must not own protected tables or have BYPASSRLS.
- Never trust client-provided user IDs.
- Do not store Firebase ID tokens manually; obtain fresh tokens from Firebase SDK.


## Phase 3 changes — 2026-11-03
- Added server-side conversation list/read/delete and persistent message exchange.
- Chat history is retrieved from the authenticated owner account; client-supplied history is no longer trusted.
- Added private memory list/create/edit/delete APIs and Android memory management screen.
- Added optional OpenAI-compatible embeddings and pgvector cosine retrieval, scoped to the authenticated owner.
- Added Android conversation history picker and persistent conversation IDs.
- Added migration `003_conversation_memory.sql` and Phase 3 architecture/security/API documentation.
- Personal memories remain separate from shared knowledge; no automatic extraction or training is enabled.

## Phase 3 validation record
- Node syntax (`npm run check`): PASS.
- Backend automated tests: BLOCKED / NOT RUN; dependencies `express` and `firebase-admin` are not installed in the environment.
- PostgreSQL migration and cross-user RLS integration: NOT RUN; no database instance/credentials.
- Flutter analyze/build/device validation: NOT RUN; Flutter SDK and Firebase project configuration are not available.
- APK: NOT BUILT.
- Deployment: NOT RUN.


## Phase 4 changes — 2026-11-03
- Added opt-in memory proposal extraction and explicit owner approval/rejection.
- Added per-user normalized content hashes and deduplication.
- Added deterministic importance scoring and optional expiry controls.
- Memory retrieval now excludes unapproved and expired rows.
- Added shared-knowledge submission queue, Firebase UID reviewer allowlist, reviewer decisions and audit log.
- Added migration `004_memory_governance.sql`, Android review controls and governance documentation.

## Phase 4 validation record
- Node syntax sweep: pending final package validation.
- Memory-governance unit tests: pending final execution.
- Backend API tests: require npm dependencies; not yet executed in this environment.
- PostgreSQL migration/RLS integration: NOT RUN; database not supplied.
- Flutter analyze/build/device validation: NOT RUN; Flutter SDK/Firebase project not supplied.
- APK: NOT BUILT.
- Deployment: NOT RUN.


## 2026-11-03 — Phase 5

Phase 5 adds private/shared retrieval separation, semantic and full-text shared knowledge search, weighted context ranking, conservative potential-conflict flags, and Indonesian installation/run documentation. External database, Firebase, embedding, full test-suite and Android device validation remain pending.
