/**
 * Replaces the `dpiit` catalog row's Documents and price with the content in
 * `config/dpiitCatalog.ts` (the client's "DPIIT CHANGES.docx").
 *
 * Unlike most backfills in this codebase, the `dpiit` row is NOT empty: it
 * already carries a 5-item generic checklist from the original seed and a
 * ₹10,000 + ₹1,800 GST price (both `professionalFee`/`gstPercent` and
 * `feeLines` are set). The client reviewed this document and confirmed it
 * supersedes both, so this script writes them unconditionally under --apply —
 * the same as `backfill-icegate.ts`.
 *
 * About / Who can Apply / Acts & Rules are left exactly as they are: the
 * source document gives no narrative text, only the workflow, documents and
 * fee, so there is nothing here to write onto those fields.
 *
 * DRY RUN BY DEFAULT. `backend/.env` points at the live database:
 *
 *   npm run db:backfill:dpiit                            # preview
 *   npx tsx src/scripts/backfill-dpiit.ts --apply         # write
 *
 * Invoke the flagged run through `npx tsx` as above, NOT through
 * `npm run db:backfill:dpiit -- --apply`: npm consumes the flag as its own
 * config instead of forwarding it, so the script silently stays in dry run.
 */
import { db, pool } from "../config/db.js";
import { services, documentTypes } from "../models/schema.js";
import { eq } from "drizzle-orm";
import {
  DPIIT_DOCUMENTS,
  DPIIT_FEE_LINES,
  DPIIT_OPTIONAL_DOCUMENT_RE,
  DPIIT_SLUG,
  type DpiitFeeLine,
} from "../config/dpiitCatalog.js";

const describe = (lines: DpiitFeeLine[]) =>
  lines.map((l) => `${l.label} ₹${l.amount}`).join(", ") || "(none)";

async function run() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");

  console.log(
    apply ? "APPLYING changes.\n" : "DRY RUN — nothing will be written. Pass --apply to write.\n",
  );

  const [row] = await db.select().from(services).where(eq(services.slug, DPIIT_SLUG)).limit(1);
  if (!row) {
    console.error(`No "${DPIIT_SLUG}" service in the catalog — run db:seed:catalog first.`);
    process.exitCode = 1;
    return;
  }

  const existingDocs = await db
    .select({ id: documentTypes.id })
    .from(documentTypes)
    .where(eq(documentTypes.serviceId, row.id));

  let currentFees: DpiitFeeLine[] = [];
  try {
    const parsed = row.feeLines ? JSON.parse(row.feeLines) : [];
    if (Array.isArray(parsed)) currentFees = parsed;
  } catch {
    /* shown as (none) */
  }
  const currentPriceDescription =
    currentFees.length > 0
      ? describe(currentFees)
      : `Professional Fee ₹${Number(row.professionalFee)}, GST @ ${Number(row.gstPercent)}%`;

  console.log(`  ${apply ? "updated  " : "would set"} ${DPIIT_SLUG} (id ${row.id}, "${row.name}")`);
  console.log(
    `      documents REPLACED, ${existingDocs.length} removed, ${DPIIT_DOCUMENTS.length} written`,
  );
  console.log(
    `      fee: ${currentPriceDescription}  →  ${describe(DPIIT_FEE_LINES)}   ⚠ OVERWRITES the current price`,
  );
  console.log("      About / Who can Apply / Acts & Rules left as they are — nothing to write");

  if (apply) {
    await db
      .update(services)
      .set({
        feeLines: JSON.stringify(DPIIT_FEE_LINES),
        professionalFee: (
          DPIIT_FEE_LINES.find((l) => /professional/i.test(l.label))?.amount ?? 0
        ).toFixed(2),
        documentsCount: DPIIT_DOCUMENTS.length,
      })
      .where(eq(services.id, row.id));

    if (existingDocs.length > 0) {
      await db.delete(documentTypes).where(eq(documentTypes.serviceId, row.id));
    }
    await db.insert(documentTypes).values(
      DPIIT_DOCUMENTS.map((name) => ({
        serviceId: row.id,
        name,
        mandatory: !DPIIT_OPTIONAL_DOCUMENT_RE.test(name),
      })),
    );
  }

  console.log(`\n${apply ? "✅ Done" : "Preview complete"}.`);
}

run()
  .catch((err) => {
    console.error("DPIIT backfill failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
