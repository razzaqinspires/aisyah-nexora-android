# Security and privacy requirements

- Verify Firebase ID tokens on every protected API request with revocation checking.
- Never trust a client-supplied user ID; derive identity from verified token claims.
- Map Firebase UID to an internal UUID on the server.
- Use a dedicated runtime DB role that is not a table owner, superuser, or BYPASSRLS.
- Set RLS identity transaction-locally using `set_config(..., true)`.
- Never use session-level identity settings on pooled database connections.
- Test cross-user isolation against a real PostgreSQL instance before production.
- Use TLS outside local development.
- Never put cloud model keys or Firebase Admin service-account keys in the Android app.
- Redact Authorization headers and secrets from logs.
- Apply rate limits, request-size limits, timeouts, and per-user usage quotas.
- Separate private user memory from reviewed shared knowledge.
- Provide memory export and deletion workflows.
- Do not auto-train or mutate production model weights from live conversations.
- Add explicit consent before using personal conversations in a training dataset.
- For future robot control, keep motor safety interlocks independent from the LLM.


## Phase 3 memory controls

- Only authenticated server-side identity selects the owner for conversation and memory queries.
- Conversation history is fetched from PostgreSQL; the client cannot inject arbitrary history into the model request.
- Private memory creation is explicit through the user's memory controls; automatic extraction is not enabled.
- Users can inspect, edit, and delete private memories. Deleting a conversation does not silently delete separately curated memories.
- Retrieved memory is context only. It must never authorize tool calls, account access, or physical actions.
- Embedding endpoint keys remain on the backend. Never ship them in the Android APK.


## Phase 4 memory governance

- Only explicit opt-in phrases create pending memory proposals; no personal fact is stored until the owner approves it.
- Sensitive-looking content is excluded by a conservative heuristic, but this is not a complete classifier.
- Approved private memories are deduplicated per user with normalized SHA-256 hashes.
- Expired and unapproved memories are excluded from retrieval.
- Shared-knowledge submissions remain pending until a verified Firebase UID on the server-side reviewer allowlist approves them.
- Reviewer decisions are recorded in `knowledge_review_audit`; shared knowledge is never populated by ordinary chat traffic.
- Keep `NEXORA_KNOWLEDGE_REVIEWER_UIDS` server-side only.
