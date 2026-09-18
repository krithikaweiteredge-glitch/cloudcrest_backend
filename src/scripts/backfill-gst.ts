/**
 * Sets up the GST taxpayer-type rows from `config/gstCatalog.ts` (the client's
 * "GST_Registration_changes.docx"):
 *
 *   - creates the nine `gst-<type>` rows when missing — inactive, in `gst`'s
 *     subcategory, so they nest under it in Admin → Services and stay out of
 *     the customer sidebar (as the Professional Tax state rows do);
 *   - fee_lines (+ professional_fee, as the admin editor saves it) — set to the
 *     document's ₹2,499 + ₹450 GST, but only on a row that isn't priced yet.
 *     A row the admin has already priced keeps that price unless
 *     `--overwrite-prices` is passed, so this never silently undoes someone's
 *     pricing. The admin owns both amounts from then on;
 *   - name / short_title / form_no / icon — REPLACED, so a renamed or newly
 *     split category picks up the document's wording;
 *   - description / who_can_apply / tabs — written only when the row has none,
 *     so admin-authored copy is never clobbered;
 *   - document_types — inserted only when the row has none, so an admin-curated
 *     checklist is never duplicated or replaced;
 *   - wizard_rules — REPLACED with the card's tags / popular flag.
 *
 * It also retires the three rows the document's list drops — `gst-voluntary`,
 * `gst-ecom` and `gst-tds_tcs` (split into `gst-tds` and `gst-tcs`). Retiring
 * means deactivating them; pass `--delete-retired` to remove them outright,
 * which also deletes their document_types / service_forms / service_fields and
 * their compliance_calendar links. A row with orders against it is never
 * deleted — the script reports it and leaves it deactivated instead.
 *
 * Submitted service_requests reference a service by its slug string, not by a
 * foreign key, so deleting a row never affects an application already filed
 * under it.
 *
 * No government fee is written or computed: the document prices every GST
 * registration at Professional Fee + GST only.
 *
 * DRY RUN BY DEFAULT. `backend/.env` points at the live database:
 *
 *   npm run db:backfill:gst                                        # preview
 *   npx tsx src/scripts/backfill-gst.ts --apply                    # write
 *   npx tsx src/scripts/backfill-gst.ts --apply --delete-retired   # write + remove retired rows
 *   npx tsx src/scripts/backfill-gst.ts --apply --overwrite-prices # write + reprice already-priced rows
 *
 * Invoke the flagged runs through `npx tsx` as above, NOT through
 * `npm run db:backfill:gst -- --apply`: npm consumes the flags as its own
 * config ("Unknown cli config" warning) instead of forwarding them, so the
 * script silently stays in dry run and appears to do nothing.
 */
import { db, pool } from "../config/db.js";
import {
  services,
  documentTypes,
  serviceForms,
  serviceFields,
  orders,
  complianceCalendar,
} from "../models/schema.js";
import { eq, inArray } from "drizzle-orm";
import {
  GST_BASE_SLUG,
  GST_CATALOG,
  GST_RETIRED_SLUGS,
  type GstFeeLine,
} from "../config/gstCatalog.js";

