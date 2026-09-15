/**
 * Sets up the state-wise Labour Licence rows from `config/labourCatalog.ts`
 * (the client's "Labour license" document):
 *
 *   - creates `labour-licence-telangana` / `-andhra-pradesh` / `-karnataka` when
 *     missing — inactive, in `labour-licence`'s subcategory, so they nest under
 *     it in Admin → Services and stay out of the sidebar (as the entity
 *     registrations' state rows do);
 *   - fee_lines (+ professional_fee, as the admin editor saves it) — REPLACED,
 *     since this is the client's price list;
 *   - document_types — inserted only when the row has none, so an admin-curated
 *     checklist is never duplicated or replaced.
 *
 * The government fee is not written — the backend computes it per application
 * from the state and head count (`config/labourFees.ts`).
 *
 * DRY RUN BY DEFAULT. `backend/.env` points at the live database:
 *
 *   npm run db:backfill:labour-licence                 # preview
 *   npm run db:backfill:labour-licence -- --apply      # write
 */
import { db, pool } from "../config/db.js";
import { services, documentTypes } from "../models/schema.js";
import { eq } from "drizzle-orm";
import { LABOUR_BASE_SLUG, LABOUR_CATALOG } from "../config/labourCatalog.js";

const describe = (lines: { label: string; amount: number }[]) =>
  lines.map((l) => `${l.label} ₹${l.amount}`).join(", ") || "(none)";

async function run() {
  const apply = process.argv.slice(2).includes("--apply");
  console.log(apply ? "APPLYING changes.\n" : "DRY RUN — nothing will be written. Pass --apply to write.\n");

  const [base] = await db.select().from(services).where(eq(services.slug, LABOUR_BASE_SLUG)).limit(1);
  if (!base) {
    console.error(`No "${LABOUR_BASE_SLUG}" service in the catalog — run db:seed:catalog first.`);
    process.exitCode = 1;
    return;
  }

  let touched = 0;
  for (const [slug, entry] of Object.entries(LABOUR_CATALOG)) {
    let [row] = await db.select().from(services).where(eq(services.slug, slug)).limit(1);
    const plan: string[] = [];

    if (!row) {
      plan.push(`create inactive state row "${entry.state}" under ${LABOUR_BASE_SLUG}`);
      if (apply) {
        [row] = await db
          .insert(services)
          .values({
            subcategoryId: base.subcategoryId,
            name: entry.state,
            shortTitle: `Labour Licence · ${entry.state}`,
            slug,
            authority: base.authority,
            formNo: base.formNo,
            icon: base.icon,
            active: false,
            professionalFee: "0",
            govtFee: "0",
            gstPercent: "0",
          })
          .returning();
      }
    }

    let current: { label: string; amount: number }[] = [];
    try {
      const parsed = row?.feeLines ? JSON.parse(row.feeLines) : [];
      if (Array.isArray(parsed)) current = parsed;
    } catch {
      /* shown as (none) */
    }
    plan.push(`fee lines: ${describe(current)}  →  ${describe(entry.feeLines)}`);

    const existingDocs = row
      ? await db.select({ id: documentTypes.id }).from(documentTypes).where(eq(documentTypes.serviceId, row.id))
      : [];
    const insertDocs = existingDocs.length === 0;
    plan.push(insertDocs ? `${entry.documents.length} documents` : `documents kept — ${existingDocs.length} already authored`);

    console.log(`  ${apply ? "updated  " : "would set"} ${slug}`);
    for (const p of plan) console.log(`      ${p}`);
    touched++;

    if (!apply || !row) continue;
    await db
      .update(services)
      .set({
        feeLines: JSON.stringify(entry.feeLines),
        // The admin list shows this column as the service's price.
        professionalFee: (entry.feeLines.find((l) => /professional/i.test(l.label))?.amount ?? 0).toFixed(2),
        ...(insertDocs ? { documentsCount: entry.documents.length } : {}),
      })
      .where(eq(services.id, row.id));
    if (insertDocs) {
      await db
        .insert(documentTypes)
        // The Memorandum is required of companies only.
        .values(entry.documents.map((name) => ({ serviceId: row!.id, name, mandatory: !/companies only/i.test(name) })));
    }
  }

  console.log(`\n${apply ? "✅ Done" : "Preview complete"}. ${apply ? "updated" : "would update"}=${touched}`);
}

run()
  .catch((err) => {
    console.error("Labour licence backfill failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
