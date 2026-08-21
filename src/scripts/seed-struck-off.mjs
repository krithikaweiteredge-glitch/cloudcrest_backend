/**
 * Load the MCA struck-off companies + LLPs index into Postgres.
 *
 *   node src/scripts/seed-struck-off.mjs <path-to-struck_off_lean.csv>
 *
 * CSV columns (COPY order): identifier, name, kind, month, core_norm
 * Small dataset (~72k rows) — a single COPY is fine. Drops & recreates the table.
 */
import "dotenv/config";
import fs from "node:fs";
import { pipeline } from "node:stream/promises";
import pg from "pg";
import { from as copyFrom } from "pg-copy-streams";

const csvPath = process.argv[2];
if (!csvPath || !fs.existsSync(csvPath)) {
  console.error("Usage: node src/scripts/seed-struck-off.mjs <path-to-struck_off_lean.csv>");
  process.exit(1);
}

const connectionString = (process.env.DATABASE_URL || "").replace("-pooler.", ".");
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
client.on("error", (e) => console.error("client error:", e.message));

const t0 = Date.now();
await client.connect();
try {
  console.log("Recreating table mca_struck_off …");
  await client.query("DROP TABLE IF EXISTS mca_struck_off;");
  await client.query(`
    CREATE TABLE mca_struck_off (
      id         bigserial PRIMARY KEY,
      identifier varchar(40),
      name       text NOT NULL,
      kind       varchar(10) NOT NULL,
      month      varchar(30),
      core_norm  varchar(255) NOT NULL
    );
  `);
  await client.query("CREATE INDEX mca_struck_off_core_norm_idx ON mca_struck_off (core_norm);");

  console.log("COPYing rows …");
  const ingest = client.query(
    copyFrom("COPY mca_struck_off (identifier,name,kind,month,core_norm) FROM STDIN WITH (FORMAT csv)"),
  );
  await pipeline(fs.createReadStream(csvPath), ingest);
  await client.query("ANALYZE mca_struck_off;");

  const [{ count }] = (await client.query("SELECT count(*)::int AS count FROM mca_struck_off;")).rows;
  const [{ size }] = (await client.query("SELECT pg_size_pretty(pg_total_relation_size('mca_struck_off')) AS size;")).rows;
  const [{ db }] = (await client.query("SELECT pg_size_pretty(pg_database_size(current_database())) AS db;")).rows;
  console.log(`Rows: ${count.toLocaleString()} | Table: ${size} | Database total: ${db} | ${((Date.now() - t0) / 1000).toFixed(1)}s`);
} catch (e) {
  console.error("Load failed:", e.message || e);
  process.exitCode = 1;
} finally {
  await client.end();
}
