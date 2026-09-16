/**
 * Catalog content for Professional Tax registration — source: the client's
 * "Professional Tax" document.
 *
 * Professional Tax is levied by the state, so the service is registered
 * state-wise exactly like the Labour Licence: the applicant picks Telangana,
 * Andhra Pradesh or Karnataka, and each state is its own inactive
 * `professional-tax-<state>` row nested under `professional-tax` in
 * Admin → Services. `scripts/backfill-professional-tax.ts` creates those rows
 * and writes what is below; the admin edits them from then on.
 *
 * Fees: the document gives a Professional Fee of ₹2,499 and GST @ 18% of ₹450,
 * and names no government fee — so, unlike the Labour Licence, nothing is
 * computed in the backend. The two lines below are the whole price and the
 * admin owns both amounts from Admin → Services.
 *
 * Documents come in two lists, because the page and the application ask for
 * different things:
 *
 *   - `documents` — the client document's general "Documents required" list.
 *     These are the rows written to `document_types`, so they are what the
 *     service page shows and what the admin edits in Admin → Services.
 *   - `PROFESSIONAL_TAX_APPLICATION_DOCUMENTS` — the document's per-organisation
 *     checklist, which is what the applicant is actually asked to bring when
 *     submitting. It depends on the type of organisation, so it is code rather
 *     than admin content: `PROFESSIONAL_TAX_DOCUMENT_RULES` is the single
 *     source of truth for which types each item applies to, and the wizard
 *     mirrors it (see `frontend/src/components/professional-tax-wizard.tsx`).
 *
 * The client document's item 7 ("Certificate of Incorporation (For Companies
 * and LLP), Partnership Deed (Partnership), Registration certificate (For
 * trusts and societies)") covers three different documents for three different
 * organisation types, so it is split into three entries — one per path. That
 * way a Proprietor, who has none of them, is shown none of them.
 */

export type ProfessionalTaxStateEntry = {
  state: string;
  feeLines: { label: string; amount: number }[];
  documents: string[];
  description: string;
  whoCanApply: string;
};

/** The six organisation types the document lists, in its order. */
export const PROFESSIONAL_TAX_ORG_TYPES = [
  "Proprietor",
  "Company",
  "LLP",
  "Partnership Firm",
  "Society",
  "Trust",
] as const;

export type ProfessionalTaxOrgType = (typeof PROFESSIONAL_TAX_ORG_TYPES)[number];

const FEE_LINES = [
  { label: "Professional Fee", amount: 2499 },
  { label: "GST @ 18%", amount: 450 },
];

/**
 * Which organisation types each application-checklist item applies to. An item
 * absent from this map applies to every type. Keyed by the exact document name
 * in `PROFESSIONAL_TAX_APPLICATION_DOCUMENTS`, so the two can never drift apart.
 */
export const PROFESSIONAL_TAX_DOCUMENT_RULES: Record<string, readonly ProfessionalTaxOrgType[]> = {
  "Partner Details — mail, mobile no, Aadhaar and PAN (Partnership Firm and LLP only)": [
    "Partnership Firm",
    "LLP",
  ],
  "Director Details — mail, mobile no, Aadhaar and PAN (Companies only)": ["Company"],
  "Certificate of Incorporation (Companies and LLP only)": ["Company", "LLP"],
  "Partnership Deed (Partnership Firm only)": ["Partnership Firm"],
  "Registration Certificate (Trusts and Societies only)": ["Society", "Trust"],
  "MOA and AOA (Companies only)": ["Company"],
};

/**
 * The per-organisation checklist the applicant is asked for at submission.
 * Filtered by `documentAppliesTo`; not admin content — see the header note.
 */
export const PROFESSIONAL_TAX_APPLICATION_DOCUMENTS = [
  "PAN of the Organisation",
  "Key Person KYC",
  "Partner Details — mail, mobile no, Aadhaar and PAN (Partnership Firm and LLP only)",
  "Director Details — mail, mobile no, Aadhaar and PAN (Companies only)",
  "Latest Bank statement of the Organisation",
  "Rental Agreement of the Place of Business",
  "Certificate of Incorporation (Companies and LLP only)",
  "Partnership Deed (Partnership Firm only)",
  "Registration Certificate (Trusts and Societies only)",
  "MOA and AOA (Companies only)",
];

/** True when the checklist item is asked of this organisation type. */
export function documentAppliesTo(documentName: string, orgType: string): boolean {
  const rule = PROFESSIONAL_TAX_DOCUMENT_RULES[documentName.trim()];
  if (!rule) return true;
  // Before a type is picked, show the whole checklist rather than hiding items.
  if (!orgType.trim()) return true;
  return rule.includes(orgType.trim() as ProfessionalTaxOrgType);
}

const DESCRIPTION =
  "Professional Tax is a tax levied on individuals engaged in any profession, trade, calling, or employment. Every employer who employs persons liable to pay Professional Tax and every person carrying on a profession or business is required to obtain registration under the applicable Professional Tax law.\n\n" +
  "The registration enables the employer or professional to comply with the obligation of deducting, collecting, and remitting the tax to the concerned authority within the prescribed timelines. Once registered, the entity receives a Professional Tax Registration Certificate (PTRC) or Professional Tax Enrolment Certificate (PTEC), as applicable, and is required to file periodic returns and make payments as per the law.";

const WHO_CAN_APPLY =
  "• Employers who employ one or more persons liable to pay Professional Tax.\n" +
  "• Individuals, firms, companies, or other entities carrying on any profession, trade, calling, or employment and whose income or turnover exceeds the prescribed threshold.\n" +
  "• Professionals such as doctors, lawyers, chartered accountants, architects, consultants, and other self-employed persons who are liable under the law.\n" +
  "• Any person or entity required by the applicable Professional Tax legislation to obtain registration or enrolment.";

/**
 * The client document's general "Documents required" list. These are the rows
 * written to `document_types`, so this is what the service page shows and what
 * the admin owns from Admin → Services.
 */
const GENERAL_DOCUMENTS = [
  "Proof of identity of the applicant / authorised signatory (Aadhaar, PAN, Passport, or any other government-issued photo ID)",
  "Proof of address of the business / establishment (utility bill, rent agreement, property tax receipt, or similar document)",
  "PAN of the business / individual",
  "Certificate of incorporation / partnership deed / registration certificate of the entity (as applicable)",
  "Proof of employment / list of employees (in case of employer registration)",
  "Bank account details of the applicant",
  "Any other document specifically prescribed by the competent authority",
];

export const PROFESSIONAL_TAX_BASE_SLUG = "professional-tax";

const entry = (state: string): ProfessionalTaxStateEntry => ({
  state,
  feeLines: FEE_LINES,
  documents: GENERAL_DOCUMENTS,
  description: DESCRIPTION,
  whoCanApply: WHO_CAN_APPLY,
});

export const PROFESSIONAL_TAX_CATALOG: Record<string, ProfessionalTaxStateEntry> = {
  "professional-tax-telangana": entry("Telangana"),
  "professional-tax-andhra-pradesh": entry("Andhra Pradesh"),
  "professional-tax-karnataka": entry("Karnataka"),
};
