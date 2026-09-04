import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env } from "./env.js";

/**
 * `sslmode` in the URL has to go before we hand the string to pg.
 *
 * node-postgres parses `sslmode` out of the connection string and lets it
 * override the `ssl` option object below. `sslmode=require` therefore turns into
 * a strict chain verification, which Neon survives (its certificate chains to a
 * public CA) but Aiven does not — Aiven presents a self-signed CA, so the
 * connection dies with SELF_SIGNED_CERT_IN_CHAIN before a query is ever sent.
 *
 * Stripping it lets the explicit `ssl` option decide, which is the behaviour the
 * code already documents and intends. The connection is still TLS-encrypted;
 * it just isn't chain-verified — the same trade-off `rejectUnauthorized: false`
 * was already making for Neon and Supabase.
 */
const stripSslMode = (url: string) =>
  url.replace(/([?&])sslmode=[^&]*&?/, "$1").replace(/[?&]$/, "");

const connectionString = stripSslMode(env.databaseUrl);
const isLocal = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
// Explicit override for a self-hosted Postgres reached by Docker service name
// (e.g. `@postgres:5432`), which isn't "localhost" but still speaks plain TCP.
// Set DATABASE_SSL=false to force TLS off; otherwise behaviour is unchanged.
const disableSsl = process.env.DATABASE_SSL === "false" || isLocal;

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
  ssl: disableSsl ? false : { rejectUnauthorized: false },
  ...(disableSsl
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
