import { getPool } from '../db/pool.js';
import { withUserTransaction } from '../db/with-user-transaction.js';
import { toVectorLiteral } from '../services/embedding.js';
import { memoryContentHash } from '../services/memory-governance.js';

export async function createMemoryProposal({ userId, content, conversationId }, pool = getPool()) {
  return withUserTransaction(pool, userId, async (client) => {
    const existing = await client.query(
      `SELECT id, content, status, created_at FROM memory_proposals
       WHERE user_id = $1 AND lower(regexp_replace(trim(content), '\\s+', ' ', 'g')) = lower(regexp_replace(trim($2), '\\s+', ' ', 'g'))
         AND status = 'pending' LIMIT 1`, [userId, content]);
    if (existing.rowCount) return existing.rows[0];
    const result = await client.query(
      `INSERT INTO memory_proposals (user_id, content, conversation_id)
       VALUES ($1, $2, $3) RETURNING id, content, status, created_at`,
      [userId, content, conversationId ?? null]);
    return result.rows[0];
  });
}

export async function getMemoryProposal(userId, proposalId, pool = getPool()) {
  return withUserTransaction(pool, userId, async (client) => {
    const result = await client.query(
      `SELECT id, content, status FROM memory_proposals WHERE id = $1 AND user_id = $2`, [proposalId, userId]);
    return result.rows[0] ?? null;
  });
}

export async function listMemoryProposals(userId, pool = getPool()) {
  return withUserTransaction(pool, userId, async (client) => {
    const result = await client.query(
      `SELECT id, content, status, created_at FROM memory_proposals
       WHERE user_id = $1 AND status = 'pending' ORDER BY created_at DESC LIMIT 50`, [userId]);
    return result.rows;
  });
}

export async function decideMemoryProposal({ userId, proposalId, decision, embedding }, pool = getPool()) {
  return withUserTransaction(pool, userId, async (client) => {
    const proposal = await client.query(
      `SELECT id, content, status FROM memory_proposals
       WHERE id = $1 AND user_id = $2 FOR UPDATE`, [proposalId, userId]);
    if (!proposal.rowCount || proposal.rows[0].status !== 'pending') return null;
    const content = proposal.rows[0].content;
    let memory = null;
    if (decision === 'approve') {
      const inserted = await client.query(
        `INSERT INTO private_memories (user_id, content, embedding, source, approved, importance_score, content_hash)
         VALUES ($1, $2, $3::vector, 'conversation', true, 0.65, $4)
         ON CONFLICT (user_id, content_hash) WHERE content_hash IS NOT NULL DO UPDATE
           SET approved = true, updated_at = now()
         RETURNING id, content, source, importance_score, expires_at, created_at, updated_at`,
        [userId, content, embedding ? toVectorLiteral(embedding) : null, memoryContentHash(content)]);
      memory = inserted.rows[0];
    }
    const status = decision === 'approve' ? 'approved' : 'rejected';
    await client.query(
      `UPDATE memory_proposals SET status = $3, decided_at = now() WHERE id = $1 AND user_id = $2`,
      [proposalId, userId, status]);
    return { proposalId, status, memory };
  });
}
