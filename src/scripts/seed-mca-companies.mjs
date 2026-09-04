/**
 * Bulk-load the MCA company registry index into Postgres via chunked COPY.
 *
 * Reads a headerless CSV whose columns are, in order:
 *   identifier, name, kind, klass, company_type, reg_date, core_norm
 * (produced by the year-wise MCA parser + project_lean.py).
 *
 * Usage:
 *   node src/scripts/seed-mca-companies.mjs <path-to-lean-csv>
 *
 * Why chunked: the target is a managed Neon instance with a hard 512 MB cluster
 * cap that counts transient WAL. One 300 MB COPY (or a post-load index build)
 * generates enough WAL in a single transaction to momentarily blow the cap and
 * get the connection reset. So we:
 *   - connect to the DIRECT (non-pooled) endpoint — the pooler mishandles large
 *     COPY streams,
 *   - create the index up-front, then COPY in ~150k-row chunks, each its own
 *     autocommit transaction, so WAL stays small and Neon reclaims it between
 *     chunks.
 * Idempotent: drops and recreates the table first. Safe to re-run.
 */
import "dotenv/config";
import fs from "node:fs";
import readline from "node:readline";
import pg from "pg";
import { from as copyFrom } from "pg-copy-streams";

const csvPath = process.argv[2];
if (!csvPath || !fs.existsSync(csvPath)) {
  console.error("Usage: node src/scripts/seed-mca-companies.mjs <path-to-lean-csv>");
  process.exit(1);
}

// Prefer the direct endpoint for bulk load (strip Neon's "-pooler" token; a
// no-op for a self-hosted or local server).
// node-postgres lets `sslmode` in the URL override the `ssl` option below, so a
// self-signed provider CA (Aiven) fails with SELF_SIGNED_CERT_IN_CHAIN. Strip it
// and let the explicit option decide. Mirrors stripSslMode() in src/config/db.ts.
const stripSslMode = (u) => u.replace(/([?&])sslmode=[^&]*&?/, "$1").replace(/[?&]$/, "");

const connectionString = stripSslMode((process.env.DATABASE_URL || "").replace("-pooler.", "."));

/**
 * Pacing controls. Defaults reproduce the original Neon behaviour exactly.
 *
 * A provider with a small WAL budget needs a gentler load than Neon does. Aiven's
 * smallest plan runs `max_wal_size = 49MB`; firing 150k-row COPYs back to back at
 * it generates write-ahead log faster than the server can checkpoint it away, the
 * disk fills with log, and the service protects itself by flipping to read-only
 * mid-load. Nothing is corrupted — it recovers once WAL is reclaimed — but the
 * load dies. Smaller chunks with a pause between them keep WAL inside the budget.
 *
 *   MCA_CHUNK=25000 MCA_PAUSE_MS=750 MCA_TRUNCATE=1 node seed-mca-companies.mjs <csv>
 */
const CHUNK = Number(process.env.MCA_CHUNK || 150_000);
const PAUSE_MS = Number(process.env.MCA_PAUSE_MS || 0);
/**
 * TRUNCATE instead of DROP + CREATE. Dropping a large table and rebuilding it
 * churns far more than emptying one in place, which matters when the disk is
 * tight. Falls back to creating the table when it doesn't exist yet.
 */
const USE_TRUNCATE = process.env.MCA_TRUNCATE === "1";
/** Abort if the database grows past this (MB). 0 disables the guard. */
const MAX_DB_MB = Number(process.env.MCA_MAX_DB_MB || 0);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Local/self-hosted Postgres speaks plain TCP — forcing TLS at it fails the
// handshake. Mirrors the detection in src/config/db.ts.
const isLocal = /(?:localhost|127\.0\.0\.1)/.test(connectionString);
const useSsl = !(process.env.DATABASE_SSL === "false" || isLocal);

const client = new pg.Client({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});
client.on("error", (e) => console.error("client error:", e.message));

