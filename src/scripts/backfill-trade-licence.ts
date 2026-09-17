/**
 * Sets up the state-wise Trade Licence rows from `config/tradeLicenceCatalog.ts`
 * (the client's "Trade License" document):
 *
 *   - creates `trade-licence-telangana` / `-andhra-pradesh` / `-karnataka` when
 *     missing — inactive, in `trade-licence`'s subcategory, so they nest under
 *     it in Admin → Services and stay out of the sidebar (as the Labour Licence
 *     rows do);
 *   - fee_lines (+ professional_fee, as the admin editor saves it) — REPLACED,
 *     since this is the client's price list;
 *   - wizard_rules road-width rates — written only when the row has none, so
 *     rates the admin has changed are kept;
 *   - description / who_can_apply / tabs — written only when the row has none;
 *   - document_types — inserted only when the row has none;
 *   - form_no — cleared on the base row and the state rows; the document names
 *     no form.
 *
 * The Govt Fee itself is not written — the backend computes it per application
 * from the area and road width (`config/tradeLicenceFees.ts`).
 *
 * DRY RUN BY DEFAULT. `backend/.env` points at the live database:
 *
 *   npm run db:backfill:trade-licence                 # preview
 *   npm run db:backfill:trade-licence -- --apply      # write
 */
import { db, pool } from "../config/db.js";
import { services, documentTypes } from "../models/schema.js";
import { eq } from "drizzle-orm";
import {
  TRADE_LICENCE_BASE_SLUG,
  TRADE_LICENCE_CATALOG,
  TRADE_LICENCE_DEFAULT_RATES,
} from "../config/tradeLicenceCatalog.js";

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

const hasRates = (wizardRules: string | null | undefined) => {
  try {
    return !!(wizardRules && JSON.parse(wizardRules)?.roadWidthRates);
  } catch {
    return false;
  }
};

async function run() {
  const apply = process.argv.slice(2).includes("--apply");
  console.log(apply ? "APPLYING changes.\n" : "DRY RUN — nothing will be written. Pass --apply to write.\n");

  const [base] = await db.select().from(services).where(eq(services.slug, TRADE_LICENCE_BASE_SLUG)).limit(1);
  if (!base) {
    console.error(`No "${TRADE_LICENCE_BASE_SLUG}" service in the catalog — run db:seed:catalog first.`);
    process.exitCode = 1;
    return;
  }

  let touched = 0;
  if (base.formNo) {
    console.log(`  ${apply ? "updated  " : "would set"} ${TRADE_LICENCE_BASE_SLUG}
      form no:   ${base.formNo}  →  (none)`);
    if (apply) await db.update(services).set({ formNo: null }).where(eq(services.id, base.id));
  }

  for (const [slug, entry] of Object.entries(TRADE_LICENCE_CATALOG)) {
    let [row] = await db.select().from(services).where(eq(services.slug, slug)).limit(1);
    const plan: string[] = [];

    if (!row) {
      plan.push(`create inactive state row "${entry.state}" under ${TRADE_LICENCE_BASE_SLUG}`);
      if (apply) {
        [row] = await db
          .insert(services)
          .values({
            subcategoryId: base.subcategoryId,
            name: entry.state,
            shortTitle: `Trade Licence · ${entry.state}`,
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

    const writeRates = !hasRates(row?.wizardRules);
    plan.push(
      writeRates
        ? `road-width rates ₹/sq.ft.: ${Object.entries(TRADE_LICENCE_DEFAULT_RATES).map(([k, v]) => `${k} ${v}`).join(", ")}`
        : "road-width rates kept — already authored",
    );
    if (row?.formNo) plan.push(`form no:   ${row.formNo}  →  (none)`);

    const writeCopy = !row?.description?.trim() && !row?.whoCanApply?.trim();
    plan.push(writeCopy ? "About / Who can Apply / page tabs" : "copy kept — already authored");

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
        formNo: null,
        // The admin list shows this column as the service's price.
        professionalFee: (entry.feeLines.find((l) => /professional/i.test(l.label))?.amount ?? 0).toFixed(2),
        ...(writeRates ? { wizardRules: JSON.stringify({ roadWidthRates: TRADE_LICENCE_DEFAULT_RATES }) } : {}),
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
      await db
        .insert(documentTypes)
        .values(entry.documents.map((name) => ({ serviceId: row!.id, name, mandatory: true })));
    }
  }

  console.log(`\n${apply ? "✅ Done" : "Preview complete"}. ${apply ? "updated" : "would update"}=${touched}`);
}

run()
  .catch((err) => {
    console.error("Trade licence backfill failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
