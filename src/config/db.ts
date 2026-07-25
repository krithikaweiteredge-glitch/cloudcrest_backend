import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env } from "./env.js";

const connectionString = env.databaseUrl;
const isLocal = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

// Create connection pool
export const pool = new pg.Pool({
  connectionString,
  // Managed Postgres (Neon/Supabase) requires TLS; local doesn't. rejectUnauthorized
  // stays false only because these providers use certs the default bundle may not
  // carry — the connection is still encrypted.
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

export const db = drizzle(pool);
