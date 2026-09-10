/**
 * Fills the Business Closure catalog rows from `config/closureCatalog.ts`
 * (the two closure docx files + the closure application HTML), and creates the
 * Trust and Section 8 sub-type rows the applicant picks between.
 *
 * DRY RUN BY DEFAULT. `backend/.env` points at the live database, so the script
 * prints what it would do and changes nothing unless `--apply` is passed:
 *
 *   npm run db:backfill:closures                  # preview
 *   npm run db:backfill:closures -- --apply       # write
 *   npm run db:backfill:closures -- --apply closure-llp
 *
 * Sub-type rows (those with a `parent`) are created when missing, inactive, in
 * the parent's subcategory — hidden from the sidebar, nested under the parent in
 * Admin → Services. Everything else only fills a gap, so admin-authored content
 * is never replaced:
 *   - description / who_can_apply / acts_rules / form_no   only when empty or "—"
 *   - tabs (for the extra docx sections)                   only when unset
 *   - document_types                                       only when the service has none
 *   - documents_count (home-card chip)                     only when unset
 *   - fee_lines (+ professional_fee, as the admin editor saves it)  only when the service has none
 * Safe to run more than once.
 */
import { db, pool } from "../config/db.js";
import { services, documentTypes } from "../models/schema.js";
import { eq } from "drizzle-orm";
import { CLOSURE_CATALOG, type ClosureCatalogEntry } from "../config/closureCatalog.js";

const isEmpty = (v: string | null | undefined) => !v || v.trim() === "" || v.trim() === "—";
const hasJsonList = (v: string | null | undefined) => !!v && v.trim() !== "" && v.trim() !== "[]";
/**
 * What the admin editor writes to professional_fee when it saves fee lines: the
 * "Professional Fee" line if there is one, otherwise the lines' total. Keeping
 * the column in step makes the admin list show the same price the editor would.
 */
const listPrice = (lines: { label: string; amount: number }[]) =>
  (lines.find((l) => /professional/i.test(l.label))?.amount ??
    lines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0)).toFixed(2);
const tabId = (title: string) => "custom_" + title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

/** The service-page tabs: the four standard ones plus the docx's extra sections. */
function buildTabs(entry: ClosureCatalogEntry, about: string, who: string, acts: string) {
  const extra = (entry.extraTabs ?? []).map((t) => ({
    id: tabId(t.title),
    title: t.title,
    content: t.content,
    visible: true,
    isCustom: true,
    afterWho: !!t.afterWho,
  }));
  const strip = ({ afterWho: _a, ...t }: (typeof extra)[number]) => t;
  return [
    { id: "about", title: "About", content: about, visible: true },
    { id: "who", title: "Who can Apply", content: who, visible: true },
    ...extra.filter((t) => t.afterWho).map(strip),
    { id: "documents", title: "Documents", content: "", visible: true },
    { id: "acts", title: "Acts and Rules", content: acts, visible: !!acts.trim() },
    ...extra.filter((t) => !t.afterWho).map(strip),
  ];
}

