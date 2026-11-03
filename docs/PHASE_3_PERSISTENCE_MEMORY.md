# Phase 3 — Conversation Persistence & Private Memory

## Data model

- `conversations`: one owner (`user_id`) per conversation.
- `messages`: owner-scoped user/assistant turns, ordered by `created_at`.
- `private_memories`: manually curated facts owned by one account; embeddings are optional.
- `shared_knowledge`: separate review-controlled corpus. Phase 3 does not write to it.

## API contract

All endpoints below require `Authorization: Bearer <Firebase ID token>`. The backend verifies the token and derives the internal PostgreSQL UUID. A client-provided user ID is never accepted as an ownership selector.

| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/conversations` | List current user's recent conversations |
| GET | `/v1/conversations/:id` | Read conversation and messages |
| DELETE | `/v1/conversations/:id` | Delete a conversation and its messages |
| POST | `/v1/chat` | Generate and persist a message exchange; accepts optional `conversationId` |
| GET | `/v1/memories` | List current user's private memories |
| POST | `/v1/memories` | Add a private memory explicitly |
| PATCH | `/v1/memories/:id` | Edit a private memory |
| DELETE | `/v1/memories/:id` | Delete a private memory |

## Embeddings

The backend calls an OpenAI-compatible `/embeddings` endpoint when both `EMBEDDING_BASE_URL` and `EMBEDDING_MODEL` are configured. The current PostgreSQL schema uses `vector(768)`, so the configured model must return exactly 768 numeric dimensions. `nomic-embed-text` is a common Ollama choice, but confirm the model/version and actual response dimension in the deployment environment.

If embedding configuration is absent, chat and manually curated memory storage still work; semantic retrieval is disabled. If embedding retrieval fails for an individual chat request, the request continues without retrieved memories. A malformed or wrong-dimension vector is rejected.

## Memory behavior and safety

- Phase 3 does not infer and silently save personal facts from chat. The user adds or edits memories through the Android memory screen.
- Private memories are only retrieved for the authenticated owner and are supplied as contextual data, not executable instructions.
- Personal memories are not copied to `shared_knowledge` and are not used for model fine-tuning.
- Users can review, edit, and delete private memories. Conversation deletion is separate from memory deletion.
- Treat model output as untrusted text; do not let retrieved memory trigger privileged tools or actions.

## Database migration

For a Phase 2 database, apply `database/migrations/003_conversation_memory.sql` after migration 002. The original `database/schema.sql` includes the Phase 3 `updated_at` field and vector index for fresh installations.

Before production, validate RLS with two real users using a runtime role that is not a table owner, superuser, or `BYPASSRLS`. Verify cross-user read, update, and delete denial. Do not rely on the SQL GUC alone as an authorization boundary.
