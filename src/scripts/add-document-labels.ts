/**
 * Idempotent migration that adds `request_documents.doc_label` — the exact
 * required-document heading a file was uploaded against.
 *
 * Before this column existed the heading was only encoded in the file name as
 * "Heading :: filename", and the UI had to guess which checklist row an upload
 * satisfied with fuzzy keyword matching. That mismatched: a file could be shown
 * against the wrong requirement, or a requirement could read "Uploaded" because
 * some unrelated file happened to be attached. The label is now stored on the
 * row and matched by identity.
 *
 * Safe to run repeatedly: the ADD COLUMN is guarded and the backfill only
 * touches rows whose label is still null.
 *
 *   Run from the backend dir:  npm run db:add-doc-labels
 */
import { pool } from "../config/db.js";

const SQL = `
ALTER TABLE "request_documents" ADD COLUMN IF NOT EXISTS "doc_label" varchar(512);
UPDATE "request_documents"
   SET "doc_label" = btrim(split_part("name", ' :: ', 1))
 WHERE "doc_label" IS NULL
   AND "name" LIKE '% :: %';
`;

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(SQL);
    const { rows } = await client.query(
      `SELECT count(*)::int AS labelled FROM "request_documents" WHERE "doc_label" IS NOT NULL`
    );
    await client.query("COMMIT");
    console.log(`✅ request_documents.doc_label ready — ${rows[0].labelled} row(s) carry a checklist label.`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  await pool.end();
}

main().catch((err) => {
  console.error("⚠️ add-document-labels failed:", err);
  process.exit(1);
});
