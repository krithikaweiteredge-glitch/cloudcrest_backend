/**
 * Renames the `12a` catalog row to `section-332` and fills it from
 * `config/section332Catalog.ts` (the client's "12A.docx").
 *
 * Section 332 of the Income-tax Act, 2025 replaced Sections 12A / 12AA / 12AB of
 * the 1961 Act, so the row is renamed with it:
 *
 *   - slug      `12a`  →  `section-332`   (old links keep working: the
 *                                            frontend redirects /m/12a)
 *   - name      →  "Section 332 Registration"
 *   - short     →  "Section 332"
 *
 * and then, exactly as the other catalog backfills do:
 *
 *   - description / who_can_apply / acts_rules / tabs — written only when the
 *     row has none, so admin-authored copy is never clobbered;
 *   - document_types — inserted only when the row has none, so an admin-curated
 *     checklist is never duplicated or replaced;
 *   - form_no — "Form 104 / Form 105", only while the row still carries the
 *     seed's "—" placeholder (or nothing);
 *   - fee_lines (+ professional_fee, as the admin editor saves it) — set to the
 *     client's ₹6,999 + ₹1,260 GST, but only on a row that isn't priced yet. A
 *     row the admin has already priced keeps that price unless
 *     --overwrite-prices is passed.
 *
 * The rename is the one part that always applies: it is the point of the
 * script. It is idempotent — a row already on `section-332` is found by the new
 * slug and left named as it is unless it still carries the old "12A" name.
 *
 * DRY RUN BY DEFAULT. `backend/.env` points at the live database:
 *
 *   npm run db:backfill:section-332                                    # preview
 *   npx tsx src/scripts/backfill-section-332.ts --apply                # write
 *   npx tsx src/scripts/backfill-section-332.ts --apply --replace-copy
 *   npx tsx src/scripts/backfill-section-332.ts --apply --replace-documents
 *
 * Invoke the flagged runs through `npx tsx` as above, NOT through
 * `npm run db:backfill:section-332 -- --apply`: npm consumes the flags as its
 * own config instead of forwarding them, so the script silently stays in dry
 * run.
 */
import { db, pool } from "../config/db.js";
import { services, documentTypes } from "../models/schema.js";
import { eq } from "drizzle-orm";
import {
  SECTION_332_ACTS_RULES,
  SECTION_332_DESCRIPTION,
  SECTION_332_DOCUMENTS,
  SECTION_332_FEE_LINES,
  SECTION_332_FORM_NO,
  SECTION_332_LEGACY_SLUG,
  SECTION_332_NAME,
  SECTION_332_OPTIONAL_DOCUMENT_RE,
  SECTION_332_SHORT_TITLE,
  SECTION_332_SLUG,
  SECTION_332_WHO_CAN_APPLY,
  type Section332FeeLine,
} from "../config/section332Catalog.js";

/** The seed writes "—" when a service has no form number yet. */
const isPlaceholderForm = (v?: string | null) =>
  !v || !v.trim() || v.trim() === "—" || v.trim() === "-";

const describe = (lines: Section332FeeLine[]) =>
  lines.map((l) => `${l.label} ₹${l.amount}`).join(", ") || "(none)";

/** The service page's tabs: About, Who can Apply, Documents and Acts & Rules. */
const tabsFor = (description: string, whoCanApply: string, acts: string) =>
  JSON.stringify([
    { id: "about", title: "About", content: description, visible: true },
    { id: "who", title: "Who can Apply", content: whoCanApply, visible: true },
    { id: "documents", title: "Documents", content: "", visible: true },
    { id: "acts", title: "Acts and Rules", content: acts, visible: true },
  ]);

/**
 * A name the seed wrote, rather than one an admin chose. Only these are
 * replaced — anything else on the row is someone's own wording and is kept.
 */
