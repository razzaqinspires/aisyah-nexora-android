import { getPool } from '../db/pool.js';
import { withUserTransaction } from '../db/with-user-transaction.js';
import { toVectorLiteral } from '../services/embedding.js';
import { memoryContentHash } from '../services/memory-governance.js';

export async function listMemories(userId, pool = getPool()) {
  return withUserTransaction(pool, userId, async (client) => {
    const result = await client.query(
      `SELECT id, content, source, importance_score, expires_at, approved, created_at, updated_at FROM private_memories
       WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 200`, [userId]);
    return result.rows;
  });
}

export async function createMemory({ userId, content, embedding, source = 'user', importanceScore = 0.5, expiresAt = null }, pool = getPool()) {
  return withUserTransaction(pool, userId, async (client) => {
    const hash = memoryContentHash(content);
    const result = await client.query(
      `INSERT INTO private_memories (user_id, content, embedding, source, approved, content_hash, importance_score, expires_at)
       VALUES ($1, $2, $3::vector, $4, true, $5, $6, $7)
       ON CONFLICT (user_id, content_hash) WHERE content_hash IS NOT NULL DO UPDATE
         SET content = EXCLUDED.content, embedding = COALESCE(EXCLUDED.embedding, private_memories.embedding),
             approved = true, importance_score = GREATEST(private_memories.importance_score, EXCLUDED.importance_score),
             expires_at = EXCLUDED.expires_at, updated_at = now()
       RETURNING id, content, source, importance_score, expires_at, created_at, updated_at`,
      [userId, content, embedding ? toVectorLiteral(embedding) : null, source, hash, importanceScore, expiresAt]);
    return result.rows[0];
  });
}

export async function updateMemory({ userId, memoryId, content, embedding, expiresAt = null }, pool = getPool()) {
  return withUserTransaction(pool, userId, async (client) => {
    const hash = memoryContentHash(content);
    const duplicate = await client.query(
      `SELECT id FROM private_memories WHERE user_id = $1 AND content_hash = $2 AND id <> $3 LIMIT 1`,
      [userId, hash, memoryId]);
    if (duplicate.rowCount) {
      await client.query('DELETE FROM private_memories WHERE id = $1 AND user_id = $2', [memoryId, userId]);
      const existing = await client.query(
        `UPDATE private_memories SET expires_at = $3, updated_at = now() WHERE id = $1 AND user_id = $2
         RETURNING id, content, source, importance_score, expires_at, created_at, updated_at`,
        [duplicate.rows[0].id, userId, expiresAt]);
      return existing.rows[0] ?? null;
    }
    const result = await client.query(
      `UPDATE private_memories SET content = $3, embedding = $4::vector, content_hash = $5,
         expires_at = $6, updated_at = now()
       WHERE id = $1 AND user_id = $2
       RETURNING id, content, source, importance_score, expires_at, created_at, updated_at`,
      [memoryId, userId, content, embedding ? toVectorLiteral(embedding) : null, hash, expiresAt]);
    return result.rows[0] ?? null;
  });
}

export async function deleteMemory(userId, memoryId, pool = getPool()) {
  return withUserTransaction(pool, userId, async (client) => {
    const result = await client.query(
      'DELETE FROM private_memories WHERE id = $1 AND user_id = $2 RETURNING id',
      [memoryId, userId]);
    return result.rowCount > 0;
  });
}

export async function searchMemories({ userId, embedding, limit = 5 }, pool = getPool()) {
  if (!embedding) return [];
  return withUserTransaction(pool, userId, async (client) => {
    const result = await client.query(
      `SELECT id, content, importance_score, 1 - (embedding <=> $2::vector) AS similarity
       FROM private_memories WHERE user_id = $1 AND approved = true AND (expires_at IS NULL OR expires_at > now()) AND embedding IS NOT NULL
       ORDER BY embedding <=> $2::vector LIMIT $3`,
      [userId, toVectorLiteral(embedding), limit]);
    return result.rows.filter((row) => Number(row.similarity) >= 0.35);
  });
}
