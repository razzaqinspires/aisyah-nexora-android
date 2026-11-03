# Architecture decisions

| ID | Decision | Status |
|---|---|---|
| ADR-001 | Aisyah is the assistant persona; Nexora is the AI model/system | Accepted |
| ADR-002 | Android first; one Flutter app for initial release | Accepted |
| ADR-003 | Node.js backend | Accepted |
| ADR-004 | PostgreSQL + pgvector for data and retrieval | Accepted |
| ADR-005 | Google authentication with per-user isolation | Accepted / Phase 2 source implemented |
| ADR-006 | Local inference first where compatible; cloud fallback | Accepted direction |
| ADR-007 | Private RAG separated from approved shared knowledge | Accepted |
| ADR-008 | Fine-tuning is scheduled, evaluated, and never auto-published | Accepted |
| ADR-009 | No secrets in source, app binaries, memory, or handoff archives | Mandatory |
| ADR-010 | Conversation history and private memories are user-scoped; memory is manually curated before it enters private RAG | Accepted |
| ADR-011 | Embeddings are optional; chat must degrade gracefully when embedding service is unavailable | Accepted |
