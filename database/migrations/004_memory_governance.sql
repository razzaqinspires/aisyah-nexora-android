BEGIN;

ALTER TABLE private_memories
  ADD COLUMN IF NOT EXISTS content_hash TEXT,
  ADD COLUMN IF NOT EXISTS importance_score NUMERIC(3,2) NOT NULL DEFAULT 0.50,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

UPDATE private_memories
SET content_hash = encode(digest(lower(regexp_replace(trim(content), '\s+', ' ', 'g')), 'sha256'), 'hex')
WHERE content_hash IS NULL;
UPDATE private_memories SET approved = true WHERE source = 'user' AND approved = false;
DELETE FROM private_memories older USING private_memories newer
WHERE older.user_id = newer.user_id AND older.content_hash = newer.content_hash
  AND older.content_hash IS NOT NULL AND (older.created_at < newer.created_at
    OR (older.created_at = newer.created_at AND older.id::text < newer.id::text));
CREATE UNIQUE INDEX IF NOT EXISTS idx_private_memories_user_hash
  ON private_memories(user_id, content_hash) WHERE content_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_private_memories_expiry
  ON private_memories(user_id, expires_at) WHERE expires_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS memory_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 8 AND 500),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_memory_proposals_user_status
  ON memory_proposals(user_id, status, created_at DESC);
ALTER TABLE memory_proposals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS memory_proposals_user_isolation ON memory_proposals;
CREATE POLICY memory_proposals_user_isolation ON memory_proposals
  USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
  WITH CHECK (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

CREATE TABLE IF NOT EXISTS knowledge_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 8 AND 5000),
  source TEXT NOT NULL DEFAULT 'user-submission',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_knowledge_submissions_status
  ON knowledge_submissions(status, created_at);
ALTER TABLE knowledge_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS knowledge_submissions_submitter_isolation ON knowledge_submissions;
CREATE POLICY knowledge_submissions_submitter_isolation ON knowledge_submissions
  USING (submitted_by = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
  WITH CHECK (submitted_by = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

DROP POLICY IF EXISTS knowledge_submissions_reviewer_access ON knowledge_submissions;
CREATE POLICY knowledge_submissions_reviewer_access ON knowledge_submissions
  USING (current_setting('app.is_knowledge_reviewer', true) = 'true')
  WITH CHECK (current_setting('app.is_knowledge_reviewer', true) = 'true');

CREATE TABLE IF NOT EXISTS knowledge_review_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES knowledge_submissions(id) ON DELETE CASCADE,
  reviewer_uid TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
