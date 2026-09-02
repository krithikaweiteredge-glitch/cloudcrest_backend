import { Request, Response } from "express";
import { db } from "../config/db.js";
import { env } from "../config/env.js";
import { businesses, mcaCompanies, mcaStruckOff } from "../models/schema.js";
import { and, eq, like, sql, type SQL } from "drizzle-orm";

/** A company match returned to the client. */
type CompanyMatch = {
  id?: number;
  name: string;
  domain?: string;
  industry?: string;
  location?: string;
  status?: string;
  companyStatus?: string;
  identifier?: string;
};

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
  return {
    name: r.name,
    industry,
    location,
    identifier: r.identifier || undefined,
    companyStatus: "Active",
    status: "Active",
  };
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

    const core = coreKey(trimmedName);

    // Check if the name exists in the struck-off list FIRST. Struck-off entities can be
    // restored within 20 years (Companies Act s.252), so their names stay restricted.
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
          identifier: r.identifier || undefined,
          industry: r.kind === "llp" ? "Limited Liability Partnership" : "Company",
          location: [r.identifier, r.month].filter(Boolean).join(" · ") || undefined,
          companyStatus: "Strike Off",
          status: "Strike Off",
        })),
        source: "mca-struck-off",
      });
    }


    // Does a company with this name already exist in the active MCA registry? Look up the
    // brand key (name without its legal suffix) in the local index.
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

    // Secondary verification check against data.gov.in API for the exact legal name
    const govMatch = await fetchMcaGovDataByName(trimmedName);
    if (govMatch) {
      return res.status(200).json({
        available: false,
        reason: `“${trimmedName}” is already registered with the MCA: ${govMatch.name}.`,
        matches: [govMatch],
        source: "data.gov.in",
      });
    }

    // No collision in the active registry, struck-off list, or government API — appears available.
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
// companies & LLPs (including struck-off entities) whose brand begins with what the
// applicant has typed. Powers the home search's "similar existing companies" preview.
export async function getSimilarNames(req: Request, res: Response) {
  try {
    const q = String(req.query.q ?? "").trim();
    const core = coreKey(q);
    const minLen = Math.min(q.length, core.length);
    if (minLen < 2) return res.status(200).json({ matches: [] });

    const type = String(req.query.type ?? "").toLowerCase();

    // 1. Query Active MCA Companies filtered by selected entity structure
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

    const activeRows = await db
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
      .orderBy(sql`length(${mcaCompanies.coreNorm})`)
      .limit(6);

    const activeMatches = activeRows.map(toMatch);

    // 2. Query Struck-Off Entities filtered by entity type
    const struckConds: SQL[] = [like(mcaStruckOff.coreNorm, `${core}%`)];
    if (type === "llp") {
      struckConds.push(eq(mcaStruckOff.kind, "llp"));
    } else if (type === "private" || type === "public" || type === "limited") {
      struckConds.push(eq(mcaStruckOff.kind, "company"));
    }

    const struckRows = await db
      .select({
        name: mcaStruckOff.name,
        kind: mcaStruckOff.kind,
        identifier: mcaStruckOff.identifier,
        month: mcaStruckOff.month,
      })
      .from(mcaStruckOff)
      .where(and(...struckConds))
      .orderBy(sql`length(${mcaStruckOff.coreNorm})`)
      .limit(6);

    const struckMatches: CompanyMatch[] = struckRows.map((r) => ({
      name: r.name,
      identifier: r.identifier || undefined,
      industry: r.kind === "llp" ? "Limited Liability Partnership" : "Company",
      location: [r.identifier, r.month].filter(Boolean).join(" · ") || undefined,
      companyStatus: "Strike Off",
      status: "Strike Off",
    }));


    // Combine active and struck-off matches, eliminating duplicate names if any
    const seenNames = new Set<string>();
    const combined: CompanyMatch[] = [];

    for (const m of [...activeMatches, ...struckMatches]) {
      const norm = normalizeName(m.name);
      if (!seenNames.has(norm)) {
        seenNames.add(norm);
        combined.push(m);
      }
    }

    // If few or no results found locally and user typed a substantive name, check data.gov.in API
    if (combined.length < 6 && q.length >= 3) {
      try {
        const govMatch = await fetchMcaGovDataByName(q);
        if (govMatch) {
          const isLlp = /\bllp\b/i.test(govMatch.name) || /llp/i.test(govMatch.industry || "");
          const isMatchForType =
            (type === "llp" && isLlp) ||
            (type === "private" && !isLlp) ||
            (type === "public" && /public/i.test(govMatch.industry || "")) ||
            !type;

          if (isMatchForType && !seenNames.has(normalizeName(govMatch.name))) {
            seenNames.add(normalizeName(govMatch.name));
            combined.unshift(govMatch);
          }
        }
      } catch {
        // ignore
      }
    }

    return res.status(200).json({ matches: combined.slice(0, 8) });
  } catch (error: any) {
    console.error("MCA similar-names error:", error);
    return res.status(500).json({ error: "Failed to fetch similar names" });
  }
}



