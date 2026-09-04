/**
 * One-off backfill for the four registrations the client specified and priced:
 * DIN, DGFT IEC, Global LEI and RERA.
 *
 * `seed-catalog.ts` is insert-only, so on a database where these rows already
 * exist (they were seeded as bare `min()` rows — identity only, no fee, no copy,
 * no checklist) re-running the seed changes nothing. This script fills them in
 * from `config/registrationCatalog.ts`, the same source the seed now uses.
 *
 *   npm run db:backfill:registrations
 *
 * What it writes, per row:
 *   - professional_fee / govt_fee / gst_percent  ALWAYS overwritten. These are
 *     the prices the client gave us (999 + 18% for DIN / IEC / LEI, 5999 + 18%
 *     for RERA) and are the whole point of the backfill.
 *   - description / who_can_apply / authority / form_no  filled ONLY when the
 *     column is currently empty (or "—"), so admin-authored copy is never lost.
 *   - document_types  inserted ONLY when the service has no checklist rows at
 *     all, so an admin-curated checklist is never duplicated or replaced.
 *
 * Safe to run more than once: the fee columns settle on the same figures and
 * every other write is conditional. Prints exactly what it touched.
 */
import { db, pool } from "../config/db.js";
import { services, documentTypes } from "../models/schema.js";
import { eq } from "drizzle-orm";
import { REGISTRATION_CATALOG } from "../config/registrationCatalog.js";

/** Treat null, blank and the catalog's "not known" dash as "no value set". */
const isEmpty = (v: string | null | undefined) => !v || v.trim() === "" || v.trim() === "—";

async function run() {
  let updated = 0;
  let missing = 0;

  // Optional slug filter: `npm run db:backfill:registrations -- din iec`.
  // No arguments backfills every registration in the map.
  const only = process.argv.slice(2).map((s) => s.trim().toLowerCase()).filter(Boolean);
  const entries = Object.entries(REGISTRATION_CATALOG).filter(
    ([slug]) => only.length === 0 || only.includes(slug)
  );

  if (only.length > 0) {
    const unknown = only.filter((s) => !(s in REGISTRATION_CATALOG));
    if (unknown.length > 0) {
      console.error(
        `Unknown slug(s): ${unknown.join(", ")}. ` +
          `Known: ${Object.keys(REGISTRATION_CATALOG).join(", ")}`
      );
      process.exitCode = 1;
      return;
    }
    console.log(`Backfilling only: ${only.join(", ")}\n`);
  }

  for (const [slug, entry] of entries) {
    const [row] = await db.select().from(services).where(eq(services.slug, slug)).limit(1);

    if (!row) {
      console.log(`  missing  ${slug.padEnd(6)} — no such service. Run "npm run db:seed:catalog" first.`);
      missing++;
      continue;
    }

    // Pricing is the client's, and always wins.
    const patch: Record<string, unknown> = {
      professionalFee: entry.professionalFee.toFixed(2),
      govtFee: entry.govtFee.toFixed(2),
      gstPercent: entry.gstPercent.toFixed(2),
    };
    const filled: string[] = [];

    // Copy and identity only fill gaps — an admin may have authored these.
    if (isEmpty(row.description)) {
      patch.description = entry.description;
      filled.push("description");
    }
    if (isEmpty(row.whoCanApply)) {
      patch.whoCanApply = entry.whoCanApply;
      filled.push("whoCanApply");
    }
    if (isEmpty(row.authority)) {
      patch.authority = entry.authority;
      filled.push("authority");
    }
    if (isEmpty(row.formNo) && !isEmpty(entry.formNo)) {
      patch.formNo = entry.formNo;
      filled.push("formNo");
    }

    await db.update(services).set(patch).where(eq(services.id, row.id));

    // The checklist is inserted only into a service that has none, so an
    // admin-curated list is never duplicated.
    const existingDocs = await db
      .select({ id: documentTypes.id })
      .from(documentTypes)
      .where(eq(documentTypes.serviceId, row.id));

    if (existingDocs.length === 0 && entry.documents.length > 0) {
      await db.insert(documentTypes).values(
        entry.documents.map((name) => ({ serviceId: row.id, name, mandatory: true }))
      );
      filled.push(`${entry.documents.length} documents`);
    }

    const gstAmount = Math.round((entry.professionalFee * entry.gstPercent) / 100);
    console.log(
      `  updated  ${slug.padEnd(6)} ₹${entry.professionalFee} + ${entry.gstPercent}% GST ` +
        `(₹${gstAmount}) = ₹${entry.professionalFee + entry.govtFee + gstAmount}` +
        (filled.length > 0 ? `  · also filled: ${filled.join(", ")}` : "  · fees only (rest already authored)")
    );
    updated++;
  }

  console.log(`\n✅ Done. updated=${updated} missing=${missing}`);
}

run()
  .catch((err) => {
    console.error("Registration backfill failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
