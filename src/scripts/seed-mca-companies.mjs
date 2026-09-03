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
const connectionString = (process.env.DATABASE_URL || "").replace("-pooler.", ".");
const CHUNK = 150_000;

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

  console.log(`COPYing in chunks of ${CHUNK.toLocaleString()} …`);
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
      process.stdout.write(`  loaded ${total.toLocaleString()} rows\r`);
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
