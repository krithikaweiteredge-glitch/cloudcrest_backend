/**
 * One-off, idempotent migration that brings the `notifications` table in line
 * with the Drizzle model the app code uses (`src/models/schema/notifications.ts`).
 *
 * Background: inserts fail ("Failed to deliver notification" / broadcast /
 * status-change) because the deployed table drifted from the model — most
 * importantly `is_read` is a boolean while the code writes the string "false",
 * and `type` / `link_url` / `created_at` may be missing with a NOT NULL
 * `user_id`. Reads still work (SELECT tolerates the boolean), which is why the
 * bell shows notifications but sending them errors.
 *
 * Safe to run multiple times: every step is guarded (ADD COLUMN IF NOT EXISTS,
 * DROP NOT NULL is a no-op when already nullable, and the is_read conversion
 * only runs while the column is still boolean).
 *
 *   Run from the backend dir:  npm run db:fix-notifications
 */
import { pool } from "../config/db.js";

const SQL = `
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "type" varchar(50) DEFAULT 'broadcast' NOT NULL;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "link_url" varchar(550);
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
ALTER TABLE "notifications" ALTER COLUMN "user_id" DROP NOT NULL;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications'
      AND column_name = 'is_read'
      AND data_type = 'boolean'
  ) THEN
    ALTER TABLE "notifications" ALTER COLUMN "is_read" DROP DEFAULT;
    ALTER TABLE "notifications" ALTER COLUMN "is_read" TYPE varchar(10)
      USING (CASE WHEN "is_read" THEN 'true' ELSE 'false' END);
    ALTER TABLE "notifications" ALTER COLUMN "is_read" SET DEFAULT 'false';
    ALTER TABLE "notifications" ALTER COLUMN "is_read" SET NOT NULL;
  END IF;
END $$;
`;

async function main() {
  console.log("Aligning `notifications` table with the app schema…");
  await pool.query(SQL);

  const { rows } = await pool.query(
    `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
      WHERE table_name = 'notifications'
      ORDER BY ordinal_position`,
  );
  console.log("Resulting columns:");
  console.table(rows);

  console.log("Done — notification inserts (deliver, broadcast, status-change) should now work.");
  await pool.end();
}

main().catch((err) => {
  console.error("Alignment failed:", err);
  process.exit(1);
});
