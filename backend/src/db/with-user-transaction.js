const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function withUserTransaction(pool, userId, callback) {
  if (typeof userId !== "string" || !UUID_RE.test(userId)) {
    throw new TypeError("A valid internal user UUID is required.");
  }

  const client = await pool.connect();
  let transactionOpen = false;

  try {
    await client.query("BEGIN");
    transactionOpen = true;

    // SET LOCAL scope ends automatically at COMMIT/ROLLBACK, preventing pooled
    // connections from leaking one user's identity into the next request.
    await client.query(
      "SELECT set_config('app.current_user_id', $1, true)",
      [userId],
    );

    const result = await callback(client);
    await client.query("COMMIT");
    transactionOpen = false;
    return result;
  } catch (error) {
    if (transactionOpen) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Preserve the original failure.
      }
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function withKnowledgeReviewerTransaction(pool, userId, callback) {
  if (typeof userId !== 'string' || !UUID_RE.test(userId)) {
    throw new TypeError('A valid internal reviewer UUID is required.');
  }
  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query('BEGIN');
    transactionOpen = true;
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [userId]);
    await client.query("SELECT set_config('app.is_knowledge_reviewer', 'true', true)");
    const result = await callback(client);
    await client.query('COMMIT');
    transactionOpen = false;
    return result;
  } catch (error) {
    if (transactionOpen) { try { await client.query('ROLLBACK'); } catch {} }
    throw error;
  } finally { client.release(); }
}
