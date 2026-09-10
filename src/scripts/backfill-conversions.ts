/**
 * Fills the eight Business Conversion catalog rows from
 * `config/conversionCatalog.ts` (Content.docx + the conversion stepper HTML).
 *
 * Those rows exist as bare identity rows — slug, name, authority — with no copy,
 * no rules and no document checklist. This writes the content into the same
 * columns the admin edits, so from then on it is managed in Admin → Services
 * and nothing about it lives in the frontend.
 *
 * DRY RUN BY DEFAULT. `backend/.env` points at the live database, so the script
 * prints what it would write and changes nothing unless `--apply` is passed:
 *
 *   npm run db:backfill:conversions                 # preview
 *   npm run db:backfill:conversions -- --apply      # write
 *   npm run db:backfill:conversions -- --apply conversion-llp-to-pvt
 *
 * Every write only fills a gap, so admin-authored content is never replaced:
 *   - description / who_can_apply / acts_rules / form_no   only when empty or "—"
 *   - wizard_rules                                         only when unset
 *   - document_types                                       only when the service has none
 *   - documents_count (home-card chip)                     only when unset
 *   - fee_lines (+ professional_fee, as the admin editor saves it)  only when the service has none
 * Safe to run more than once.
 */
import { db, pool } from "../config/db.js";
import { services, documentTypes } from "../models/schema.js";
import { eq } from "drizzle-orm";
import { CONVERSION_CATALOG } from "../config/conversionCatalog.js";

/**
 * What the admin editor writes to professional_fee when it saves fee lines: the
 * "Professional Fee" line if there is one, otherwise the lines' total. Keeping
 * the column in step makes the admin list show the same price the editor would.
 */
const listPrice = (lines: { label: string; amount: number }[]) =>
  (lines.find((l) => /professional/i.test(l.label))?.amount ??
    lines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0)).toFixed(2);
const isEmpty = (v: string | null | undefined) => !v || v.trim() === "" || v.trim() === "—";

async function run() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const only = args.filter((a) => !a.startsWith("--")).map((s) => s.trim().toLowerCase());

  const unknown = only.filter((s) => !(s in CONVERSION_CATALOG));
  if (unknown.length > 0) {
    console.error(`Unknown slug(s): ${unknown.join(", ")}.\nKnown: ${Object.keys(CONVERSION_CATALOG).join(", ")}`);
    process.exitCode = 1;
    return;
  }

  console.log(apply ? "APPLYING changes.\n" : "DRY RUN — nothing will be written. Pass --apply to write.\n");

  let touched = 0;
  let missing = 0;

  for (const [slug, entry] of Object.entries(CONVERSION_CATALOG)) {
    if (only.length > 0 && !only.includes(slug)) continue;

    const [row] = await db.select().from(services).where(eq(services.slug, slug)).limit(1);
    if (!row) {
      console.log(`  missing   ${slug} — no such service in the catalog.`);
      missing++;
      continue;
    }

    const patch: Record<string, unknown> = {};
    const plan: string[] = [];

    if (isEmpty(row.formNo) && entry.formNo) {
      patch.formNo = entry.formNo;
      plan.push(`form_no "${entry.formNo}"`);
    }
    if (isEmpty(row.description) && entry.description) {
      patch.description = entry.description;
      plan.push("about");
    }
    if (isEmpty(row.whoCanApply) && entry.whoCanApply) {
      patch.whoCanApply = entry.whoCanApply;
      plan.push("who can apply");
    }
    if (isEmpty(row.actsRules) && entry.actsRules) {
      patch.actsRules = entry.actsRules;
      plan.push("acts & rules");
    }
    if (isEmpty(row.wizardRules)) {
      patch.wizardRules = JSON.stringify(entry.rules);
      plan.push("stepper rules");
    }

    const hasFeeLines = !!row.feeLines && row.feeLines.trim() !== "" && row.feeLines.trim() !== "[]";
    if (!hasFeeLines && entry.feeLines && entry.feeLines.length > 0) {
      patch.feeLines = JSON.stringify(entry.feeLines);
      patch.professionalFee = listPrice(entry.feeLines);
      plan.push(`fee lines (${entry.feeLines.map((l) => `${l.label} ₹${l.amount}`).join(", ")})`);
    }

    const existingDocs = await db
      .select({ id: documentTypes.id })
      .from(documentTypes)
      .where(eq(documentTypes.serviceId, row.id));
    const insertDocs = existingDocs.length === 0 && entry.documents.length > 0;
    if (insertDocs) plan.push(`${entry.documents.length} documents`);

    if (row.documentsCount == null && entry.documents.length > 0 && existingDocs.length === 0) {
      patch.documentsCount = entry.documents.length;
    }

    if (plan.length === 0) {
      console.log(`  unchanged ${slug} — already authored`);
      continue;
    }

    console.log(`  ${apply ? "updated " : "would set"} ${slug}: ${plan.join(", ")}`);
    touched++;

    if (!apply) continue;

    if (Object.keys(patch).length > 0) {
      await db.update(services).set(patch).where(eq(services.id, row.id));
    }
    if (insertDocs) {
      await db
        .insert(documentTypes)
        .values(entry.documents.map((name) => ({ serviceId: row.id, name, mandatory: true })));
    }
  }

  console.log(`\n${apply ? "✅ Done" : "Preview complete"}. ${apply ? "updated" : "would update"}=${touched} missing=${missing}`);
}

run()
  .catch((err) => {
    console.error("Conversion backfill failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
