# Roadmap

## Phase 1 — Android and Nexora foundation
- [x] Flutter chat shell
- [x] Node.js API skeleton
- [x] Local-first/cloud-fallback model router interface
- [x] PostgreSQL + pgvector initial schema

## Phase 2 — Google Authentication & User Identity
- [x] Firebase/Google sign-in and auth gate source
- [x] Fresh Firebase ID token for protected API requests
- [x] Backend Firebase token verification and internal user provisioning
- [x] `/v1/me` and transaction-local RLS helper
- [ ] Real Firebase, PostgreSQL, RLS and Android device validation

## Phase 3 — Conversation persistence and private memory
- [x] Conversation and message persistence APIs
- [x] User-scoped conversation history
- [x] Private memory CRUD and optional pgvector retrieval
- [x] Android history and memory screens
- [ ] Real database, embedding and Android validation

## Phase 4 — Memory quality and learning governance
- [x] Explicit memory proposals and user approval
- [x] Expiry, normalized deduplication and importance scoring
- [x] Reviewer approval/rejection for shared knowledge with audit trail
- [ ] Apply migration 004 and validate reviewer RLS in PostgreSQL

## Phase 5 — Knowledge Retrieval & Cognitive Context Engine
- [x] Retrieve private memories separately from approved shared knowledge
- [x] Semantic search for approved shared knowledge
- [x] Full-text fallback when embeddings are unavailable
- [x] Weighted context ranking
- [x] Conservative potential-conflict signal and uncertainty-aware model prompt
- [x] Step-by-step Indonesian install/run guide
- [ ] Apply migration 005 to real PostgreSQL
- [ ] Validate vector retrieval, full-text fallback and cross-user isolation
- [ ] Evaluate retrieval precision/recall on a curated test set
- [ ] Run full backend tests, Flutter analyze/build and Android device tests

## Phase 6 — Evaluation & operational hardening (proposed)
- Retrieval benchmark dataset and measurable precision/recall
- Context provenance display and user feedback
- Prompt-injection hardening for retrieved content
- Observability, rate limits, backups and retention controls
- Load and security tests before production
