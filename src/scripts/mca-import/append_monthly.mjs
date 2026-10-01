/**
 * Additive loader for monthly MCA incorporation / struck-off exports.
 *
 * Unlike `seed-mca-companies.mjs` / `seed-struck-off.mjs` (which DROP/TRUNCATE
 * the whole table — built for a full-dataset reload), this script only ADDS
 * rows: it reads a parsed CSV, skips any row whose `identifier` already exists
 * in the target table, and INSERTs the rest in small batches. Safe to run
 * against the live table with real data in it.
 *
 * Usage:
 *   node append_monthly.mjs companies <parsed.csv>    # full parse_mca.py output (13 cols)
 *   node append_monthly.mjs struckoff <parsed.csv>    # parse_struck_off_monthly.py output (5 cols)
 *
 * `companies` CSV columns (from parse_mca.py):
 *   identifier,name,kind,klass,reg_date,name_norm,core_norm,company_type,
 *   activity_code,activity_desc,state,address,email
 * `struckoff` CSV columns (from parse_struck_off_monthly.py):
 *   identifier,name,kind,month,core_norm
 */
import "dotenv/config";
import fs from "node:fs";
import readline from "node:readline";
import pg from "pg";

/**
 * Minimal RFC-4180 CSV line splitter (no external dependency). Handles quoted
 * fields containing commas/embedded quotes, which the parser's own CSV writer
 * (Python's `csv` module) produces for names like `ACME, INC.`.
 */
function splitCsvLine(line) {
  const out = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      out.push(field);
      field = "";
    } else {
      field += c;
    }
  }
  out.push(field);
  return out;
}

const mode = process.argv[2];
const csvPath = process.argv[3];
if (!["companies", "struckoff"].includes(mode) || !csvPath || !fs.existsSync(csvPath)) {
  console.error("Usage: node append_monthly.mjs <companies|struckoff> <path-to-parsed-csv>");
  process.exit(1);
}

const stripSslMode = (u) => u.replace(/([?&])sslmode=[^&]*&?/, "$1").replace(/[?&]$/, "");
const connectionString = stripSslMode((process.env.DATABASE_URL || "").replace("-pooler.", "."));
const isLocal = /(?:localhost|127\.0\.0\.1)/.test(connectionString);
const useSsl = !(process.env.DATABASE_SSL === "false" || isLocal);

const client = new pg.Client({ connectionString, ssl: useSsl ? { rejectUnauthorized: false } : false });
await client.connect();

// Read every data row.
const rl = readline.createInterface({ input: fs.createReadStream(csvPath), crlfDelay: Infinity });
const rows = [];
for await (const line of rl) {
  if (!line) continue;
  rows.push(splitCsvLine(line));
}
console.log(`Read ${rows.length} rows from ${csvPath}`);

const table = mode === "companies" ? "mca_companies" : "mca_struck_off";

// Dedupe against the live table by identifier, chunked.
const allIds = rows.map((r) => r[0]).filter(Boolean);
const existing = new Set();
const CH = 20000;
for (let i = 0; i < allIds.length; i += CH) {
  const chunk = allIds.slice(i, i + CH);
  const { rows: r } = await client.query(
    `select identifier from ${table} where identifier = ANY($1::text[])`,
    [chunk],
  );
  for (const row of r) existing.add(row.identifier);
}
const fresh = rows.filter((r) => r[0] && !existing.has(r[0]));
console.log(`${existing.size} already present, ${fresh.length} new rows to insert`);

if (fresh.length === 0) {
  console.log("Nothing to insert.");
  await client.end();
  process.exit(0);
}

const BATCH = 500;
let inserted = 0;
for (let i = 0; i < fresh.length; i += BATCH) {
  const batch = fresh.slice(i, i + BATCH);
  let sql, values;
  if (mode === "companies") {
    // identifier,name,kind,klass,reg_date,name_norm,core_norm,company_type,...
    values = [];
    const tuples = batch.map((r, idx) => {
      const [identifier, name, kind, klass, regDate, , coreNorm, companyType] = r;
      const base = idx * 7;
      values.push(identifier || null, name, kind, klass || null, companyType || null, regDate || null, coreNorm);
      return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7})`;
    });
    sql = `insert into mca_companies (identifier,name,kind,klass,company_type,reg_date,core_norm) values ${tuples.join(",")}`;
  } else {
    values = [];
    const tuples = batch.map((r, idx) => {
      const [identifier, name, kind, month, coreNorm] = r;
      const base = idx * 5;
      values.push(identifier || null, name, kind, month || null, coreNorm);
      return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5})`;
    });
    sql = `insert into mca_struck_off (identifier,name,kind,month,core_norm) values ${tuples.join(",")}`;
  }
  await client.query(sql, values);
  inserted += batch.length;
  if (inserted % 5000 === 0 || inserted === fresh.length) {
    console.log(`  inserted ${inserted}/${fresh.length}`);
  }
}

const size = await client.query("select pg_size_pretty(pg_database_size(current_database())) as s");
console.log("Done. DB size now:", size.rows[0].s);

await client.end();
