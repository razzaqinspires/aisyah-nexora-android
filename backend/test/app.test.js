import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
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

const testUser = {
  id: "4a0d7c0e-10a4-4e5e-8b6d-2a31d0e1a001",
  firebaseUid: "firebase-test-user",
  email: "test@example.test",
  displayName: "Test User",
  photoUrl: null,
  emailVerified: true
};

test("health endpoint is public", async () => {
  const app = createApp();
  await withServer(app, async (base) => {
    const response = await fetch(`${base}/health`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.status, "ok");
  });
});

test("chat endpoint rejects unauthenticated requests", async () => {
  const app = createApp({
    authenticate: (_req, res) => res.status(401).json({ error: { code: "AUTH_REQUIRED" } })
  });
  await withServer(app, async (base) => {
    const response = await fetch(`${base}/v1/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "Halo Aisyah" })
    });
    assert.equal(response.status, 401);
  });
});

test("chat endpoint validates message payload", async () => {
  const app = createApp({
    authenticate: (req, _res, next) => { req.user = testUser; next(); },
    generateReply: async () => ({ answer: "Halo.", provider: "test" })
  });
  await withServer(app, async (base) => {
    const response = await fetch(`${base}/v1/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "" })
    });
    assert.equal(response.status, 400);
  });
});

test("chat response uses internal user id, not client-supplied identity", async () => {
const app = createApp({
  authenticate: (req, _res, next) => {
    req.user = testUser;
    next();
  },

  generateReply: async ({ message, userId }) => {
    assert.equal(message, "Halo");
    assert.equal(userId, testUser.id);
    return {
      answer: "Halo, Arifi.",
      provider: "local"
    };
  },

  // Mock persistence agar tes tidak membutuhkan PostgreSQL.
  conversations: {
    list: async () => [],
    get: async () => null,
    remove: async () => false,
    recent: async () => [],
    append: async () => ({
      conversationId: "9baf6bb0-7f88-4c1b-baad-0cb76e8a0001"
    })
  },

  // Hindari akses database saat menguji identitas.
  retrieve: async () => ({
    memories: [],
    sharedKnowledge: [],
    potentialConflicts: []
  }),

  embed: async () => null
});
  await withServer(app, async (base) => {
    const response = await fetch(`${base}/v1/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "Halo", userId: "attacker-selected-user" })
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.assistant, "Aisyah");
    assert.equal(body.model, "Nexora");
    assert.equal(body.answer, "Halo, Arifi.");
  });
});

test("profile endpoint returns provisioned internal account", async () => {
  const app = createApp({
    authenticate: (req, _res, next) => { req.user = testUser; next(); }
  });
  await withServer(app, async (base) => {
    const response = await fetch(`${base}/v1/me`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.user.id, testUser.id);
    assert.equal(body.user.firebaseUid, testUser.firebaseUid);
  });
});

test('chat persists exchange and returns server-created conversation id', async () => {
  const calls = [];
  const app = createApp({
    authenticate: (req, _res, next) => { req.user = testUser; next(); },
    generateReply: async ({ userId, history, memories }) => {
      assert.equal(userId, testUser.id);
      assert.deepEqual(history, []);
      assert.deepEqual(memories, []);
      return { answer: 'Jawaban tersimpan', provider: 'test' };
    },
    conversations: {
      list: async () => [], get: async () => null, remove: async () => false,
      recent: async () => [],
      append: async (payload) => { calls.push(payload); return { conversationId: '9baf6bb0-7f88-4c1b-baad-0cb76e8a0001' }; },
    },
    memories: { list: async () => [], create: async () => ({}), update: async () => null, remove: async () => false, search: async () => [] },
    embed: async () => null,
  });
  await withServer(app, async (base) => {
    const response = await fetch(`${base}/v1/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: 'Ingat percakapan ini' }) });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.conversationId, '9baf6bb0-7f88-4c1b-baad-0cb76e8a0001');
    assert.equal(calls[0].userId, testUser.id);
    assert.equal(calls[0].assistantMessage, 'Jawaban tersimpan');
  });
});

