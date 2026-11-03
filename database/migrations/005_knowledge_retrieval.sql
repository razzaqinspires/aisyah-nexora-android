BEGIN;

-- Phase 5: approved shared knowledge becomes searchable by vector and text.
-- Existing shared_knowledge.embedding is vector(768) from the base schema.
ALTER TABLE shared_knowledge
  ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(3,2) NOT NULL DEFAULT 0.90,
  ADD COLUMN IF NOT EXISTS content_hash TEXT,
  ADD COLUMN IF NOT EXISTS knowledge_type TEXT NOT NULL DEFAULT 'general';

UPDATE shared_knowledge
SET content_hash = encode(digest(lower(regexp_replace(trim(content), '\s+', ' ', 'g')), 'sha256'), 'hex')
WHERE content_hash IS NULL;

DELETE FROM shared_knowledge older USING shared_knowledge newer
WHERE older.content_hash = newer.content_hash AND older.content_hash IS NOT NULL
  AND (older.created_at < newer.created_at
    OR (older.created_at = newer.created_at AND older.id::text < newer.id::text));

CREATE UNIQUE INDEX IF NOT EXISTS idx_shared_knowledge_content_hash
  ON shared_knowledge(content_hash) WHERE content_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shared_knowledge_approved_at
  ON shared_knowledge(approved_at DESC) WHERE approved_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shared_knowledge_embedding_cosine
  ON shared_knowledge USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50)
  WHERE embedding IS NOT NULL AND approved_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shared_knowledge_content_fts
  ON shared_knowledge USING gin (to_tsvector('simple', content));

COMMIT;
