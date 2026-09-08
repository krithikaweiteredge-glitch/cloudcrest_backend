/**
 * Removes the fixtures left behind by `test-document-checklist.ts` — the
 * throwaway applicant accounts (doc_checklist_* / co_demo_*), their
 * registrations, and the attached test files.
 *
 *   npm run db:cleanup-checklist-test
 */
import { pool } from "../config/db.js";

const PATTERNS = ["doc\\_checklist\\_%@example.com", "co\\_demo\\_%@example.com"];

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: victims } = await client.query(
      `SELECT id, email FROM users WHERE ${PATTERNS.map((_, i) => `email LIKE $${i + 1}`).join(" OR ")}`,
      PATTERNS
    );

    if (victims.length === 0) {
      await client.query("ROLLBACK");
      console.log("Nothing to clean up.");
      return;
    }

    const ids = victims.map((v) => v.id);
    const { rowCount: docs } = await client.query(
      `DELETE FROM request_documents WHERE user_id = ANY($1::bigint[])`,
      [ids]
    );
    const { rowCount: requests } = await client.query(
      `DELETE FROM service_requests WHERE user_id = ANY($1::bigint[])`,
      [ids]
    );
    const { rowCount: users } = await client.query(
      `DELETE FROM users WHERE id = ANY($1::bigint[])`,
      [ids]
    );

    await client.query("COMMIT");
    console.log(`✅ Removed ${users} test account(s), ${requests} registration(s), ${docs} document(s).`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  await pool.end();
}

main().catch((err) => {
  console.error("⚠️ cleanup failed:", err);
  process.exit(1);
});
