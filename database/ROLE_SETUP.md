# PostgreSQL runtime-role setup

Run these statements as the database owner/migration administrator. Replace the
database and role names to match the deployment. Set the password interactively or
through your secret manager; do not commit it to source control.

```sql
CREATE ROLE nexora_runtime
  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;

GRANT CONNECT ON DATABASE nexora TO nexora_runtime;
GRANT USAGE ON SCHEMA public TO nexora_runtime;

-- User provisioning needs INSERT/UPDATE and SELECT for RETURNING.
GRANT SELECT, INSERT, UPDATE ON TABLE app_users TO nexora_runtime;

-- Tenant-scoped application tables.
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE conversations, messages, private_memories, memory_proposals
  TO nexora_runtime;

-- User submissions and reviewer workflow. RLS controls tenant/reviewer visibility.
GRANT SELECT, INSERT, UPDATE ON TABLE knowledge_submissions TO nexora_runtime;
GRANT INSERT ON TABLE knowledge_review_audit TO nexora_runtime;
GRANT SELECT, INSERT ON TABLE shared_knowledge TO nexora_runtime;
```

The runtime role must not own protected tables and must not have SUPERUSER or
BYPASSRLS. The backend should connect with this role, not the migration owner.

The RLS `app.current_user_id` setting is transaction-local and is defense in depth
for application query scoping. It is not a substitute for parameterized SQL, secure
backend code, and restricted database network access. A compromised backend role
can set session variables; do not expose database credentials to the Android app.

The reviewer workflow requires the Phase 4 migration before granting these table privileges. The backend checks the verified Firebase UID against `NEXORA_KNOWLEDGE_REVIEWER_UIDS` before setting the transaction-local reviewer RLS context. Never expose arbitrary SQL or direct database access to clients.
