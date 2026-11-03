import { createApp } from "./app.js";
import { config } from "./config.js";

const app = createApp();
const server = app.listen(config.port, "0.0.0.0", () => {
  console.log(`Nexora API listening on port ${config.port}`);
});

async function shutdown(signal) {
  console.log(`Received ${signal}; shutting down.`);
  server.close(async () => {
    const { closePool } = await import("./db/pool.js");
    try {
      await closePool();
    } finally {
      process.exit(0);
    }
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
