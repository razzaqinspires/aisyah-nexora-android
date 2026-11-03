# Security and privacy requirements

- Verify Firebase ID tokens on every protected API request.
- Never trust a client-supplied user ID; derive identity from verified token claims.
- Enforce row-level security and test cross-user access denial.
- Use TLS outside local development.
- Store app tokens in Android secure storage.
- Never place cloud API keys in the Android app.
- Redact Authorization headers and secrets from logs.
- Apply rate limits, request-size limits, timeouts, and per-user usage quotas.
- Separate private user memory from reviewed shared knowledge.
- Provide memory export and deletion workflows.
- Do not auto-train or mutate production model weights from live conversations.
- Add explicit consent before using personal conversations in a training dataset.
- For future robot control, keep motor safety interlocks independent from the LLM.
