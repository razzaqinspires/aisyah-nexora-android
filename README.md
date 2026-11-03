# AISYAH Android — Nexora AI

**Project:** Project AISYAH
**Assistant/persona:** Aisyah
**AI model/system:** Nexora
**Platform target:** Android first
**Current source version:** 0.5.0
**Status:** Phase 5 source implemented; external configuration and device validation pending.

This project is the Android client and Node.js backend foundation for Aisyah, powered
by the Nexora AI system.

## Phase 5 includes

- A context engine that keeps private memories separate from approved shared knowledge.
- Semantic retrieval of reviewer-approved shared knowledge, with PostgreSQL full-text fallback.
- Weighted ranking using similarity, private-memory importance and reviewer confidence.
- Conservative potential-conflict flags; the system does not automatically decide which statement is true.
- Separate context sections for private memory, shared knowledge and uncertainty in the model prompt.
- Database migration `005_knowledge_retrieval.sql` and an Indonesian step-by-step install/run guide.

See `docs/PHASE_5_CONTEXT_ENGINE.md` and `docs/INSTALL_AND_RUN_PHASE_5_ID.md`.

## Phase 4 includes

- Explicit memory proposals from opt-in wording; no inferred fact is saved without user approval.
- Pending proposal review in chat and the Android Memory screen.
- Per-user normalized SHA-256 deduplication, deterministic importance scoring, and optional expiry.
- Expired or unapproved memories are excluded from semantic retrieval.
- User-submitted shared knowledge remains pending until an allowlisted reviewer approves it.
- Reviewer decisions are audited; reviewer Firebase UIDs are configured only on the backend.

See `docs/PHASE_4_MEMORY_GOVERNANCE.md` for migration, API and reviewer setup.

## Phase 3 includes

- Server-side persistent conversations and message history.
- User-scoped conversation list, retrieval, and deletion.
- Private memory CRUD (review, add, edit, delete) in Android.
- Optional OpenAI-compatible embedding endpoint and pgvector semantic retrieval.
- Relevant private memories are passed to the model as contextual data, never as system instructions.
- Chat history is loaded from PostgreSQL; client-supplied history and user IDs are no longer trusted.
- Memory retrieval is best-effort; chat remains available when embedding service is not configured.

## Phase 2 includes

- Google sign-in through Firebase Authentication.
- Firebase auth-state gate and sign-out.
- Fresh Firebase ID token on every protected API request.
- Backend Firebase ID token verification with revocation checking.
- Server-side internal user provisioning keyed by Firebase UID.
- `GET /v1/me` profile endpoint.
- Internal UUID ownership for chat requests.
- PostgreSQL row-level security context helper using transaction-local identity.
- Unit tests for auth middleware and transaction commit/rollback behavior.

## Prerequisites

- Flutter stable SDK and Android toolchain
- Node.js 20+
- PostgreSQL with pgvector
- Firebase project with Google sign-in enabled
- Firebase Admin credentials on the backend server
- Ollama or another OpenAI-compatible local model endpoint (optional)
- Cloud model API credentials (optional fallback)

## Configure Android Firebase

```bash
cd apps/android
flutter create . --platforms=android
dart pub global activate flutterfire_cli
flutterfire configure --platforms=android
flutter pub get
flutter analyze
flutter test
```

`flutterfire configure` generates `lib/firebase_options.dart`; it is not included in
this generic source package because it is specific to the Firebase project.

In Firebase Console:
1. Register the Android application using its exact application ID.
2. Enable Authentication → Sign-in method → Google.
3. Add SHA-1 and SHA-256 fingerprints for debug/release signing keys.
4. Configure OAuth consent and authorized project settings as required.

## Configure backend

```bash
cd backend
cp ../.env.example .env
npm install
npm run check
npm test
npm run dev
```

Configure `DATABASE_URL`, server-side Firebase Admin credentials, and (optionally) `NEXORA_KNOWLEDGE_REVIEWER_UIDS` with trusted Firebase UIDs. For semantic memory, configure `EMBEDDING_BASE_URL`, `EMBEDDING_MODEL`, and matching `EMBEDDING_DIMENSIONS`. The default schema expects 768 dimensions; verify the selected model actually returns 768 values. Ollama-compatible example: `nomic-embed-text`. Never include
service-account credentials or model provider keys in the APK.

## Database

For a new database, apply `database/schema.sql`, then migrations `002_identity_and_rls.sql`, `003_conversation_memory.sql`, `004_memory_governance.sql`, and `005_knowledge_retrieval.sql` in order (the base schema already includes the Phase 2/3 tables and RLS).

For an existing Phase 1 database, apply migrations in order: `database/migrations/002_identity_and_rls.sql`, `database/migrations/003_conversation_memory.sql`, then `database/migrations/004_memory_governance.sql`, and finally `database/migrations/005_knowledge_retrieval.sql`. Back up production data before migration 004 because it computes hashes and consolidates exact duplicate memories.

Use a dedicated runtime database role that does not own the tables and does not have
superuser or `BYPASSRLS` privileges. Run cross-user RLS integration tests before
production.

## Run Android

```bash
flutter run --dart-define=NEXORA_API_BASE_URL=http://10.0.2.2:3000
```

For a physical Android phone, use the development computer's LAN IP. Use HTTPS for
non-local environments.

## Phase 5 install guide

Follow `docs/INSTALL_AND_RUN_PHASE_5_ID.md` in order. It covers PostgreSQL migrations, backend setup, Firebase, Ollama/embedding, Android run and troubleshooting.

## Honest validation status

Firebase project configuration, database migrations, full backend test execution, Flutter
compilation, and APK generation are still pending. This archive contains source code
and setup instructions, not a verified installable APK.
