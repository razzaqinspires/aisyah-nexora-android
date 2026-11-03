# Phase 4 — Memory Quality & Learning Governance

Version: 0.4.0

## Private memory suggestions

- The chat API only creates a pending proposal for explicit phrases such as “ingat bahwa”, “simpan sebagai memori”, or “catat”.
- A proposal is never a memory until the account owner approves it.
- Sensitive-looking content is conservatively excluded from automatic proposals. This heuristic is not a complete sensitive-data classifier; users should still review every proposal.
- The Android chat flow asks for approval immediately. The Memory screen also lists pending proposals so a dismissed prompt can be handled later.
- Approval promotes the proposal into the same user's private memory; rejection only records the decision.

## Deduplication, importance and expiry

- Memory content is normalized with Unicode NFKC, lower-casing and whitespace folding, then SHA-256 hashed.
- A unique `(user_id, content_hash)` index prevents duplicate private memories per account.
- Editing a memory into an existing duplicate merges it into the existing entry rather than creating a duplicate.
- Importance scoring is a deterministic heuristic from 0.50 to 1.00, not an AI confidence score.
- Users may choose no expiry, 30 days, 90 days, or one year in Android. The API accepts 1–3650 days.
- Expired memories are excluded from semantic retrieval. Expired rows are retained for audit/recovery until explicitly deleted; a future maintenance job may purge them under a documented retention policy.
- Semantic retrieval only uses approved, non-expired memories.

## Shared knowledge governance

- A user can submit general information for review from the Memory screen.
- Submissions remain pending and are not visible to model retrieval until a reviewer approves them.
- Reviewers are configured by Firebase UID in `NEXORA_KNOWLEDGE_REVIEWER_UIDS` (comma-separated server-side environment variable).
- Only allowlisted reviewers can list and decide submissions through `/v1/admin/knowledge-submissions`.
- Approval writes a row to `shared_knowledge` and records reviewer UID, timestamp and decision in `knowledge_review_audit`.
- Rejection does not add content to shared knowledge.
- Shared knowledge is not automatically injected into prompts in this phase; the approval workflow establishes governance before a future retrieval integration.

## API additions

- `GET /v1/memory-proposals`
- `POST /v1/memory-proposals/:id/decision` with `{ "decision": "approve" | "reject" }`
- `POST /v1/knowledge-submissions` with `{ "content": "..." }`
- `GET /v1/admin/knowledge-submissions` (reviewer only)
- `POST /v1/admin/knowledge-submissions/:id/decision` with `{ "decision": "approve" | "reject" }` (reviewer only)
- `POST/PATCH /v1/memories` accepts optional `expiresInDays` (null or omitted means no expiry)

## Migration

Apply after migrations 002 and 003:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/004_memory_governance.sql
```

The migration computes hashes for existing memories and removes exact normalized duplicates, keeping the newest row, before creating the unique index. Review a database backup before applying it to production.

## Reviewer configuration

```env
NEXORA_KNOWLEDGE_REVIEWER_UIDS=firebase-uid-1,firebase-uid-2
```

This setting is backend-only. Never put reviewer allowlists, Firebase Admin credentials, database credentials or model keys in the APK. A reviewer must still authenticate with Firebase; the backend checks the verified Firebase UID and applies a transaction-local reviewer RLS context.

## Phase 4 validation limits

Node syntax checks and pure memory-governance unit tests can run without a database. Full API tests require backend dependencies. PostgreSQL migration/RLS tests, Firebase reviewer tests, Flutter analyze/build, and Android device tests require the configured external services and toolchains. Do not treat this source archive as a production-validated release or APK.
