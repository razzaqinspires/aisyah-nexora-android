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
    authenticate: (req, _res, next) => { req.user = { uid: "test-user" }; next(); },
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

test("chat response identifies Aisyah persona and Nexora model", async () => {
  const app = createApp({
    authenticate: (req, _res, next) => { req.user = { uid: "test-user" }; next(); },
    generateReply: async ({ message, userId }) => {
      assert.equal(message, "Halo");
      assert.equal(userId, "test-user");
      return { answer: "Halo, Arifi.", provider: "local" };
    }
  });
  await withServer(app, async (base) => {
    const response = await fetch(`${base}/v1/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "Halo" })
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.assistant, "Aisyah");
    assert.equal(body.model, "Nexora");
    assert.equal(body.answer, "Halo, Arifi.");
  });
});
