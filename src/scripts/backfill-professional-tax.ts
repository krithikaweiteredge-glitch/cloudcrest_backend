/**
 * Sets up the state-wise Professional Tax rows from
 * `config/professionalTaxCatalog.ts` (the client's "Professional Tax" document):
 *
 *   - creates `professional-tax-telangana` / `-andhra-pradesh` / `-karnataka`
 *     when missing — inactive, in `professional-tax`'s subcategory, so they nest
 *     under it in Admin → Services and stay out of the sidebar (as the Labour
 *     Licence and entity registrations' state rows do);
 *   - fee_lines (+ professional_fee, as the admin editor saves it) — REPLACED,
 *     since this is the client's price list;
 *   - description / who_can_apply / tabs — written only when the row has none,
 *     so admin-authored copy is never clobbered;
 *   - document_types — inserted only when the row has none, so an admin-curated
 *     checklist is never duplicated or replaced;
 *   - form_no — left as "—" / cleared. The document names no form.
 *
 * No government fee is written or computed: the document prices the service at
 * Professional Fee + GST only.
 *
 * DRY RUN BY DEFAULT. `backend/.env` points at the live database:
 *
 *   npm run db:backfill:professional-tax                 # preview
 *   npm run db:backfill:professional-tax -- --apply      # write
 */
import { db, pool } from "../config/db.js";
import { services, documentTypes } from "../models/schema.js";
import { eq } from "drizzle-orm";
import {
  PROFESSIONAL_TAX_BASE_SLUG,
  PROFESSIONAL_TAX_CATALOG,
} from "../config/professionalTaxCatalog.js";

const describe = (lines: { label: string; amount: number }[]) =>
  lines.map((l) => `${l.label} ₹${l.amount}`).join(", ") || "(none)";

/** The service page's tabs: About, Who can Apply and the document checklist. */
const tabsFor = (description: string, whoCanApply: string) =>
  JSON.stringify([
    { id: "about", title: "About", content: description, visible: true },
    { id: "who", title: "Who can Apply", content: whoCanApply, visible: true },
    { id: "documents", title: "Documents", content: "", visible: true },
    { id: "acts", title: "Acts and Rules", content: "", visible: false },
  ]);

async function run() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  // The checklist is normally left alone once authored. --replace-documents
  // discards whatever is there and rewrites it from this config; use it only
  // when the seeded list itself changed, since it drops admin edits.
  const replaceDocuments = args.includes("--replace-documents");
  console.log(apply ? "APPLYING changes.\n" : "DRY RUN — nothing will be written. Pass --apply to write.\n");
  if (replaceDocuments) console.log("--replace-documents: existing checklists will be REPLACED.");

  const [base] = await db
    .select()
    .from(services)
    .where(eq(services.slug, PROFESSIONAL_TAX_BASE_SLUG))
    .limit(1);
  if (!base) {
    console.error(`No "${PROFESSIONAL_TAX_BASE_SLUG}" service in the catalog — run db:seed:catalog first.`);
    process.exitCode = 1;
    return;
  }

  let touched = 0;
  for (const [slug, entry] of Object.entries(PROFESSIONAL_TAX_CATALOG)) {
    let [row] = await db.select().from(services).where(eq(services.slug, slug)).limit(1);
    const plan: string[] = [];

    if (!row) {
      plan.push(`create inactive state row "${entry.state}" under ${PROFESSIONAL_TAX_BASE_SLUG}`);
      if (apply) {
        [row] = await db
          .insert(services)
          .values({
            subcategoryId: base.subcategoryId,
            name: entry.state,
            shortTitle: `Professional Tax · ${entry.state}`,
            slug,
            authority: base.authority,
            formNo: null,
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

    // Copy is written once; an admin who has edited it keeps their version.
    const writeCopy = !row?.description?.trim() && !row?.whoCanApply?.trim();
    plan.push(writeCopy ? "About / Who can Apply / page tabs" : "copy kept — already authored");

    const existingDocs = row
      ? await db.select({ id: documentTypes.id }).from(documentTypes).where(eq(documentTypes.serviceId, row.id))
      : [];
    const insertDocs = existingDocs.length === 0 || replaceDocuments;
    plan.push(
      existingDocs.length === 0
        ? `${entry.documents.length} documents`
        : replaceDocuments
          ? `documents REPLACED, ${existingDocs.length} removed, ${entry.documents.length} written`
          : `documents kept, ${existingDocs.length} already authored`,
    );

    console.log(`  ${apply ? "updated  " : "would set"} ${slug}`);
    for (const p of plan) console.log(`      ${p}`);
    touched++;

    if (!apply || !row) continue;
    await db
      .update(services)
      .set({
        feeLines: JSON.stringify(entry.feeLines),
        formNo: null,
        // The admin list shows this column as the service's price.
        professionalFee: (entry.feeLines.find((l) => /professional/i.test(l.label))?.amount ?? 0).toFixed(2),
        ...(writeCopy
          ? {
              description: entry.description,
              whoCanApply: entry.whoCanApply,
              tabs: tabsFor(entry.description, entry.whoCanApply),
            }
          : {}),
        ...(insertDocs ? { documentsCount: entry.documents.length } : {}),
      })
      .where(eq(services.id, row.id));
    if (insertDocs) {
      if (existingDocs.length > 0) {
        await db.delete(documentTypes).where(eq(documentTypes.serviceId, row.id));
      }
      await db.insert(documentTypes).values(
        entry.documents.map((name) => ({
          serviceId: row!.id,
          name,
          // The catch-all last item isn't a document the applicant can produce
          // on demand, so it is not marked mandatory.
          mandatory: !/^any other document/i.test(name),
        })),
      );
    }
  }

  console.log(`\n${apply ? "✅ Done" : "Preview complete"}. ${apply ? "updated" : "would update"}=${touched}`);
}

run()
  .catch((err) => {
    console.error("Professional tax backfill failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
