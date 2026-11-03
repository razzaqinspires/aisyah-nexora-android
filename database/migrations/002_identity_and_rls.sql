BEGIN;

ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Ensure the Firebase UID is unique before using it as the identity upsert key.
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_users_firebase_uid
  ON app_users(firebase_uid);

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

COMMIT;
