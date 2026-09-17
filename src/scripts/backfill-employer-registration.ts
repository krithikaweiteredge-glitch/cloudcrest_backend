/**
 * Applies the client's "EPFO AND ESI" document to the `epf` and `esi` rows
 * (`config/employerRegistrationCatalog.ts`):
 *
 *   - fee_lines (+ professional_fee, as the admin editor saves it) — REPLACED,
 *     since this is the client's price list;
 *   - document_types — REPLACED: the rows held placeholder checklists from the
 *     original seed, which the document supersedes.
 *
 * DRY RUN BY DEFAULT. `backend/.env` points at the live database:
 *
 *   npm run db:backfill:employer-registration                 # preview
 *   npm run db:backfill:employer-registration -- --apply      # write
 */
import { db, pool } from "../config/db.js";
import { services, documentTypes, orderDocuments } from "../models/schema.js";
import { eq, inArray } from "drizzle-orm";
import {
  EMPLOYER_REGISTRATION_DOCUMENTS,
  EMPLOYER_REGISTRATION_FEE_LINES,
  EMPLOYER_REGISTRATION_SLUGS,
} from "../config/employerRegistrationCatalog.js";

const describe = (lines: { label: string; amount: number }[]) =>
  lines.map((l) => `${l.label} ₹${l.amount}`).join(", ") || "(none)";

async function run() {
  const apply = process.argv.slice(2).includes("--apply");
  console.log(apply ? "APPLYING changes.\n" : "DRY RUN — nothing will be written. Pass --apply to write.\n");

  let touched = 0;
  for (const slug of EMPLOYER_REGISTRATION_SLUGS) {
    const [row] = await db.select().from(services).where(eq(services.slug, slug)).limit(1);
    if (!row) {
      console.error(`  No "${slug}" service in the catalog — run db:seed:catalog first.`);
      process.exitCode = 1;
      continue;
    }

    let current: { label: string; amount: number }[] = [];
    try {
      const parsed = row.feeLines ? JSON.parse(row.feeLines) : [];
      if (Array.isArray(parsed)) current = parsed;
    } catch {
      /* shown as (none) */
    }
    const existingDocs = await db
      .select({ id: documentTypes.id })
      .from(documentTypes)
      .where(eq(documentTypes.serviceId, row.id));
    // Orders that uploaded against the old checklist keep it — those rows can't be deleted.
    const referenced = existingDocs.length
      ? await db
          .select({ id: orderDocuments.id })
          .from(orderDocuments)
          .where(inArray(orderDocuments.documentTypeId, existingDocs.map((d) => d.id)))
          .limit(1)
      : [];
    if (referenced.length > 0) {
      console.error(`  ${slug}: its current documents are referenced by orders — not replacing. Edit it in Admin → Services.`);
      process.exitCode = 1;
      continue;
    }

    console.log(`  ${apply ? "updated  " : "would set"} ${slug}`);
    console.log(`      fee lines: ${describe(current)}  →  ${describe(EMPLOYER_REGISTRATION_FEE_LINES)}`);
    console.log(
      `      documents REPLACED: ${existingDocs.length} removed, ${EMPLOYER_REGISTRATION_DOCUMENTS.length} written`,
    );
    touched++;

    if (!apply) continue;
    await db
      .update(services)
      .set({
        feeLines: JSON.stringify(EMPLOYER_REGISTRATION_FEE_LINES),
        professionalFee: (
          EMPLOYER_REGISTRATION_FEE_LINES.find((l) => /professional/i.test(l.label))?.amount ?? 0
        ).toFixed(2),
        documentsCount: EMPLOYER_REGISTRATION_DOCUMENTS.length,
      })
      .where(eq(services.id, row.id));
    await db.delete(documentTypes).where(eq(documentTypes.serviceId, row.id));
    await db
      .insert(documentTypes)
      .values(EMPLOYER_REGISTRATION_DOCUMENTS.map((name) => ({ serviceId: row.id, name, mandatory: true })));
  }

  console.log(`\n${apply ? "✅ Done" : "Preview complete"}. ${apply ? "updated" : "would update"}=${touched}`);
}

run()
  .catch((err) => {
    console.error("EPF / ESI backfill failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