test('memory endpoints always use authenticated internal user id', async () => {
  let owner;
  const app = createApp({
    authenticate: (req, _res, next) => { req.user = testUser; next(); },
    memories: {
      list: async (userId) => { owner = userId; return []; },
      create: async (payload) => { owner = payload.userId; return { id: 'memory-1', content: payload.content }; },
      update: async () => null, remove: async () => false, search: async () => [],
    },
    embed: async () => null,
  });
  await withServer(app, async (base) => {
    const response = await fetch(`${base}/v1/memories`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content: 'Preferensi bahasa Indonesia', userId: 'attacker' }) });
    assert.equal(response.status, 201);
    assert.equal(owner, testUser.id);
  });
});

test('chat creates a pending proposal but does not auto-save an inferred fact', async () => {
  let proposed;
  const app = createApp({
    authenticate: (req, _res, next) => { req.user = testUser; next(); },
    generateReply: async () => ({ answer: 'Baik, saya bisa mengajukannya untuk disimpan.', provider: 'test' }),
    conversations: {
      list: async () => [], get: async () => null, remove: async () => false, recent: async () => [],
      append: async () => ({ conversationId: '9baf6bb0-7f88-4c1b-baad-0cb76e8a0001' }),
    },
    memories: { list: async () => [], create: async () => ({}), update: async () => null, remove: async () => false, search: async () => [] },
    memoryProposals: {
      create: async (payload) => { proposed = payload; return { id: 'proposal-1', content: payload.content, status: 'pending' }; },
      list: async () => [], decide: async () => null,
    },
    embed: async () => null,
  });
  await withServer(app, async (base) => {
    const response = await fetch(`${base}/v1/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: 'Tolong ingat bahwa saya suka jawaban ringkas.' }) });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(proposed.content, 'saya suka jawaban ringkas');
    assert.equal(body.memoryProposal.status, 'pending');
  });
});

test('shared knowledge reviewer endpoints reject ordinary users', async () => {
  const app = createApp({ authenticate: (req, _res, next) => { req.user = testUser; next(); } });
  await withServer(app, async (base) => {
    const response = await fetch(`${base}/v1/admin/knowledge-submissions`, { headers: { authorization: 'Bearer test' } });
    assert.equal(response.status, 403);
  });
});


test('chat forwards separately ranked private and shared context to the model', async () => {
  let captured;
  const app = createApp({
    authenticate: (req, _res, next) => { req.user = testUser; next(); },
    embed: async () => [0.2],
    retrieve: async ({ userId, query }) => {
      assert.equal(userId, testUser.id);
      assert.equal(query, 'Apa yang kamu ketahui?');
      return {
        memories: [{ content: 'Preferensi pribadi', sourceType: 'private_memory' }],
        sharedKnowledge: [{ content: 'Dokumentasi publik', sourceType: 'approved_shared_knowledge' }],
        potentialConflicts: [],
      };
    },
    generateReply: async (payload) => { captured = payload; return { answer: 'Jawaban kontekstual', provider: 'test' }; },
    conversations: {
      list: async () => [], get: async () => null, remove: async () => false, recent: async () => [],
      append: async () => ({ conversationId: '9baf6bb0-7f88-4c1b-baad-0cb76e8a0001' }),
    },
    memories: { list: async () => [], create: async () => ({}), update: async () => null, remove: async () => false, search: async () => [] },
    memoryProposals: { create: async () => null, list: async () => [], decide: async () => null },
  });
  await withServer(app, async (base) => {
    const response = await fetch(`${base}/v1/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: 'Apa yang kamu ketahui?' }) });
    assert.equal(response.status, 200);
    assert.equal(captured.memories[0].sourceType, 'private_memory');
    assert.equal(captured.sharedKnowledge[0].sourceType, 'approved_shared_knowledge');
  });
});