const isSeededName = (v?: string | null) =>
  !v || !v.trim() || /^12\s*a/i.test(v.trim());

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

  // The new slug first, so a second run finds the row it already renamed.
  let [row] = await db
    .select()
    .from(services)
    .where(eq(services.slug, SECTION_332_SLUG))
    .limit(1);
  if (!row) {
    [row] = await db
      .select()
      .from(services)
      .where(eq(services.slug, SECTION_332_LEGACY_SLUG))
      .limit(1);
  }
  if (!row) {
    console.error(
      `No "${SECTION_332_SLUG}" (or legacy "${SECTION_332_LEGACY_SLUG}") service in the catalog — run db:seed:catalog first.`,
    );
    process.exitCode = 1;
    return;
  }

  const renameSlug = row.slug !== SECTION_332_SLUG;
  const renameName = isSeededName(row.name) && row.name !== SECTION_332_NAME;
  const renameShort = isSeededName(row.shortTitle) && row.shortTitle !== SECTION_332_SHORT_TITLE;

  const writeForm = isPlaceholderForm(row.formNo);

  const hasCopy = !!row.description?.trim() || !!row.whoCanApply?.trim();
  const writeCopy = !hasCopy || replaceCopy;

  const existingDocs = await db
    .select({ id: documentTypes.id })
    .from(documentTypes)
    .where(eq(documentTypes.serviceId, row.id));
  const insertDocs = existingDocs.length === 0 || replaceDocuments;

  let currentFees: Section332FeeLine[] = [];
  try {
    const parsed = row.feeLines ? JSON.parse(row.feeLines) : [];
    if (Array.isArray(parsed)) currentFees = parsed;
  } catch {
    /* shown as (none) */
  }
  const authoredPrice = currentFees.length > 0;
  const samePrice = describe(currentFees) === describe(SECTION_332_FEE_LINES);
  const writePrice = !authoredPrice || samePrice || overwritePrices;

  console.log(`  ${apply ? "updated  " : "would set"} id ${row.id} ("${row.name}")`);
  console.log(
    renameSlug
      ? `      slug:  ${row.slug}  →  ${SECTION_332_SLUG}`
      : `      slug already ${SECTION_332_SLUG}`,
  );
  console.log(
    renameName
      ? `      name:  ${row.name}  →  ${SECTION_332_NAME}`
      : `      name KEPT as "${row.name}"`,
  );
  console.log(
    renameShort
      ? `      short: ${row.shortTitle}  →  ${SECTION_332_SHORT_TITLE}`
      : `      short title KEPT as "${row.shortTitle}"`,
  );
  console.log(
    writeForm
      ? `      form no: ${row.formNo || "(none)"}  →  ${SECTION_332_FORM_NO}`
      : `      form no KEPT at the admin's "${row.formNo}"`,
  );
  console.log(
    writeCopy
      ? `      About / Who can Apply / Acts & Rules / page tabs${hasCopy ? "  ⚠ REPLACES authored copy" : ""}`
      : "      copy kept — already authored (pass --replace-copy to overwrite)",
  );
  console.log(
    existingDocs.length === 0
      ? `      ${SECTION_332_DOCUMENTS.length} documents`
      : replaceDocuments
        ? `      documents REPLACED, ${existingDocs.length} removed, ${SECTION_332_DOCUMENTS.length} written`
        : `      documents kept, ${existingDocs.length} already authored`,
  );
  console.log(
    writePrice
      ? `      fee lines: ${describe(currentFees)}  →  ${describe(SECTION_332_FEE_LINES)}` +
          (authoredPrice && !samePrice ? "   ⚠ OVERWRITES the admin's price" : "")
      : `      fee lines KEPT at the admin's ${describe(currentFees)} (client price is ${describe(SECTION_332_FEE_LINES)}) — pass --overwrite-prices to reprice`,
  );

  if (apply) {
    await db
      .update(services)
      .set({
        ...(renameSlug ? { slug: SECTION_332_SLUG } : {}),
        ...(renameName ? { name: SECTION_332_NAME } : {}),
        ...(renameShort ? { shortTitle: SECTION_332_SHORT_TITLE } : {}),
        ...(writePrice
          ? {
              feeLines: JSON.stringify(SECTION_332_FEE_LINES),
              // The admin list shows this column as the service's price.
              professionalFee: (
                SECTION_332_FEE_LINES.find((l) => /professional/i.test(l.label))?.amount ?? 0
              ).toFixed(2),
            }
          : {}),
        ...(writeCopy
          ? {
              description: SECTION_332_DESCRIPTION,
              whoCanApply: SECTION_332_WHO_CAN_APPLY,
              actsRules: SECTION_332_ACTS_RULES,
              tabs: tabsFor(
                SECTION_332_DESCRIPTION,
                SECTION_332_WHO_CAN_APPLY,
                SECTION_332_ACTS_RULES,
              ),
            }
          : {}),
        ...(writeForm ? { formNo: SECTION_332_FORM_NO } : {}),
        ...(insertDocs ? { documentsCount: SECTION_332_DOCUMENTS.length } : {}),
      })
      .where(eq(services.id, row.id));

    if (insertDocs) {
      if (existingDocs.length > 0) {
        await db.delete(documentTypes).where(eq(documentTypes.serviceId, row.id));
      }
      await db.insert(documentTypes).values(
        SECTION_332_DOCUMENTS.map((name) => ({
          serviceId: row.id,
          name,
          // "if activities have already commenced" in the document's own wording.
          mandatory: !SECTION_332_OPTIONAL_DOCUMENT_RE.test(name),
        })),
      );
    }
  }

  console.log(`\n${apply ? "✅ Done" : "Preview complete"}.`);
}

run()
  .catch((err) => {
    console.error("Section 332 backfill failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
