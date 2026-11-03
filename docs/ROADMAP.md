# Roadmap

## Phase A — Android shell and backend foundation
- [x] Create initial Flutter chat shell
- [x] Create Node.js health and chat API skeleton
- [x] Add Firebase ID-token verification boundary
- [x] Add local-first/cloud-fallback model router interface
- [x] Add initial PostgreSQL schema and RLS policies
- [ ] Configure Firebase project and Google sign-in
- [ ] Compile and run Android debug build
- [ ] Run backend tests in target environment

## Phase B — Account and data isolation
- [ ] Google sign-in UI
- [ ] Firebase token refresh and secure storage
- [ ] Firebase UID to internal user mapping
- [ ] Database transaction wrapper with SET LOCAL app.current_user_id
- [ ] Cross-user isolation integration tests

## Phase C — Chat and memory
- [ ] Conversation CRUD
- [ ] Message persistence
- [ ] Embedding generation and pgvector retrieval
- [ ] Private RAG with user-level filters
- [ ] Memory review/edit/delete controls
- [ ] Explicit approval workflow for shared knowledge

## Phase D — Nexora inference
- [ ] Verify target local model availability and hardware compatibility
- [ ] Provider health checks and circuit breaker
- [ ] Cloud fallback configuration
- [ ] Streaming responses
- [ ] Token/cost limits and request audit metadata

## Phase E — Voice and embodiment preparation
- [ ] Speech-to-text
- [ ] Text-to-speech
- [ ] Voice conversation mode
- [ ] Camera/vision integration
- [ ] Robot communication abstraction
