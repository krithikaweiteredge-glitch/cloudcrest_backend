import { Request, Response } from "express";
import { db } from "../config/db.js";
import { businesses, mcaCompanies, mcaStruckOff } from "../models/schema.js";
import { and, eq, like, sql, type SQL } from "drizzle-orm";

/** A company match returned to the client. */
type CompanyMatch = { id?: number; name: string; domain?: string; industry?: string; location?: string };

/** Collapse a name to a comparable key (lowercase, alphanumerics only). */
const normalizeName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// Legal-suffix tokens stripped from the END of a normalized (alnum-only) name,
// longest first. Short/ambiguous tokens (co, inc, corp) are excluded so brand
// words like "pepsico" aren't truncated.
const SUFFIX_TOKENS = [
  "limitedliabilitypartnership", "onepersoncompany", "producercompany",
  "privatelimited", "publiclimited", "companylimited", "nidhilimited",
  "privateltd", "pvtlimited", "pvtltd", "section8",
  "private", "public", "limited", "company", "nidhi",
  "llp", "opc", "llc", "ltd", "pvt",
].sort((a, b) => b.length - a.length);

/**
 * Brand key used to match a proposed name against the registry. Normalize to
 * alphanumerics FIRST, then strip trailing legal-suffix tokens — so "Acme Tech
 * Private Limited", "Acme Tech Pvt. Ltd.", "Acme Tech LLP" and even the glued
 * source form "Acme Tech PRIVATELIMITED" all reduce to "acmetech". This MUST
 * mirror `core_key()` in scripts/mca-import/project_lean.py, which built the index.
 */
function coreKey(name: string): string {
  let s = normalizeName(name);
  let changed = true;
  while (changed && s.length >= 3) {
    changed = false;
    for (const tok of SUFFIX_TOKENS) {
      if (s.length - tok.length >= 3 && s.endsWith(tok)) {
        s = s.slice(0, -tok.length);
        changed = true;
        break;
      }
    }
  }
  return s;
}

/** Human-readable entity type from the index's kind/class. */
function mcaEntityType(kind: string, klass: string | null): string {
  if (kind === "llp") return "LLP";
  if (kind === "foreign") return "Foreign Company";
  if (klass && /public/i.test(klass)) return "Public Limited Company";
  return "Private Limited Company";
}

/** Normalize a source date to YYYY-MM-DD where possible (DD-MM-YYYY is common). */
function toIsoDate(d: string | null): string | null {
  if (!d) return null;
  const s = d.trim();
  let m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/); // DD-MM-YYYY
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; // already ISO
  return s;
}

/** Shape an mca_companies row into the match object the client renders. */
function toMatch(r: { name: string; kind: string; klass: string | null; companyType: string | null; identifier: string | null; regDate: string | null }): CompanyMatch {
  const industry = [r.klass, r.companyType].filter(Boolean).join(" · ") || undefined;
  const location = r.identifier ? `${r.identifier}${r.regDate ? ` · ${r.regDate}` : ""}` : r.regDate || undefined;
  return { name: r.name, industry, location };
}