async function run() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const only = args.filter((a) => !a.startsWith("--")).map((s) => s.trim().toLowerCase());

  const unknown = only.filter((s) => !(s in CLOSURE_CATALOG));
  if (unknown.length > 0) {
    console.error(`Unknown slug(s): ${unknown.join(", ")}.\nKnown: ${Object.keys(CLOSURE_CATALOG).join(", ")}`);
    process.exitCode = 1;
    return;
  }

  console.log(apply ? "APPLYING changes.\n" : "DRY RUN — nothing will be written. Pass --apply to write.\n");

  let touched = 0;
  let missing = 0;

  for (const [slug, entry] of Object.entries(CLOSURE_CATALOG)) {
    if (only.length > 0 && !only.includes(slug)) continue;

    let [row] = await db.select().from(services).where(eq(services.slug, slug)).limit(1);
    const plan: string[] = [];

    const [parent] = entry.parent
      ? await db.select().from(services).where(eq(services.slug, entry.parent)).limit(1)
      : [];

    if (!row) {
      if (!entry.parent || !parent) {
        console.log(`  missing   ${slug} — not in the catalog${entry.parent ? ` (parent ${entry.parent} missing too)` : ""}.`);
        missing++;
        continue;
      }
      plan.push(`create inactive sub-type "${entry.name}" under ${entry.parent}`);
      if (apply) {
        [row] = await db
          .insert(services)
          .values({
            subcategoryId: parent.subcategoryId,
            name: entry.name ?? slug,
            shortTitle: entry.shortTitle ?? entry.name ?? slug,
            slug,
            authority: parent.authority,
            icon: parent.icon,
            active: false,
            professionalFee: "0",
            govtFee: "0",
            gstPercent: "0",
          })
          .returning();
      }
    }

    // In a dry run a new sub-type has no row yet; plan against an empty one.
    const cur = row ?? ({} as Partial<typeof services.$inferSelect>);
    const patch: Record<string, unknown> = {};

    if (isEmpty(cur.formNo) && entry.formNo) {
      patch.formNo = entry.formNo;
      plan.push(`form_no "${entry.formNo}"`);
    }
    const about = isEmpty(cur.description) ? entry.description : cur.description!;
    const who = isEmpty(cur.whoCanApply) ? entry.whoCanApply : cur.whoCanApply!;
    const acts = isEmpty(cur.actsRules) ? entry.actsRules : cur.actsRules!;
    if (isEmpty(cur.description) && entry.description) {
      patch.description = entry.description;
      plan.push("about");
    }
    if (isEmpty(cur.whoCanApply) && entry.whoCanApply) {
      patch.whoCanApply = entry.whoCanApply;
      plan.push("who can apply");
    }
    if (isEmpty(cur.actsRules) && entry.actsRules) {
      patch.actsRules = entry.actsRules;
      plan.push("acts & rules");
    }
    if (!hasJsonList(cur.tabs) && (entry.extraTabs ?? []).length > 0) {
      patch.tabs = JSON.stringify(buildTabs(entry, about, who, acts));
      plan.push(`tabs (+ ${(entry.extraTabs ?? []).map((t) => t.title).join(", ")})`);
    }

    if (!hasJsonList(cur.feeLines) && entry.feeLines && entry.feeLines.length > 0) {
      patch.feeLines = JSON.stringify(entry.feeLines);
      patch.professionalFee = listPrice(entry.feeLines);
      plan.push(`fee lines (${entry.feeLines.map((l) => `${l.label} ₹${l.amount}`).join(", ")})`);
    }

    const existingDocs = row
      ? await db.select({ id: documentTypes.id }).from(documentTypes).where(eq(documentTypes.serviceId, row.id))
      : [];
    const insertDocs = existingDocs.length === 0 && entry.documents.length > 0;
    if (insertDocs) {
      plan.push(`${entry.documents.length} documents`);
      if (cur.documentsCount == null) patch.documentsCount = entry.documents.length;
    }

    if (plan.length === 0) {
      console.log(`  unchanged ${slug} — already authored`);
      continue;
    }

    console.log(`  ${apply ? "updated " : "would set"} ${slug}: ${plan.join(", ")}`);
    touched++;

    if (!apply || !row) continue;

    if (Object.keys(patch).length > 0) {
      await db.update(services).set(patch).where(eq(services.id, row.id));
    }
    if (insertDocs) {
      await db
        .insert(documentTypes)
        .values(entry.documents.map((name) => ({ serviceId: row!.id, name, mandatory: true })));
    }
  }

  console.log(`\n${apply ? "✅ Done" : "Preview complete"}. ${apply ? "updated" : "would update"}=${touched} missing=${missing}`);
}

run()
  .catch((err) => {
    console.error("Closure backfill failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
