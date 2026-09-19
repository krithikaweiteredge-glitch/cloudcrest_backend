/**
 * Fills the `lower-tax-deduction` catalog row from
 * `config/lowerTaxDeductionCatalog.ts` (the client's "Lower Tax Deduction.docx").
 * The row was seeded with nothing but a name, so this writes:
 *
 *   - description / who_can_apply / acts_rules / tabs — written only when the
 *     row has none, so admin-authored copy is never clobbered;
 *   - document_types — inserted only when the row has none, so an admin-curated
 *     checklist is never duplicated or replaced;
 *   - form_no — set to 128 only while the row still carries the seed's "—"
 *     placeholder (or nothing). An admin's own value is left alone.
 *
 *   - fee_lines (+ professional_fee, as the admin editor saves it) — set to the
 *     client's ₹6,999 + ₹1,260 GST, but only on a row that isn't priced yet. A
 *     row the admin has already priced keeps that price unless
 *     --overwrite-prices is passed, so this never silently undoes someone's
 *     pricing.
 *
 * DRY RUN BY DEFAULT. `backend/.env` points at the live database:
 *
 *   npm run db:backfill:lower-tax-deduction                                      # preview
 *   npx tsx src/scripts/backfill-lower-tax-deduction.ts --apply                  # write
 *   npx tsx src/scripts/backfill-lower-tax-deduction.ts --apply --replace-copy   # write, overwriting authored copy
 *   npx tsx src/scripts/backfill-lower-tax-deduction.ts --apply --replace-documents
 *
 * Invoke the flagged runs through `npx tsx` as above, NOT through
 * `npm run db:backfill:lower-tax-deduction -- --apply`: npm consumes the flags
 * as its own config instead of forwarding them, so the script silently stays in
 * dry run.
 */
import { db, pool } from "../config/db.js";
import { services, documentTypes } from "../models/schema.js";
import { eq } from "drizzle-orm";
import {
  LOWER_TAX_DEDUCTION_ACTS_RULES,
  LOWER_TAX_DEDUCTION_DESCRIPTION,
  LOWER_TAX_DEDUCTION_DOCUMENTS,
  LOWER_TAX_DEDUCTION_FEE_LINES,
  LOWER_TAX_DEDUCTION_FORM_NO,
  LOWER_TAX_DEDUCTION_OPTIONAL_DOCUMENT_RE,
  LOWER_TAX_DEDUCTION_SLUG,
  LOWER_TAX_DEDUCTION_WHO_CAN_APPLY,
  type LowerTaxDeductionFeeLine,
} from "../config/lowerTaxDeductionCatalog.js";

const describe = (lines: LowerTaxDeductionFeeLine[]) =>
  lines.map((l) => `${l.label} ₹${l.amount}`).join(", ") || "(none)";

/** The seed writes "—" when a service has no form number yet. */
const isPlaceholderForm = (v?: string | null) =>
  !v || !v.trim() || v.trim() === "—" || v.trim() === "-";

/** The service page's tabs: About, Who can Apply, Documents and Acts & Rules. */
const tabsFor = (description: string, whoCanApply: string, acts: string) =>
  JSON.stringify([
    { id: "about", title: "About", content: description, visible: true },
    { id: "who", title: "Who can Apply", content: whoCanApply, visible: true },
    { id: "documents", title: "Documents", content: "", visible: true },
    { id: "acts", title: "Acts and Rules", content: acts, visible: true },
  ]);

