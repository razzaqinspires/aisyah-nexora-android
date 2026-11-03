# Changelog

## 0.5.0 — Phase 5: Knowledge Retrieval & Cognitive Context Engine

- Added a context engine that retrieves private memories and reviewer-approved shared knowledge as separate context channels.
- Added semantic retrieval for approved shared knowledge and PostgreSQL full-text fallback when embeddings are not configured.
- Shared-knowledge approvals now attempt to store embeddings and normalized content hashes; exact normalized duplicates are not inserted twice.
- Added weighted ranking using semantic similarity, private-memory importance and reviewer confidence.
- Added conservative potential-conflict detection based on shared terms and opposite-polarity markers; conflicts are surfaced as uncertainty, not automatically resolved.
- Chat model receives private memories, approved shared knowledge and potential conflict warnings in distinct prompt sections.
- Added migration `005_knowledge_retrieval.sql`, retrieval tests, and step-by-step Indonesian installation/run guide.
- Validation is source-level only until dependencies, PostgreSQL, Firebase, embedding provider and Android toolchain are configured.

## 0.4.0 — Phase 4: Memory Governance

- Added explicit memory proposals, user approval, expiry, deduplication and reviewer governance for shared knowledge.
