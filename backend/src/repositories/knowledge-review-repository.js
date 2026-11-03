import { toVectorLiteral } from '../services/embedding.js';
import { getPool } from '../db/pool.js';
import { withUserTransaction, withKnowledgeReviewerTransaction } from '../db/with-user-transaction.js';

export async function submitKnowledge({ userId, content, source = 'user-submission' }, pool = getPool()) {
  return withUserTransaction(pool, userId, async (client) => {
    const result = await client.query(
      `INSERT INTO knowledge_submissions (submitted_by, content, source)
       VALUES ($1, $2, $3) RETURNING id, content, source, status, created_at`,
      [userId, content, source]);
    return result.rows[0];
  });
}

export async function listPendingKnowledge({ reviewerId }, pool = getPool()) {
  return withKnowledgeReviewerTransaction(pool, reviewerId, async (client) => {
    const result = await client.query(
      `SELECT id, content, source, submitted_by, created_at FROM knowledge_submissions
       WHERE status = 'pending' ORDER BY created_at ASC LIMIT 100`);
    return result.rows;
  });
}

export async function decideKnowledge({ submissionId, reviewerId, reviewerUid, decision, embedding = null }, pool = getPool()) {
  return withKnowledgeReviewerTransaction(pool, reviewerId, async (client) => {
    const found = await client.query(
      `SELECT id, content, source, status FROM knowledge_submissions WHERE id = $1 FOR UPDATE`, [submissionId]);
    if (!found.rowCount || found.rows[0].status !== 'pending') return null;
    const item = found.rows[0];
    if (decision === 'approve') {
      await client.query(
        `INSERT INTO shared_knowledge (content, embedding, source, reviewed_by, approved_at, confidence_score, content_hash)
         VALUES ($1, $2::vector, $3, $4, now(), 0.90, encode(digest(lower(regexp_replace(trim($1), '\\s+', ' ', 'g')), 'sha256'), 'hex'))
         ON CONFLICT (content_hash) WHERE content_hash IS NOT NULL DO NOTHING`, [item.content, embedding ? toVectorLiteral(embedding) : null, item.source, reviewerUid]);
    }
    const status = decision === 'approve' ? 'approved' : 'rejected';
    await client.query(
      `UPDATE knowledge_submissions SET status = $2, reviewed_by = $3, reviewed_at = now()
       WHERE id = $1`, [submissionId, status, reviewerUid]);
    await client.query(
      `INSERT INTO knowledge_review_audit (submission_id, reviewer_uid, decision)
       VALUES ($1, $2, $3)`, [submissionId, reviewerUid, status]);
    return { submissionId, status };
  });
}