const describe = (lines: GstFeeLine[]) =>
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
  const deleteRetired = args.includes("--delete-retired");
  // A row the admin has already priced is left at that price. The document's
  // ₹2,499 is a starting value, not a mandate to undo someone's pricing — so
  // repricing an authored row is opt-in.
  const overwritePrices = args.includes("--overwrite-prices");

  console.log(
    apply ? "APPLYING changes.\n" : "DRY RUN — nothing will be written. Pass --apply to write.\n",
  );
  if (replaceDocuments) console.log("--replace-documents: existing checklists will be REPLACED.");
  if (deleteRetired) console.log("--delete-retired: retired rows will be DELETED, not just deactivated.");
  console.log(
    overwritePrices
      ? "--overwrite-prices: rows the admin has already priced will be REPRICED to the document's figures."
      : "Rows the admin has already priced keep their price. Pass --overwrite-prices to reprice them.",
  );

  const [base] = await db.select().from(services).where(eq(services.slug, GST_BASE_SLUG)).limit(1);
  if (!base) {
    console.error(`No "${GST_BASE_SLUG}" service in the catalog — run db:seed:catalog first.`);
    process.exitCode = 1;
    return;
  }

  console.log("\nTaxpayer-type rows\n");
  let touched = 0;
  for (const [slug, entry] of Object.entries(GST_CATALOG)) {
    const { type } = entry;
    let [row] = await db.select().from(services).where(eq(services.slug, slug)).limit(1);
    const plan: string[] = [];

    if (!row) {
      plan.push(`create inactive type row "${type.title}" under ${GST_BASE_SLUG}`);
      if (apply) {
        [row] = await db
          .insert(services)
          .values({
            subcategoryId: base.subcategoryId,
            name: type.title,
            shortTitle: type.short,
            slug,
            authority: base.authority,
            formNo: type.form,
            icon: type.icon,
            active: false,
            professionalFee: "0",
            govtFee: "0",
            gstPercent: "0",
          })
          .returning();
      }
    } else if (row.name !== type.title || row.formNo !== type.form) {
      plan.push(`rename "${row.name}" → "${type.title}"  ·  form ${row.formNo ?? "—"} → ${type.form}`);
    }

    let current: GstFeeLine[] = [];
    try {
      const parsed = row?.feeLines ? JSON.parse(row.feeLines) : [];
      if (Array.isArray(parsed)) current = parsed;
    } catch {
      /* shown as (none) */
    }
    // Keep an authored price unless explicitly told to reprice.
    const authoredPrice = current.length > 0;
    const samePrice = describe(current) === describe(entry.feeLines);
    const writePrice = !authoredPrice || samePrice || overwritePrices;
    plan.push(
      writePrice
        ? `fee lines: ${describe(current)}  →  ${describe(entry.feeLines)}` +
            (authoredPrice && !samePrice ? "   ⚠ OVERWRITES the admin's price" : "")
        : `fee lines KEPT at the admin's ${describe(current)} (document says ${describe(entry.feeLines)}) — pass --overwrite-prices to reprice`,
    );

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
        name: type.title,
        shortTitle: type.short,
        formNo: type.form,
        icon: type.icon,
        ...(writePrice
          ? {
              feeLines: JSON.stringify(entry.feeLines),
              // The admin list shows this column as the service's price.
              professionalFee: (
                entry.feeLines.find((l) => /professional/i.test(l.label))?.amount ?? 0
              ).toFixed(2),
            }
          : {}),
        wizardRules: JSON.stringify({ tags: type.tags, popular: !!type.popular }),
        ...(writeCopy
          ? {
              description: type.description,
              whoCanApply: type.whoCanApply,
              tabs: tabsFor(type.description, type.whoCanApply),
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
        entry.documents.map((name) => ({ serviceId: row!.id, name, mandatory: true })),
      );
    }
  }

  console.log("\nRetired rows\n");
  let retired = 0;
  for (const slug of GST_RETIRED_SLUGS) {
    const [row] = await db.select().from(services).where(eq(services.slug, slug)).limit(1);
    if (!row) {
      console.log(`  absent    ${slug} — nothing to do`);
      continue;
    }
    retired++;

    if (!deleteRetired) {
      console.log(`  ${apply ? "deactivated" : "would deactivate"} ${slug} ("${row.name}")`);
      if (apply) await db.update(services).set({ active: false }).where(eq(services.id, row.id));
      continue;
    }

    // An order is a customer's paid record of this service; never delete a row
    // one points at. Deactivate it instead and say so.
    const placed = await db.select({ id: orders.id }).from(orders).where(eq(orders.serviceId, row.id));
    if (placed.length > 0) {
      console.log(
        `  KEPT      ${slug} ("${row.name}") — ${placed.length} order(s) reference it; ${apply ? "deactivated" : "would deactivate"} instead of deleting`,
      );
      if (apply) await db.update(services).set({ active: false }).where(eq(services.id, row.id));
      continue;
    }

    const docs = await db
      .select({ id: documentTypes.id })
      .from(documentTypes)
      .where(eq(documentTypes.serviceId, row.id));
    const forms = await db
      .select({ id: serviceForms.id })
      .from(serviceForms)
      .where(eq(serviceForms.serviceId, row.id));
    console.log(
      `  ${apply ? "DELETED  " : "would DELETE"} ${slug} ("${row.name}") — with ${docs.length} document type(s), ${forms.length} form(s)`,
    );

    if (!apply) continue;
    const formIds = forms.map((f) => f.id);
    if (formIds.length > 0) {
      await db.delete(serviceFields).where(inArray(serviceFields.formId, formIds));
      await db.delete(serviceForms).where(eq(serviceForms.serviceId, row.id));
    }
    await db.delete(documentTypes).where(eq(documentTypes.serviceId, row.id));
    await db.delete(complianceCalendar).where(eq(complianceCalendar.serviceId, row.id));
    await db.delete(services).where(eq(services.id, row.id));
  }

  console.log(
    `\n${apply ? "✅ Done" : "Preview complete"}. types ${apply ? "updated" : "would update"}=${touched}, retired rows found=${retired}`,
  );
}

run()
  .catch((err) => {
    console.error("GST backfill failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
