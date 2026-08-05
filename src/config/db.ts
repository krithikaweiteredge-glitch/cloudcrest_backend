import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env } from "./env.js";

const connectionString = env.databaseUrl;
const isLocal = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

// Create connection pool.
//
// Managed serverless Postgres (Neon) auto-suspends when idle and silently drops
// idle connections. Against a bare pool that shows up as `ETIMEDOUT` on cold-start
// (the compute is waking, ~several seconds) and "Connection terminated
// unexpectedly" when a killed idle connection is reused. The options below make
// those transient events self-heal instead of surfacing as query failures:
//   - keepAlive           : TCP keepalive so dead sockets are detected/replaced.
//   - idleTimeoutMillis   : recycle our own idle clients before Neon kills them.
//   - connectionTimeoutMillis : bounded wait that still covers a cold start,
//                           instead of hanging on the OS TCP timeout.
//   - max                 : modest cap, friendly to the Neon pooler endpoint.
export const pool = new pg.Pool({
  connectionString,
  // Managed Postgres (Neon/Supabase) requires TLS; local doesn't. rejectUnauthorized
  // stays false only because these providers use certs the default bundle may not
  // carry — the connection is still encrypted.
  ssl: isLocal ? false : { rejectUnauthorized: false },
  ...(isLocal
    ? {}
    : {
        max: 10,
        keepAlive: true,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 15_000,
      }),
});

// An error on an *idle* client (e.g. Neon dropping a suspended connection) is
// emitted on the pool, not on any awaited query. Without this handler Node treats
// it as an unhandled 'error' event and crashes the process. Logging and moving on
// lets the pool discard the dead client and hand out a fresh one on the next call.
pool.on("error", (err) => {
  console.error("Idle Postgres client error (connection will be recycled):", err.message);
});

export const db = drizzle(pool);
