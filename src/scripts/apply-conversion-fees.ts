/**
 * Writes the "Fee for conversions" pricing into the Business Conversion catalog
 * rows: the fixed fee lines (Professional Fee, Newspaper Advertisement Cost,
 * GST) and the ROC forms, from `config/conversionCatalog.ts`. The government
 * fee is not written — the backend computes it per application
 * (`config/conversionFees.ts`).
 *
 * Unlike backfill-conversions, this REPLACES the rows' existing fee lines and
 * form numbers — it is how a new price list from the client is rolled out. Only
 * conversions with a computed government fee are touched, so Proprietorship →
 * Pvt keeps its own pricing.
 *
 * DRY RUN BY DEFAULT. `backend/.env` points at the live database:
 *
 *   npm run db:apply:conversion-fees                 # preview
 *   npm run db:apply:conversion-fees -- --apply      # write
 */
import { db, pool } from "../config/db.js";
import { services } from "../models/schema.js";
import { eq } from "drizzle-orm";
import { CONVERSION_CATALOG } from "../config/conversionCatalog.js";
import { CONVERSION_GOVT_FEES } from "../config/conversionFees.js";

const describe = (lines: { label: string; amount: number }[]) =>
  lines.map((l) => `${l.label} ₹${l.amount}`).join(", ") || "(none)";

async function run() {
  const apply = process.argv.slice(2).includes("--apply");
  console.log(apply ? "APPLYING changes.\n" : "DRY RUN — nothing will be written. Pass --apply to write.\n");

  let touched = 0;
  let missing = 0;

  for (const slug of Object.keys(CONVERSION_GOVT_FEES)) {
    const entry = CONVERSION_CATALOG[slug];
    if (!entry?.feeLines?.length) {
      console.log(`  skipped   ${slug} — no fee lines in conversionCatalog.ts`);
      continue;
    }

    const [row] = await db
      .select({ id: services.id, feeLines: services.feeLines, formNo: services.formNo })
      .from(services)
      .where(eq(services.slug, slug))
      .limit(1);
    if (!row) {
      console.log(`  missing   ${slug} — no such service in the catalog.`);
      missing++;
      continue;
    }

    let current: { label: string; amount: number }[] = [];
    try {
      const parsed = row.feeLines ? JSON.parse(row.feeLines) : [];
      if (Array.isArray(parsed)) current = parsed;
    } catch {
      /* shown as (none) */
    }

    const professional = entry.feeLines.find((l) => /professional/i.test(l.label))?.amount ?? 0;
    console.log(`  ${apply ? "updated  " : "would set"} ${slug}`);
    console.log(`      fee lines: ${describe(current)}  →  ${describe(entry.feeLines)}`);
    console.log(`      form no:   ${row.formNo || "(none)"}  →  ${entry.formNo}`);
    touched++;

    if (!apply) continue;
    await db
      .update(services)
      .set({
        feeLines: JSON.stringify(entry.feeLines),
        // The admin list shows this column as the service's price.
        professionalFee: professional.toFixed(2),
        formNo: entry.formNo,
      })
      .where(eq(services.id, row.id));
  }

  console.log(`\n${apply ? "✅ Done" : "Preview complete"}. ${apply ? "updated" : "would update"}=${touched} missing=${missing}`);
}

run()
  .catch((err) => {
    console.error("Conversion fee update failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