/** COPY one buffer of CSV lines as a single transaction. */
function copyChunk(lines) {
  return new Promise((resolve, reject) => {
    const stream = client.query(copyFrom("COPY mca_companies (identifier,name,kind,klass,company_type,reg_date,core_norm) FROM STDIN WITH (FORMAT csv)"));
    stream.on("error", reject);
    stream.on("finish", resolve);
    stream.write(lines.join("\n") + "\n");
    stream.end();
  });
}

const t0 = Date.now();
await client.connect();
try {
  const exists = (
    await client.query("select to_regclass('public.mca_companies') is not null as ok")
  ).rows[0].ok;

  if (USE_TRUNCATE && exists) {
    console.log("Emptying table mca_companies (TRUNCATE) …");
    await client.query("TRUNCATE TABLE mca_companies;");
  } else {
  console.log("Recreating table mca_companies …");
  await client.query("DROP TABLE IF EXISTS mca_companies;");
  await client.query(`
    CREATE TABLE mca_companies (
      id           bigserial PRIMARY KEY,
      identifier   varchar(40),
      name         text NOT NULL,
      kind         varchar(10) NOT NULL,
      klass        varchar(60),
      company_type varchar(80),
      reg_date     varchar(40),
      core_norm    varchar(255) NOT NULL
    );
  `);
  // Build the index up-front so it is maintained incrementally per chunk,
  // avoiding a single large index-build WAL spike at the end.
  await client.query("CREATE INDEX mca_companies_core_norm_idx ON mca_companies (core_norm);");
  }

  console.log(
    `COPYing in chunks of ${CHUNK.toLocaleString()}` +
      (PAUSE_MS ? ` with a ${PAUSE_MS}ms pause between chunks` : "") +
      (MAX_DB_MB ? ` (abort above ${MAX_DB_MB} MB)` : "") +
      " …"
  );
  const rl = readline.createInterface({ input: fs.createReadStream(csvPath), crlfDelay: Infinity });
  let buf = [];
  let total = 0;
  for await (const line of rl) {
    if (!line) continue;
    buf.push(line);
    if (buf.length >= CHUNK) {
      await copyChunk(buf);
      total += buf.length;
      buf = [];

      // Report actual database size periodically — on a tight plan this is the
      // number that decides whether the load finishes, so it belongs in the log
      // rather than only in a summary that a failed run never reaches.
      if (total % (CHUNK * 10) === 0 || MAX_DB_MB) {
        const { rows } = await client.query(
          "select pg_database_size(current_database())/1024/1024 as mb"
        );
        const mb = Number(rows[0].mb);
        console.log(`  loaded ${total.toLocaleString()} rows — db ${mb} MB`);
        if (MAX_DB_MB && mb > MAX_DB_MB) {
          throw new Error(
            `database reached ${mb} MB, above the ${MAX_DB_MB} MB guard — stopping before the provider does`
          );
        }
      } else {
        process.stdout.write(`  loaded ${total.toLocaleString()} rows\r`);
      }

      // Give the server room to checkpoint and recycle WAL before the next burst.
      if (PAUSE_MS) await sleep(PAUSE_MS);
    }
  }
  if (buf.length) {
    await copyChunk(buf);
    total += buf.length;
  }
  console.log(`\n  loaded ${total.toLocaleString()} rows total`);

  await client.query("ANALYZE mca_companies;");
  const [{ count }] = (await client.query("SELECT count(*)::int AS count FROM mca_companies;")).rows;
  const [{ size }] = (await client.query("SELECT pg_size_pretty(pg_total_relation_size('mca_companies')) AS size;")).rows;
  const [{ db }] = (await client.query("SELECT pg_size_pretty(pg_database_size(current_database())) AS db;")).rows;
  console.log(`Rows: ${count.toLocaleString()} | Table: ${size} | Database total: ${db}`);
  console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
} catch (e) {
  console.error("Load failed:", e.message || e);
  process.exitCode = 1;
} finally {
  await client.end();
}
