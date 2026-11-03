import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { createFirebaseAuthMiddleware } from "../src/services/firebase-auth.js";
import { upsertUserFromFirebase } from "../src/repositories/user-repository.js";
import { withUserTransaction } from "../src/db/with-user-transaction.js";
import { createApp } from "../src/app.js";

async function withServer(app, fn) {
  const server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  try {
    await fn(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, "close");
  }
}

test("Firebase middleware verifies token and provisions internal identity", async () => {
  let provisionedUid;
  const middleware = createFirebaseAuthMiddleware({
    authFactory: () => ({
      verifyIdToken: async (token, checkRevoked) => {
        assert.equal(token, "valid-token");
        assert.equal(checkRevoked, true);
        return {
          uid: "firebase-user-1",
          email: "user@example.test",
          name: "Test User",
          email_verified: true
        };
      }
    }),
    userProvisioner: async (decoded) => {
      provisionedUid = decoded.uid;
      return {
        id: "4a0d7c0e-10a4-4e5e-8b6d-2a31d0e1a001",
        firebase_uid: decoded.uid,
        email: decoded.email,
        display_name: decoded.name,
        email_verified: decoded.email_verified
      };
    }
  });

  const app = createApp({
    authenticate: middleware,
    generateReply: async () => ({ answer: "ok", provider: "test" })
  });

  await withServer(app, async (base) => {
    const response = await fetch(`${base}/v1/me`, {
      headers: { authorization: "Bearer valid-token" }
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(provisionedUid, "firebase-user-1");
    assert.equal(body.user.firebaseUid, "firebase-user-1");
    assert.equal(body.user.id, "4a0d7c0e-10a4-4e5e-8b6d-2a31d0e1a001");
    assert.equal(body.user.emailVerified, true);
  });
});

test("Firebase middleware rejects invalid token", async () => {
  const middleware = createFirebaseAuthMiddleware({
    authFactory: () => ({
      verifyIdToken: async () => {
        const error = new Error("invalid");
        error.code = "auth/invalid-id-token";
        throw error;
      }
    }),
    userProvisioner: async () => {
      throw new Error("must not provision invalid identity");
    }
  });

  const app = createApp({ authenticate: middleware });
  await withServer(app, async (base) => {
    const response = await fetch(`${base}/v1/me`, {
      headers: { authorization: "Bearer invalid-token" }
    });
    assert.equal(response.status, 401);
  });
});

test("user transaction sets transaction-local identity and commits", async () => {
  const statements = [];
  const client = {
    query: async (sql, values) => {
      statements.push({ sql, values });
      return { rows: [] };
    },
    release: () => statements.push({ sql: "RELEASE" })
  };
  const pool = { connect: async () => client };
  const result = await withUserTransaction(
    pool,
    "4a0d7c0e-10a4-4e5e-8b6d-2a31d0e1a001",
    async (tx) => {
      statements.push({ sql: "CALLBACK" });
      return "done";
    }
  );

  assert.equal(result, "done");
  assert.equal(statements[0].sql, "BEGIN");
  assert.match(statements[1].sql, /set_config\('app.current_user_id'/);
  assert.equal(statements[1].values[0], "4a0d7c0e-10a4-4e5e-8b6d-2a31d0e1a001");
  assert.equal(statements.at(-2).sql, "COMMIT");
  assert.equal(statements.at(-1).sql, "RELEASE");
});

test("user transaction rolls back when callback fails", async () => {
  const statements = [];
  const client = {
    query: async (sql) => { statements.push(sql); return { rows: [] }; },
    release: () => statements.push("RELEASE")
  };
  const pool = { connect: async () => client };

  await assert.rejects(
    withUserTransaction(
      pool,
      "4a0d7c0e-10a4-4e5e-8b6d-2a31d0e1a001",
      async () => { throw new Error("forced failure"); }
    ),
    /forced failure/
  );
  assert.ok(statements.includes("ROLLBACK"));
  assert.equal(statements.at(-1), "RELEASE");
});

test("user transaction rejects malformed internal user id", async () => {
  let connected = false;
  const pool = { connect: async () => { connected = true; throw new Error("unexpected"); } };
  await assert.rejects(withUserTransaction(pool, "firebase-uid-not-uuid", async () => null), /UUID/);
  assert.equal(connected, false);
});


test("Firebase user upsert uses verified claims as parameterized values", async () => {
  let captured;
  const fakePool = {
    query: async (sql, values) => {
      captured = { sql, values };
      return { rows: [{ id: "4a0d7c0e-10a4-4e5e-8b6d-2a31d0e1a001" }] };
    }
  };
  const result = await upsertUserFromFirebase({
    uid: "firebase-uid",
    email: "a@example.test",
    name: "Aisyah Test",
    picture: "https://example.test/avatar.png",
    email_verified: true
  }, fakePool);

  assert.equal(result.id, "4a0d7c0e-10a4-4e5e-8b6d-2a31d0e1a001");
  assert.match(captured.sql, /ON CONFLICT \(firebase_uid\)/);
  assert.deepEqual(captured.values, [
    "firebase-uid",
    "a@example.test",
    "Aisyah Test",
    "https://example.test/avatar.png",
    true
  ]);
  assert.equal(captured.sql.includes("firebase-uid"), false);
});
