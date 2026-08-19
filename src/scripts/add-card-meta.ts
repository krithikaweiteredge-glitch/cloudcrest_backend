/**
 * Adds the home-card presentation columns (timeline_days, documents_count) to the
 * services table and backfills them from the values that used to be hardcoded in
 * the frontend (landing-hero's TIMELINE map), so existing cards keep their numbers.
 *
 * Idempotent: ADD COLUMN IF NOT EXISTS, and the backfill only fills rows that are
 * still NULL — so it never overwrites a value an admin has since edited.
 *
 *   npx tsx src/scripts/add-card-meta.ts
 */
import { pool } from "../config/db.js";

// The old hardcoded TIMELINE (frontend/src/components/landing-hero.tsx).
const TIMELINE: Record<string, { days: string; docs: number }> = {
  company: { days: "7–10 Days", docs: 15 },
  llp: { days: "5–7 Days", docs: 10 },
  partnership: { days: "5–7 Days", docs: 7 },
  huf: { days: "2–3 Days", docs: 5 },
  gst: { days: "3–7 Days", docs: 6 },
  "pan-tan": { days: "2–5 Days", docs: 4 },
  msme: { days: "1–3 Days", docs: 4 },
  iec: { days: "3–5 Days", docs: 5 },
  dpiit: { days: "7–14 Days", docs: 6 },
  "labour-licence": { days: "7–15 Days", docs: 6 },
  epf: { days: "3–7 Days", docs: 5 },
  esi: { days: "3–7 Days", docs: 5 },
  "shop-establishment": { days: "5–10 Days", docs: 5 },
  "trade-licence": { days: "7–15 Days", docs: 6 },
  "fire-noc": { days: "10–20 Days", docs: 6 },
  fssai: { days: "7–15 Days", docs: 6 },
  "pollution-ncb": { days: "15–30 Days", docs: 7 },
  "drug-licence": { days: "10–20 Days", docs: 8 },
  trademark: { days: "2–4 Days", docs: 4 },
  patent: { days: "5–10 Days", docs: 6 },
  copyright: { days: "3–7 Days", docs: 4 },
  design: { days: "5–10 Days", docs: 5 },
};

async function main() {
  await pool.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS timeline_days varchar(60)`);
  await pool.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS documents_count integer`);
  console.log("Columns ensured: timeline_days, documents_count");

  let filled = 0;
  for (const [slug, tl] of Object.entries(TIMELINE)) {
    // Only fill rows still NULL so admin edits are never clobbered.
    const res = await pool.query(
      `UPDATE services SET timeline_days = COALESCE(timeline_days, $1),
                          documents_count = COALESCE(documents_count, $2)
        WHERE slug = $3 AND (timeline_days IS NULL OR documents_count IS NULL)`,
      [tl.days, tl.docs, slug],
    );
    if (res.rowCount && res.rowCount > 0) filled += res.rowCount;
  }
  console.log(`Backfilled ${filled} rows from the old TIMELINE map.`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => pool.end());
