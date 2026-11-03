BEGIN;

ALTER TABLE private_memories
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_private_memories_embedding_cosine
  ON private_memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- RLS policies from migration 002 remain enabled. No memory is copied to shared_knowledge.
COMMIT;
