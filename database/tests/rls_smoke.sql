-- Manual RLS smoke test template.
-- Run with psql as the nexora_runtime role, after seeding at least one conversation
-- for each of two users using a privileged migration/test role.
--
-- Example:
-- psql "$DATABASE_URL" -v user_a_id='UUID-A' -v user_b_id='UUID-B' -f rls_smoke.sql
--
-- Expected: other_user_visible_rows = 0.
-- Then, in a separate psql session/transaction as nexora_runtime, try inserting a
-- conversation for user_b while app.current_user_id is user_a. PostgreSQL should
-- reject it with SQLSTATE 42501 (row-level security violation).

BEGIN;
SELECT set_config('app.current_user_id', :'user_a_id', true);

SELECT count(*) AS other_user_visible_rows
FROM conversations
WHERE user_id = :'user_b_id'::uuid;

ROLLBACK;

-- Phase 4: pending memory proposals remain user-scoped.
BEGIN;
SELECT set_config('app.current_user_id', :'user_a_id', true);
SELECT count(*) AS other_user_proposals_visible
FROM memory_proposals WHERE user_id = :'user_b_id'::uuid;
SELECT count(*) AS other_user_knowledge_submissions_visible
FROM knowledge_submissions WHERE submitted_by = :'user_b_id'::uuid;
ROLLBACK;

-- Reviewer-only visibility is granted only inside a server-side reviewer transaction.
-- Never set this GUC from an untrusted client or expose arbitrary SQL execution.
BEGIN;
SELECT set_config('app.current_user_id', :'user_a_id', true);
SELECT set_config('app.is_knowledge_reviewer', 'true', true);
SELECT count(*) AS pending_knowledge_visible_to_reviewer
FROM knowledge_submissions WHERE status = 'pending';
ROLLBACK;
