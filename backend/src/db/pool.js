import pg from "pg";
import { config } from "../config.js";

const { Pool } = pg;
let pool;

export function getPool() {
  if (pool) return pool;
  if (!config.databaseUrl) {
    const error = new Error("DATABASE_NOT_CONFIGURED");
    error.code = "DATABASE_NOT_CONFIGURED";
    throw error;
  }
  pool = new Pool({
    connectionString: config.databaseUrl,
    max: config.databasePoolMax,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    application_name: "aisyah-nexora-api",
  });
  pool.on("error", () => {
    // Do not log connection strings or credentials.
  });
  return pool;
}

export async function closePool() {
  if (!pool) return;
  const current = pool;
  pool = undefined;
  await current.end();
}