async function run() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const replaceCopy = args.includes("--replace-copy");
  const replaceDocuments = args.includes("--replace-documents");
  const overwritePrices = args.includes("--overwrite-prices");

  console.log(
    apply ? "APPLYING changes.\n" : "DRY RUN — nothing will be written. Pass --apply to write.\n",
  );
  if (replaceCopy) console.log("--replace-copy: existing About / Who can Apply / Acts will be REPLACED.");
  if (replaceDocuments) console.log("--replace-documents: the existing checklist will be REPLACED.");
  if (overwritePrices) console.log("--overwrite-prices: an already-priced row will be REPRICED.");

  const [row] = await db
    .select()
    .from(services)
    .where(eq(services.slug, LOWER_TAX_DEDUCTION_SLUG))
    .limit(1);
  if (!row) {
    console.error(
      `No "${LOWER_TAX_DEDUCTION_SLUG}" service in the catalog — run db:seed:catalog first.`,
    );
    process.exitCode = 1;
    return;
  }

  const hasCopy = !!row.description?.trim() || !!row.whoCanApply?.trim();
  const writeCopy = !hasCopy || replaceCopy;

  const existingDocs = await db
    .select({ id: documentTypes.id })
    .from(documentTypes)
    .where(eq(documentTypes.serviceId, row.id));
  const insertDocs = existingDocs.length === 0 || replaceDocuments;

  const writeForm = isPlaceholderForm(row.formNo);

  let currentFees: LowerTaxDeductionFeeLine[] = [];
  try {
    const parsed = row.feeLines ? JSON.parse(row.feeLines) : [];
    if (Array.isArray(parsed)) currentFees = parsed;
  } catch {
    /* shown as (none) */
  }
  const authoredPrice = currentFees.length > 0;
  const samePrice = describe(currentFees) === describe(LOWER_TAX_DEDUCTION_FEE_LINES);
  const writePrice = !authoredPrice || samePrice || overwritePrices;

  console.log(
    `  ${apply ? "updated  " : "would set"} ${LOWER_TAX_DEDUCTION_SLUG} (id ${row.id}, "${row.name}")`,
  );
  console.log(
    writeCopy
      ? `      About / Who can Apply / Acts & Rules / page tabs${hasCopy ? "  ⚠ REPLACES authored copy" : ""}`
      : "      copy kept — already authored (pass --replace-copy to overwrite)",
  );
  console.log(
    writeForm
      ? `      form no: ${row.formNo || "(none)"}  →  ${LOWER_TAX_DEDUCTION_FORM_NO}`
      : `      form no KEPT at the admin's "${row.formNo}"`,
  );
  console.log(
    existingDocs.length === 0
      ? `      ${LOWER_TAX_DEDUCTION_DOCUMENTS.length} documents`
      : replaceDocuments
        ? `      documents REPLACED, ${existingDocs.length} removed, ${LOWER_TAX_DEDUCTION_DOCUMENTS.length} written`
        : `      documents kept, ${existingDocs.length} already authored`,
  );
  console.log(
    writePrice
      ? `      fee lines: ${describe(currentFees)}  →  ${describe(LOWER_TAX_DEDUCTION_FEE_LINES)}` +
          (authoredPrice && !samePrice ? "   ⚠ OVERWRITES the admin's price" : "")
      : `      fee lines KEPT at the admin's ${describe(currentFees)} (client price is ${describe(LOWER_TAX_DEDUCTION_FEE_LINES)}) — pass --overwrite-prices to reprice`,
  );

  if (apply) {
    await db
      .update(services)
      .set({
        ...(writePrice
          ? {
              feeLines: JSON.stringify(LOWER_TAX_DEDUCTION_FEE_LINES),
              // The admin list shows this column as the service's price.
              professionalFee: (
                LOWER_TAX_DEDUCTION_FEE_LINES.find((l) => /professional/i.test(l.label))?.amount ?? 0
              ).toFixed(2),
            }
          : {}),
        ...(writeCopy
          ? {
              description: LOWER_TAX_DEDUCTION_DESCRIPTION,
              whoCanApply: LOWER_TAX_DEDUCTION_WHO_CAN_APPLY,
              actsRules: LOWER_TAX_DEDUCTION_ACTS_RULES,
              tabs: tabsFor(
                LOWER_TAX_DEDUCTION_DESCRIPTION,
                LOWER_TAX_DEDUCTION_WHO_CAN_APPLY,
                LOWER_TAX_DEDUCTION_ACTS_RULES,
              ),
            }
          : {}),
        ...(writeForm ? { formNo: LOWER_TAX_DEDUCTION_FORM_NO } : {}),
        ...(insertDocs ? { documentsCount: LOWER_TAX_DEDUCTION_DOCUMENTS.length } : {}),
      })
      .where(eq(services.id, row.id));

    if (insertDocs) {
      if (existingDocs.length > 0) {
        await db.delete(documentTypes).where(eq(documentTypes.serviceId, row.id));
      }
      await db.insert(documentTypes).values(
        LOWER_TAX_DEDUCTION_DOCUMENTS.map((name) => ({
          serviceId: row.id,
          name,
          // "Projected P&L / Balance Sheet" and the exemption certificate are
          // conditional in the document's own wording, so neither is mandatory.
          mandatory: !LOWER_TAX_DEDUCTION_OPTIONAL_DOCUMENT_RE.test(name),
        })),
      );
    }
  }

  console.log(`\n${apply ? "✅ Done" : "Preview complete"}.`);
}

run()
  .catch((err) => {
    console.error("Lower Tax Deduction backfill failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