// 1. MCA NAME AVAILABILITY CHECKER — answered from the local MCA registry index.
export async function checkNameAvailability(req: Request, res: Response) {
  try {
    const { name } = req.body;

    if (!name || name.trim().length < 3) {
      return res.status(400).json({ error: "Company name must be at least 3 characters long" });
    }

    const trimmedName = name.trim();

    // Check for restricted Indian corporate registry keywords. Word boundaries
    // matter: without them "National" matches inside "Inter‑national" and "India"
    // inside "Indian", wrongly blocking legitimate names.
    const restrictedKeywords = /\b(India|National|Bharat|President|Bank|Reserve|Insurance|Govt)\b/i;
    if (restrictedKeywords.test(trimmedName)) {
      return res.status(200).json({
        available: false,
        reason: "Contains restricted keywords (e.g., India, Bank, Govt) which require Central Government approval.",
      });
    }

    // Check if the business name already exists in our own registration records.
    const dbCheck = await db
      .select()
      .from(businesses)
      .where(eq(businesses.businessName, trimmedName))
      .limit(1);

    if (dbCheck.length > 0) {
      return res.status(200).json({
        available: false,
        reason: "Exact name match found in registration records. Name is not unique.",
      });
    }

    // Does a company with this name already exist in the MCA registry? Look up the
    // brand key (name without its legal suffix) in the local index. Any hit means
    // the brand is already taken — regardless of the Private Limited / LLP / Limited
    // suffix the applicant chose.
    const core = coreKey(trimmedName);

    const rows = core
      ? await db
          .select({
            name: mcaCompanies.name,
            kind: mcaCompanies.kind,
            klass: mcaCompanies.klass,
            companyType: mcaCompanies.companyType,
            identifier: mcaCompanies.identifier,
            regDate: mcaCompanies.regDate,
          })
          .from(mcaCompanies)
          .where(eq(mcaCompanies.coreNorm, core))
          .limit(5)
      : [];

    if (rows.length > 0) {
      // Distinguish an exact-name collision from a same-brand collision for a
      // clearer message, but both make the proposed name unavailable.
      const wantedFull = normalizeName(trimmedName);
      const exact = rows.find((r) => normalizeName(r.name) === wantedFull);
      const reason = exact
        ? `“${trimmedName}” is already registered with the MCA: ${exact.name}.`
        : `“${trimmedName}” is not available — a company already uses this name: ${rows[0].name}.`;
      return res.status(200).json({
        available: false,
        reason,
        matches: rows.map(toMatch),
        source: "mca",
      });
    }

    // Not in the active registry — is it a struck-off name? A struck-off company
    // can be restored within 20 years (Companies Act s.252), so its name is still
    // restricted for reuse. Report it unavailable with a struck-off note.
    const struck = core
      ? await db
          .select({
            name: mcaStruckOff.name,
            kind: mcaStruckOff.kind,
            identifier: mcaStruckOff.identifier,
            month: mcaStruckOff.month,
          })
          .from(mcaStruckOff)
          .where(eq(mcaStruckOff.coreNorm, core))
          .limit(5)
      : [];

    if (struck.length > 0) {
      return res.status(200).json({
        available: false,
        reason:
          `“${trimmedName}” belongs to a struck-off ${struck[0].kind === "llp" ? "LLP" : "company"}: ` +
          `${struck[0].name}. Struck-off names stay restricted (the entity can be restored within 20 years), ` +
          `so this name is not available.`,
        matches: struck.map((r) => ({
          name: r.name,
          industry: `Struck off${r.kind === "llp" ? " · LLP" : ""}`,
          location: [r.identifier, r.month].filter(Boolean).join(" · ") || undefined,
        })),
        source: "mca-struck-off",
      });
    }

    // No collision in the active registry or struck-off list — appears available.
    return res.status(200).json({
      available: true,
      message: `“${trimmedName}” appears to be available.`,
      source: "mca",
    });
  } catch (error: any) {
    console.error("MCA name check error:", error);
    return res.status(500).json({
      error: "Failed to process MCA name check",
    });
  }
}

