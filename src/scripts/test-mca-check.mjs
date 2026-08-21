/**
 * Smoke-test the MCA registry index: for each sample name, strip the legal
 * suffix, normalize to the brand key, and look it up in mca_companies — the
 * same logic the /api/mca/name-check endpoint uses. Prints whether the brand is
 * taken and a couple of example rows.
 *
 *   node src/scripts/test-mca-check.mjs "Weiter Edge Technologies Private Limited" "Zxqwplkj Ventures LLP"
 */
import "dotenv/config";
import pg from "pg";

const SUFFIX = /\b(private limited|pvt\.?\s*ltd\.?|limited liability partnership|limited|ltd\.?|llp|opc|one person company|producer company|nidhi(?:\s+limited)?|section\s*8|foundation|trust|association|society|l\.l\.c\.?|l\.l\.p\.?|inc\.?|incorporated|corporation|corp\.?|co\.?)\b/gi;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const core = (s) => norm(s.replace(SUFFIX, " ").replace(/\s+/g, " ").trim());

const names = process.argv.slice(2);
if (!names.length) names.push("Reliance Industries Limited", "Zzxqwplkjv Nonexistent Ventures Private Limited");

const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  const [{ n }] = (await client.query("select count(*)::int n from mca_companies")).rows;
  console.log(`Index rows: ${n.toLocaleString()}\n`);
  for (const name of names) {
    const key = core(name) || norm(name);
    const t = Date.now();
    const { rows } = await client.query(
      "select name, kind, klass, identifier from mca_companies where core_norm=$1 limit 3",
      [key],
    );
    const ms = Date.now() - t;
    console.log(`"${name}"  [brand key: ${key}]`);
    console.log(`  -> ${rows.length ? "TAKEN" : "AVAILABLE"}  (${ms}ms)`);
    for (const r of rows) console.log(`     • ${r.name}  (${r.kind}/${r.klass}${r.identifier ? ", " + r.identifier : ""})`);
    console.log();
  }
} finally {
  await client.end();
}
