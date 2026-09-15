/**
 * Rolls the client's "Fee and changes required in closures" document out to the
 * Business Closure catalog rows, from `config/closureCatalog.ts`:
 *
 *   - fee lines (+ professional_fee, as the admin editor saves it) and form_no —
 *     REPLACED, since this is a new price list;
 *   - the service-page "Fees" / "MCA Fee" tab — removed; the fees are shown in
 *     the application's fee step, priced by the backend;
 *   - About for Nidhi and Public Trust — filled only when empty, so copy the
 *     admin has written is never replaced (a differing one is reported).
 *
 * MGT-14 is not written — the backend computes it per application from the
 * authorised capital (`config/closureFees.ts`). The Section 8 routes aren't in
 * the document and are left alone.
 *
 * DRY RUN BY DEFAULT. `backend/.env` points at the live database:
 *
 *   npm run db:apply:closure-fees                 # preview
 *   npm run db:apply:closure-fees -- --apply      # write
 */
import { db, pool } from "../config/db.js";
import { services } from "../models/schema.js";
import { eq } from "drizzle-orm";
import { CLOSURE_CATALOG } from "../config/closureCatalog.js";

const SLUGS = [
  "closure-pvt",
  "closure-public",
  "closure-opc",
  "closure-nidhi",
  "closure-llp",
  "closure-partnership",
  "closure-trust-public",
  "closure-trust-private",
  "closure-society",
];

/** Custom service-page tabs that carried fee amounts — dropped. */
const FEE_TAB_TITLES = new Set(["fees", "mca fee"]);

type Tab = { id: string; title: string; content: string; visible: boolean; isCustom?: boolean };

const isEmpty = (v: string | null | undefined) => !v || v.trim() === "" || v.trim() === "—";
const describe = (lines: { label: string; amount: number }[]) =>
  lines.map((l) => `${l.label} ₹${l.amount}`).join(", ") || "(none)";

function parseList<T>(raw: string | null | undefined): T[] {
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function run() {
  const apply = process.argv.slice(2).includes("--apply");
  console.log(apply ? "APPLYING changes.\n" : "DRY RUN — nothing will be written. Pass --apply to write.\n");

  let touched = 0;
  let missing = 0;

  for (const slug of SLUGS) {
    const entry = CLOSURE_CATALOG[slug];
    if (!entry?.feeLines?.length) {
      console.log(`  skipped   ${slug} — no fee lines in closureCatalog.ts`);
      continue;
    }

    const [row] = await db.select().from(services).where(eq(services.slug, slug)).limit(1);
    if (!row) {
      console.log(`  missing   ${slug} — no such service in the catalog (run db:backfill:closures first).`);
      missing++;
      continue;
    }

    const patch: Record<string, unknown> = {};
    const plan: string[] = [];

    const currentLines = parseList<{ label: string; amount: number }>(row.feeLines);
    patch.feeLines = JSON.stringify(entry.feeLines);
    // The admin list shows this column as the service's price.
    patch.professionalFee = (entry.feeLines.find((l) => /professional/i.test(l.label))?.amount ?? 0).toFixed(2);
    plan.push(`fee lines: ${describe(currentLines)}  →  ${describe(entry.feeLines)}`);

    if (entry.formNo && row.formNo !== entry.formNo) {
      patch.formNo = entry.formNo;
      plan.push(`form no:   ${row.formNo || "(none)"}  →  ${entry.formNo}`);
    }

    // About — only fill a gap.
    let aboutFilled = false;
    if (entry.description) {
      if (isEmpty(row.description)) {
        patch.description = entry.description;
        aboutFilled = true;
        plan.push("about:     (empty)  →  fee document's About");
      } else if (row.description!.trim() !== entry.description.trim()) {
        plan.push("about:     kept — the row already has admin-written About copy");
      }
    }

    // Tabs are only stored once customised; otherwise the page builds them from the fields.
    const tabs = parseList<Tab>(row.tabs);
    if (tabs.length > 0) {
      const next: Tab[] = [];
      let changed = false;
      for (const t of tabs) {
        if (t.isCustom && FEE_TAB_TITLES.has(t.title.trim().toLowerCase())) {
          changed = true;
          continue;
        }
        if (t.id === "about" && aboutFilled && isEmpty(t.content)) {
          next.push({ ...t, content: entry.description });
          changed = true;
          continue;
        }
        next.push(t);
      }
      if (changed) {
        patch.tabs = JSON.stringify(next);
        const before = tabs.filter((t) => t.isCustom).map((t) => t.title).join(", ") || "(none)";
        const after = next.filter((t) => t.isCustom).map((t) => t.title).join(", ") || "(none)";
        plan.push(`tabs:      custom [${before}]  →  [${after}]`);
      }
    }

    console.log(`  ${apply ? "updated  " : "would set"} ${slug}`);
    for (const p of plan) console.log(`      ${p}`);
    touched++;

    if (apply) await db.update(services).set(patch).where(eq(services.id, row.id));
  }

  console.log(`\n${apply ? "✅ Done" : "Preview complete"}. ${apply ? "updated" : "would update"}=${touched} missing=${missing}`);
}

run()
  .catch((err) => {
    console.error("Closure fee update failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
