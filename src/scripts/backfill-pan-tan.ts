/**
 * Sets up the PAN and TAN rows from `config/panTanCatalog.ts` (the client's
 * "PANTAN Changes.docx"). The document splits the service in two at its first
 * page, so each gets its own row under the existing `pan-tan` launcher:
 *
 *   - creates `pan-tan-pan` and `pan-tan-tan` when missing — inactive, in
 *     `pan-tan`'s subcategory, so they nest under it in Admin → Services and
 *     stay out of the customer sidebar;
 *   - fee_lines (+ professional_fee, as the admin editor saves it) — set to the
 *     client's ₹499 + ₹90 GST on both rows and on the `pan-tan` launcher, but
 *     only where the row isn't priced yet. An already-priced row keeps its
 *     price unless `--overwrite-prices` is passed;
 *   - name / short_title / form_no / icon — REPLACED on the two service rows;
 *   - description / who_can_apply / acts_rules / tabs — written only when the
 *     row has none, so admin-authored copy is never clobbered;
 *   - document_types — inserted only when the row has none.
 *
 * The launcher row keeps its own name, form and documents; only its price is
 * touched, because the fee engine falls back to it for an unpriced service row.
 *
 * DRY RUN BY DEFAULT. `backend/.env` points at the live database:
 *
 *   npm run db:backfill:pan-tan                                        # preview
 *   npx tsx src/scripts/backfill-pan-tan.ts --apply                    # write
 *   npx tsx src/scripts/backfill-pan-tan.ts --apply --overwrite-prices # + reprice
 *
 * Invoke the flagged runs through `npx tsx` as above, NOT through
 * `npm run db:backfill:pan-tan -- --apply`: npm consumes the flags as its own
 * config instead of forwarding them, so the script silently stays in dry run.
 */
import { db, pool } from "../config/db.js";
import { services, documentTypes } from "../models/schema.js";
import { eq } from "drizzle-orm";
import {
  PAN_TAN_ACTS_RULES,
  PAN_TAN_BASE_SLUG,
  PAN_TAN_FEE_LINES,
  PAN_TAN_ROWS,
  type PanTanFeeLine,
} from "../config/panTanCatalog.js";

const describe = (lines: PanTanFeeLine[]) =>
  lines.map((l) => `${l.label} ₹${l.amount}`).join(", ") || "(none)";

