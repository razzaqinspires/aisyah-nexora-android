-- PostgreSQL + pgvector base schema.
-- Run as a migration role. The runtime role must not own these tables and must not
-- be a superuser or have BYPASSRLS.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid TEXT NOT NULL UNIQUE,
  email TEXT,
  display_name TEXT,
  photo_url TEXT,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Percakapan baru',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  provider TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS private_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(768),
  source TEXT NOT NULL DEFAULT 'conversation',
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shared_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding vector(768),
  source TEXT NOT NULL,
  reviewed_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((approved_at IS NULL) OR (reviewed_by IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_app_users_firebase_uid ON app_users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user_created ON messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_private_memories_user ON private_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_private_memories_embedding_cosine
  ON private_memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_memories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conversations_user_isolation ON conversations;
CREATE POLICY conversations_user_isolation ON conversations
  USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
  WITH CHECK (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

DROP POLICY IF EXISTS messages_user_isolation ON messages;
CREATE POLICY messages_user_isolation ON messages
  USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
  WITH CHECK (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

DROP POLICY IF EXISTS private_memories_user_isolation ON private_memories;
CREATE POLICY private_memories_user_isolation ON private_memories
  USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
  WITH CHECK (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

-- Production hardening:
-- 1. Use a dedicated runtime role that does not own tables and lacks BYPASSRLS.
-- 2. Do not grant runtime access to app_users beyond required SELECT/INSERT/UPDATE.
-- 3. Consider FORCE ROW LEVEL SECURITY after validating migration/admin workflows.
