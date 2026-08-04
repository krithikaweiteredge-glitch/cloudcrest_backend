// One-off backfill: move the Company Registration entity-type rules (suffix, min
// directors/shareholders, nominee, card tags, "popular") out of the frontend and
// into the DB, so the catalog is the single source of truth and admins can edit
// them. Writes services.wizardRules for each company variant ONLY when it is
// currently empty — any row an admin has already customised is left untouched.
// Safe to run more than once.
import { db } from "../config/db.js";
import { services } from "../models/schema.js";
import { eq } from "drizzle-orm";
import { COMPANY_WIZARD_DEFAULTS } from "../config/companyWizardDefaults.js";

async function run() {
  let filled = 0;
  let skipped = 0;
  let missing = 0;

  for (const [slug, rules] of Object.entries(COMPANY_WIZARD_DEFAULTS)) {
    const [row] = await db
      .select({ id: services.id, slug: services.slug, wizardRules: services.wizardRules })
      .from(services)
      .where(eq(services.slug, slug))
      .limit(1);

    if (!row) {
      console.log(`  missing  ${slug} — no such service, skipping`);
      missing++;
      continue;
    }

    const hasRules = !!row.wizardRules && row.wizardRules.trim() !== "" && row.wizardRules.trim() !== "{}";
    if (hasRules) {
      console.log(`  skip     ${slug} — already has wizardRules (admin-customised)`);
      skipped++;
      continue;
    }

    await db
      .update(services)
      .set({ wizardRules: JSON.stringify(rules) })
      .where(eq(services.id, row.id));
    console.log(`  filled   ${slug} — ${JSON.stringify(rules)}`);
    filled++;
  }

  console.log(`\n✅ Done. filled=${filled} skipped=${skipped} missing=${missing}`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  });