const parseLines = (raw: string | null): PanTanFeeLine[] => {
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

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
  const replaceDocuments = args.includes("--replace-documents");
  const overwritePrices = args.includes("--overwrite-prices");

  console.log(
    apply ? "APPLYING changes.\n" : "DRY RUN — nothing will be written. Pass --apply to write.\n",
  );
  if (replaceDocuments) console.log("--replace-documents: existing checklists will be REPLACED.");
  console.log(
    overwritePrices
      ? "--overwrite-prices: rows the admin has already priced will be REPRICED."
      : "Rows the admin has already priced keep their price. Pass --overwrite-prices to reprice them.",
  );

  const [base] = await db
    .select()
    .from(services)
    .where(eq(services.slug, PAN_TAN_BASE_SLUG))
    .limit(1);
  if (!base) {
    console.error(`No "${PAN_TAN_BASE_SLUG}" service in the catalog — run db:seed:catalog first.`);
    process.exitCode = 1;
    return;
  }

  // The launcher: price only. Its name, form and documents stay the admin's.
  console.log("\nLauncher row\n");
  {
    const current = parseLines(base.feeLines);
    const authored = current.length > 0;
    const same = describe(current) === describe(PAN_TAN_FEE_LINES);
    const write = !authored || same || overwritePrices;
    console.log(`  ${apply && write ? "updated  " : "would set"} ${PAN_TAN_BASE_SLUG} ("${base.name}")`);
    console.log(
      write
        ? `      fee lines: ${describe(current)}  →  ${describe(PAN_TAN_FEE_LINES)}` +
            (authored && !same ? "   ⚠ OVERWRITES the admin's price" : "")
        : `      fee lines KEPT at the admin's ${describe(current)} (client price is ${describe(PAN_TAN_FEE_LINES)}) — pass --overwrite-prices to reprice`,
    );
    if (apply && write) {
      await db
        .update(services)
        .set({
          feeLines: JSON.stringify(PAN_TAN_FEE_LINES),
          professionalFee: (
            PAN_TAN_FEE_LINES.find((l) => /professional/i.test(l.label))?.amount ?? 0
          ).toFixed(2),
        })
        .where(eq(services.id, base.id));
    }
  }

  console.log("\nService rows\n");
  let touched = 0;
  for (const entry of PAN_TAN_ROWS) {
    let [row] = await db.select().from(services).where(eq(services.slug, entry.slug)).limit(1);
    const plan: string[] = [];

    if (!row) {
      plan.push(`create inactive row "${entry.name}" under ${PAN_TAN_BASE_SLUG}`);
      if (apply) {
        [row] = await db
          .insert(services)
          .values({
            subcategoryId: base.subcategoryId,
            name: entry.name,
            shortTitle: entry.shortTitle,
            slug: entry.slug,
            authority: base.authority,
            formNo: entry.form,
            icon: entry.icon,
            active: false,
            professionalFee: "0",
            govtFee: "0",
            gstPercent: "0",
          })
          .returning();
      }
    } else if (row.name !== entry.name || row.formNo !== entry.form) {
      plan.push(`name "${row.name}" → "${entry.name}"  ·  form ${row.formNo ?? "—"} → ${entry.form}`);
    }

    const current = parseLines(row?.feeLines ?? null);
    const authored = current.length > 0;
    const same = describe(current) === describe(PAN_TAN_FEE_LINES);
    const writePrice = !authored || same || overwritePrices;
    plan.push(
      writePrice
        ? `fee lines: ${describe(current)}  →  ${describe(PAN_TAN_FEE_LINES)}` +
            (authored && !same ? "   ⚠ OVERWRITES the admin's price" : "")
        : `fee lines KEPT at the admin's ${describe(current)} — pass --overwrite-prices to reprice`,
    );

    const writeCopy = !row?.description?.trim() && !row?.whoCanApply?.trim();
    plan.push(writeCopy ? "About / Who can Apply / Acts & Rules / page tabs" : "copy kept — already authored");

    const existingDocs = row
      ? await db
          .select({ id: documentTypes.id })
          .from(documentTypes)
          .where(eq(documentTypes.serviceId, row.id))
      : [];
    const insertDocs = existingDocs.length === 0 || replaceDocuments;
    plan.push(
      existingDocs.length === 0
        ? `${entry.documents.length} documents`
        : replaceDocuments
          ? `documents REPLACED, ${existingDocs.length} removed, ${entry.documents.length} written`
          : `documents kept, ${existingDocs.length} already authored`,
    );

    console.log(`  ${apply ? "updated  " : "would set"} ${entry.slug}`);
    for (const p of plan) console.log(`      ${p}`);
    touched++;

    if (!apply || !row) continue;
    await db
      .update(services)
      .set({
        name: entry.name,
        shortTitle: entry.shortTitle,
        formNo: entry.form,
        icon: entry.icon,
        ...(writePrice
          ? {
              feeLines: JSON.stringify(PAN_TAN_FEE_LINES),
              professionalFee: (
                PAN_TAN_FEE_LINES.find((l) => /professional/i.test(l.label))?.amount ?? 0
              ).toFixed(2),
            }
          : {}),
        ...(writeCopy
          ? {
              description: entry.description,
              whoCanApply: entry.whoCanApply,
              actsRules: PAN_TAN_ACTS_RULES,
              tabs: tabsFor(entry.description, entry.whoCanApply, PAN_TAN_ACTS_RULES),
            }
          : {}),
        ...(insertDocs ? { documentsCount: entry.documents.length } : {}),
      })
      .where(eq(services.id, row.id));

    if (insertDocs) {
      if (existingDocs.length > 0) {
        await db.delete(documentTypes).where(eq(documentTypes.serviceId, row.id));
      }
      await db
        .insert(documentTypes)
        .values(entry.documents.map((name) => ({ serviceId: row!.id, name, mandatory: true })));
    }
  }

  console.log(`\n${apply ? "✅ Done" : "Preview complete"}. rows ${apply ? "updated" : "would update"}=${touched}`);
}

run()
  .catch((err) => {
    console.error("PAN/TAN backfill failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
