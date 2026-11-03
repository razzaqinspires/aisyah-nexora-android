import { getPool } from '../db/pool.js';
import { toVectorLiteral } from '../services/embedding.js';

// Shared knowledge is globally readable only after an explicit reviewer approval.
// No user-private data is written to or queried from this table.
export async function searchSharedKnowledge({ embedding = null, query, limit = 5 }, pool = getPool()) {
  const vector = embedding ? toVectorLiteral(embedding) : null;
  const result = await pool.query(
    `SELECT id, content, source, confidence_score,
       CASE
         WHEN $1::vector IS NOT NULL AND embedding IS NOT NULL THEN 1 - (embedding <=> $1::vector)
         ELSE ts_rank(to_tsvector('simple', content), plainto_tsquery('simple', $2))
       END AS similarity
     FROM shared_knowledge
     WHERE approved_at IS NOT NULL
       AND ((embedding IS NOT NULL AND $1::vector IS NOT NULL)
         OR to_tsvector('simple', content) @@ plainto_tsquery('simple', $2))
     ORDER BY
       CASE WHEN $1::vector IS NOT NULL AND embedding IS NOT NULL THEN embedding <=> $1::vector ELSE 1 END ASC,
       ts_rank(to_tsvector('simple', content), plainto_tsquery('simple', $2)) DESC
     LIMIT $3`,
    [vector, query, limit],
  );
  const minimumScore = embedding ? 0.35 : 0.01;
  return result.rows.filter((row) => Number(row.similarity) >= minimumScore);
}