/**
 * Fetch company master data directly from the official data.gov.in RoC Company Master Data API.
 * Provides rich metadata including registered office address, paid-up/authorized capital,
 * state code, and status.
 */
export async function fetchMcaGovData(cin: string) {
  const apiKey = env.dataGovInApiKey;
  if (!apiKey) return null;

  try {
    const url = `https://api.data.gov.in/resource/4dbe5667-7b6b-41d7-82af-211562424d9a?api-key=${encodeURIComponent(
      apiKey
    )}&format=json&filters%5BCIN%5D=${encodeURIComponent(cin)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!resp.ok) return null;
    const data = await resp.json();

    if (data?.records && Array.isArray(data.records) && data.records.length > 0) {
      const rec = data.records[0];
      const address = (rec.Registered_Office_Address || "").trim();
      const pinMatch = address.match(/\b(\d{6})\b/);
      const pincode = pinMatch ? pinMatch[1] : undefined;

      const isStruckOff = (rec.CompanyStatus || "").toLowerCase().includes("strike");

      return {
        cin: rec.CIN || cin,
        name: rec.CompanyName,
        entityType: rec.CompanyClass || rec.CompanyCategory || "Private Limited Company",
        incorporationDate: toIsoDate(rec.CompanyRegistrationdate_date),
        address,
        postalAddress: address,
        state: rec.CompanyStateCode || undefined,
        pincode,
        status: isStruckOff ? "struck_off" : "active",
        companyStatus: rec.CompanyStatus || (isStruckOff ? "Strike Off" : "Active"),
        authorizedCapital: rec.AuthorizedCapital,
        paidUpCapital: rec.PaidupCapital,
        roc: rec.CompanyROCcode,
        nicCode: rec.nic_code,
        industrialClassification: rec.CompanyIndustrialClassification,
        source: "data.gov.in",
      };
    }
  } catch (err: any) {
    console.warn("data.gov.in MCA API lookup warning:", err?.message || err);
  }
  return null;
}

/** Strip corporate suffixes from a raw string to get the base brand name */
function stripLegalSuffixes(name: string): string {
  return name
    .replace(/\b(\(?opc\)?\s*)?(private\s+limited|pvt\.?\s*ltd\.?|limited\s+liability\s+partnership|public\s+limited|company\s+limited|nidhi\s+limited|section\s*8|producer\s+company|limited|ltd\.?|llp|opc|pvt\.?)\b/gi, "")
    .replace(/[(),]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Check company name against data.gov.in API by checking the exact string as well as
 * common legal suffix variations (Private Limited, (OPC) Private Limited, Limited, LLP)
 * in parallel.
 */
export async function fetchMcaGovDataByName(companyName: string) {
  const apiKey = env.dataGovInApiKey;
  if (!apiKey || !companyName || companyName.trim().length < 3) return null;

  const trimmed = companyName.trim();
  const base = stripLegalSuffixes(trimmed);

  const candidateSet = new Set<string>();
  candidateSet.add(trimmed);
  candidateSet.add(trimmed.toUpperCase());
  if (base && base.length >= 3) {
    const uBase = base.toUpperCase();
    candidateSet.add(`${uBase} PRIVATE LIMITED`);
    candidateSet.add(`${uBase} (OPC) PRIVATE LIMITED`);
    candidateSet.add(`${uBase} OPC PRIVATE LIMITED`);
    candidateSet.add(`${uBase} (OPC) PVT LTD`);
    candidateSet.add(`${uBase} LIMITED`);
    candidateSet.add(`${uBase} LLP`);
    candidateSet.add(uBase);
    candidateSet.add(`${base} Private Limited`);
    candidateSet.add(`${base} (OPC) Private Limited`);
  }

  const candidateList = Array.from(candidateSet);


  const fetchCandidate = async (candidate: string) => {
    try {
      const url = `https://api.data.gov.in/resource/4dbe5667-7b6b-41d7-82af-211562424d9a?api-key=${encodeURIComponent(
        apiKey
      )}&format=json&filters%5BCompanyName%5D=${encodeURIComponent(candidate)}&limit=1`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!resp.ok) return null;
      const data = await resp.json();

      if (data?.records && Array.isArray(data.records) && data.records.length > 0) {
        const rec = data.records[0];
        return {
          name: rec.CompanyName,
          identifier: rec.CIN,
          industry: [rec.CompanyClass, rec.CompanyCategory].filter(Boolean).join(" · ") || undefined,
          location: rec.Registered_Office_Address || undefined,
          companyStatus: rec.CompanyStatus || undefined,
          status: rec.CompanyStatus || undefined,
          source: "data.gov.in",
        };
      }
    } catch {
      // Ignore network abort/timeout
    }
    return null;
  };


  try {
    const results = await Promise.all(candidateList.map((c) => fetchCandidate(c)));
    const matched = results.find((r) => r !== null);
    if (matched) return matched;
  } catch (err: any) {
    console.warn("data.gov.in parallel name-check warning:", err?.message || err);
  }

  return null;
}



// 2. MCA CIN LOOKUP (Hybrid: Database + data.gov.in RoC Master Data)
export async function getCompanyDetails(req: Request, res: Response) {
  try {
    const { cin } = req.body;

    if (!cin) {
      return res.status(400).json({ error: "CIN or LLPIN is required" });
    }

    const trimmedCin = cin.trim().toUpperCase();

    // 1. Lookup if it is an existing registered business in our database
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
          source: "database",
        },
      });
    }

    // 2. Query government API and local index in parallel for maximum speed and data richness
    const [govData, mcaRows, struckRows] = await Promise.all([
      fetchMcaGovData(trimmedCin),
      db
        .select({
          identifier: mcaCompanies.identifier,
          name: mcaCompanies.name,
          kind: mcaCompanies.kind,
          klass: mcaCompanies.klass,
          regDate: mcaCompanies.regDate,
        })
        .from(mcaCompanies)
        .where(eq(mcaCompanies.identifier, trimmedCin))
        .limit(1),
      db
        .select({
          identifier: mcaStruckOff.identifier,
          name: mcaStruckOff.name,
          kind: mcaStruckOff.kind,
          month: mcaStruckOff.month,
        })
        .from(mcaStruckOff)
        .where(eq(mcaStruckOff.identifier, trimmedCin))
        .limit(1),
    ]);

    // If government API returned enriched data (Address, Capital, Date, etc.)
    if (govData) {
      return res.status(200).json({
        found: true,
        company: govData,
      });
    }

    // Fallback to local active MCA index
    if (mcaRows.length > 0) {
      const m = mcaRows[0];
      return res.status(200).json({
        found: true,
        company: {
          cin: m.identifier,
          name: m.name,
          entityType: mcaEntityType(m.kind, m.klass),
          incorporationDate: toIsoDate(m.regDate),
          status: "active",
          source: "mca_local_index",
        },
      });
    }

    // Fallback to local struck-off index
    if (struckRows.length > 0) {
      const s = struckRows[0];
      return res.status(200).json({
        found: true,
        company: {
          cin: s.identifier,
          name: s.name,
          entityType: s.kind === "llp" ? "LLP" : "Company",
          status: "struck_off",
          struckOffMonth: s.month,
          source: "mca_struck_off",
        },
      });
    }

    // Not found
    return res.status(200).json({
      found: false,
      message: "No company found for this CIN/LLPIN in the MCA registry.",
    });
  } catch (error: any) {
    console.error("MCA company lookup error:", error);
    return res.status(500).json({
      error: "Failed to process MCA company lookup",
    });
  }
}

