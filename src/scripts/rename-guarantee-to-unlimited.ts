// One-off, targeted rename: the "company-guarantee" catalog row is being
// re-surfaced as "Unlimited Company". This updates ONLY that single row's display
// name and short title — it deliberately does not touch the slug (existing
// registrations reference it), fees, tabs, wizardRules or any other service, so
// admin catalog edits are preserved. Safe to run more than once.
import { db } from "../config/db.js";
import { services } from "../models/schema.js";
import { eq } from "drizzle-orm";

const SLUG = "company-guarantee";
const NEW_NAME = "Unlimited Company";
const NEW_SHORT = "Unlimited Co.";

async function run() {
  const [before] = await db
    .select({ id: services.id, slug: services.slug, name: services.name, shortTitle: services.shortTitle, wizardRules: services.wizardRules })
    .from(services)
    .where(eq(services.slug, SLUG))
    .limit(1);

  if (!before) {
    console.log(`No service found with slug "${SLUG}". Nothing to rename.`);
    return;
  }

  console.log("BEFORE:", before);

  if (before.name === NEW_NAME) {
    console.log("Already named", NEW_NAME, "— no change needed.");
    return;
  }

  await db
    .update(services)
    .set({ name: NEW_NAME, shortTitle: NEW_SHORT })
    .where(eq(services.slug, SLUG));

  const [after] = await db
    .select({ id: services.id, slug: services.slug, name: services.name, shortTitle: services.shortTitle })
    .from(services)
    .where(eq(services.slug, SLUG))
    .limit(1);

  console.log("AFTER: ", after);

  // The name suffix ("Private Limited / Limited") comes from code
  // (COMPANY_TYPE_DEFAULTS["guarantee"]) and only applies if the row has no
  // wizardRules.suffix override. Flag it if one exists so it can be cleared.
  if (before.wizardRules) {
    try {
      const parsed = JSON.parse(before.wizardRules);
      if (parsed && typeof parsed.suffix === "string" && parsed.suffix.trim()) {
        console.log(
          `\n⚠️  This row has a saved wizardRules.suffix = "${parsed.suffix}" which OVERRIDES the code default. ` +
            `Clear it in Admin → Services if you want the "Private Limited / Limited" dropdown.`,
        );
      }
    } catch {
      /* ignore malformed json */
    }
  }

  console.log("\n✅ Done.");
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Rename failed:", err);
    process.exit(1);
  });