// 1b. SIMILAR EXISTING NAMES — live "as you type" suggestions of already-registered
// companies whose brand begins with what the applicant has typed. Powers the home
// search's "similar existing companies" preview so the user can pick a distinctive
// name. Uses the same brand key + index as the availability check (a prefix scan,
// fast under the DB's C collation).
export async function getSimilarNames(req: Request, res: Response) {
  try {
    const q = String(req.query.q ?? "").trim();
    const core = coreKey(q);
    // Need a couple of characters before a prefix scan is meaningful.
    if (core.length < 2) return res.status(200).json({ matches: [] });

    // Restrict to the entity type chosen in the dropdown, so a Private Limited
    // search only surfaces private companies, LLP only LLPs, and Limited only
    // public companies. Class data is messy, so `public` = class matches "publ"
    // and `private` = every other Indian company (OPC variants included).
    const type = String(req.query.type ?? "").toLowerCase();
    const conds: SQL[] = [like(mcaCompanies.coreNorm, `${core}%`)];
    if (type === "llp") {
      conds.push(eq(mcaCompanies.kind, "llp"));
    } else if (type === "public" || type === "limited") {
      conds.push(eq(mcaCompanies.kind, "indian"));
      conds.push(sql`${mcaCompanies.klass} ~* 'publ'`);
    } else if (type === "private") {
      conds.push(eq(mcaCompanies.kind, "indian"));
      conds.push(sql`(${mcaCompanies.klass} IS NULL OR ${mcaCompanies.klass} !~* 'publ')`);
    }

    const rows = await db
      .select({
        name: mcaCompanies.name,
        kind: mcaCompanies.kind,
        klass: mcaCompanies.klass,
        companyType: mcaCompanies.companyType,
        identifier: mcaCompanies.identifier,
        regDate: mcaCompanies.regDate,
      })
      .from(mcaCompanies)
      .where(and(...conds))
      // Shortest brands first — the closest matches to what was typed.
      .orderBy(sql`length(${mcaCompanies.coreNorm})`)
      .limit(6);

    return res.status(200).json({ matches: rows.map(toMatch) });
  } catch (error: any) {
    console.error("MCA similar-names error:", error);
    return res.status(500).json({ error: "Failed to fetch similar names" });
  }
}

// 2. MCA CIN LOOKUP
export async function getCompanyDetails(req: Request, res: Response) {
  try {
    const { cin } = req.body;

    if (!cin) {
      return res.status(400).json({ error: "CIN or LLPIN is required" });
    }

    const trimmedCin = cin.trim().toUpperCase();

    // Lookup if it is an existing registered business in our database
    const dbRecord = await db
      .select()
      .from(businesses)
      .where(eq(businesses.cin, trimmedCin))
      .limit(1);

    if (dbRecord.length > 0) {
      const b = dbRecord[0];
      return res.status(200).json({
        found: true,
        company: {
          cin: b.cin,
          name: b.businessName,
          entityType: b.entityType || "Private Limited Company",
          incorporationDate: b.incorporationDate,
          state: b.state,
          city: b.city,
          pincode: b.pincode,
          address: b.address,
          postalAddress: b.postalAddress || b.address,
          status: b.status,
          directors: b.directors,
        },
      });
    }

    // Otherwise look the CIN/LLPIN up in the MCA registry index. We only hold the
    // core fields (name, class, incorporation date) — address/directors aren't in
    // the lean index, so they're returned empty and the form keeps its own values.
    const mca = await db
      .select({
        identifier: mcaCompanies.identifier,
        name: mcaCompanies.name,
        kind: mcaCompanies.kind,
        klass: mcaCompanies.klass,
        regDate: mcaCompanies.regDate,
      })
      .from(mcaCompanies)
      .where(eq(mcaCompanies.identifier, trimmedCin))
      .limit(1);

    if (mca.length > 0) {
      const m = mca[0];
      return res.status(200).json({
        found: true,
        company: {
          cin: m.identifier,
          name: m.name,
          entityType: mcaEntityType(m.kind, m.klass),
          incorporationDate: toIsoDate(m.regDate),
          status: "active",
        },
      });
    }

    // Struck-off entities are still looked up so the user learns the status.
    const struck = await db
      .select({ identifier: mcaStruckOff.identifier, name: mcaStruckOff.name, kind: mcaStruckOff.kind, month: mcaStruckOff.month })
      .from(mcaStruckOff)
      .where(eq(mcaStruckOff.identifier, trimmedCin))
      .limit(1);

    if (struck.length > 0) {
      const s = struck[0];
      return res.status(200).json({
        found: true,
        company: {
          cin: s.identifier,
          name: s.name,
          entityType: s.kind === "llp" ? "LLP" : "Company",
          status: "struck_off",
          struckOffMonth: s.month,
        },
      });
    }

    // Not in our registration records or the MCA index.
    return res.status(200).json({
      found: false,
      message: "No company found for this CIN/LLPIN in the MCA registry index.",
    });
  } catch (error: any) {
    console.error("MCA company lookup error:", error);
    return res.status(500).json({
      error: "Failed to process MCA company lookup",
    });
  }
}
