# Phase 5 — Knowledge Retrieval & Cognitive Context Engine

## Scope

Phase 5 connects three separate context sources to each authenticated chat request:

1. **Private memories** — retrieved only for the authenticated internal user ID, subject to approval and expiry rules from Phase 4.
2. **Approved shared knowledge** — globally readable reference material only when `approved_at IS NOT NULL`; pending submissions are never retrieved.
3. **Conversation history** — the current user's recent conversation, still loaded through the ownership-scoped repository.

The context engine ranks private memories using semantic similarity and importance. Approved shared knowledge is ranked using semantic similarity plus reviewer confidence. If the embedding endpoint is unavailable, shared knowledge can still be retrieved with PostgreSQL full-text search; private vector-memory retrieval is skipped. Chat itself continues without retrieval if context search fails.

## Conflict handling

A conservative heuristic flags pairs that share most meaningful terms but differ in a small negation vocabulary (for example, `mendukung` versus `tidak mendukung`). This is only a **potential conflict signal**, not an automated truth decision. The model is instructed to explain uncertainty rather than silently choose one statement. It can miss paraphrased conflicts and can produce false positives; reviewer adjudication remains necessary.

## Database migration

Back up the database, then run:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/005_knowledge_retrieval.sql
```

The migration adds a normalized content hash, confidence score and knowledge type to `shared_knowledge`, consolidates exact normalized duplicates, and creates vector and full-text indexes. The base schema already defines `shared_knowledge.embedding` as `vector(768)`.

Configure an embedding provider that returns exactly 768 dimensions. The same embedding model and dimension must be used for private memories, approved shared knowledge and chat queries. Changing embedding models later requires a planned re-embedding migration; do not mix incompatible vector spaces.

## Approval and indexing

When a reviewer approves a submission, the backend attempts to create its embedding and stores it with the approved shared-knowledge record. If no embedding provider is configured, the record is still approved and can be found using full-text search. Duplicate normalized content is not inserted twice.

## Retrieval API behavior

No new public endpoint exposes raw global knowledge. Retrieval is performed inside `/v1/chat`, after Firebase authentication. The response does not expose private memory IDs or other users' context. `shared_knowledge` is read only when approved; user-private memory search always receives `req.user.id` from verified server identity.

## Validation

Run:

```bash
cd backend
npm run check
node --test test/context-engine.test.js
npm test
```

Then validate with a real PostgreSQL instance and two different Firebase test accounts. Confirm that a memory saved by account A never appears in account B's prompt. Also confirm that pending shared-knowledge submissions are not retrieved and approved entries are retrievable by vector search or text fallback.

## Limitations

- The heuristic conflict detector is deliberately conservative and is not a fact-checker.
- Search quality depends on the embedding model and corpus quality.
- The code does not autonomously train or fine-tune a model.
- Full integration, load, security and Android device tests must be completed in the target environment before production use.
