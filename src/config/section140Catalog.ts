/**
 * Catalog content for the IMB Certificate under Section 140 — source: the
 * client's "80IAC.docx".
 *
 * Section 140 of the Income-tax Act, 2025 is the successor to Section 80-IAC of
 * the 1961 Act, so the service is renamed with it: the row that was seeded as
 * `80iac` / "80IAC" becomes `section-140` / "IMB Certificate (Section 140)".
 * `scripts/backfill-section-140.ts` performs that rename and writes the copy,
 * checklist and price below onto the row; the admin owns all of it from then on.
 *
 * The old slug is kept as a redirect on the frontend (see
 * `LEGACY_SLUG_REDIRECTS` in `frontend/src/lib/modules.ts`) so existing links to
 * /m/80iac still land on the service.
 *
 * The document also specifies a one-tab registration workflow, which the wizard
 * implements (see `frontend/src/components/section-140-wizard.tsx`):
 *
 *   Tab 1 — Enterprise name, type of organisation (Company or LLP) and the
 *           contact person's name, email and mobile.
 *
 * The type of organisation picks the checklist: the document gives a separate
 * "For companies" and "For LLP's" list, and only the LLP list carries the two
 * declarations (splitting up / reconstruction, and plant & machinery). That
 * split is reproduced exactly as written — see the two arrays below.
 *
 * Fees: the document prices this at a Professional Fee of ₹9,999 plus GST @ 18%
 * of ₹1,799. That is only the starting value the backfill writes — the admin
 * owns both amounts in Admin → Services from then on, and the wizard reads
 * whatever is on the row.
 */

export type Section140FeeLine = { label: string; amount: number };

export const SECTION_140_SLUG = "section-140";

/** What the row was seeded as, before Section 140 replaced Section 80-IAC. */
export const SECTION_140_LEGACY_SLUG = "80iac";

/** The service name and the short title the sidebar and cards show. */
export const SECTION_140_NAME = "IMB Certificate (Section 140)";
export const SECTION_140_SHORT_TITLE = "Section 140";

/**
 * The client's price for an IMB certificate application. Written once by the
 * backfill; the admin owns it after.
 */
export const SECTION_140_FEE_LINES: Section140FeeLine[] = [
  { label: "Professional Fee", amount: 9999 },
  { label: "GST @ 18%", amount: 1799 },
];

/* ------------------------------------------------------------------ *
 * Service page copy.
 * ------------------------------------------------------------------ */

/** "About this approval", from the document. */
export const SECTION_140_DESCRIPTION =
  "Section 140 of the Income-tax Act, 2025 (corresponding to the earlier Section 80-IAC of the Income-tax Act, 1961) provides a special tax incentive for eligible start-ups.\n\n" +
  "An eligible start-up can claim a 100% deduction of the profits and gains derived from its eligible business for any three consecutive tax years out of the first ten years beginning from the year of incorporation.\n\n" +
  "Key points\n" +
  "• 100% deduction of profits from eligible business\n" +
  "• Flexible choice of any 3 consecutive years within the first 10 years\n" +
  "• Aimed at promoting innovation, product/process/service development, and scalable business models with high potential for employment generation or wealth creation\n" +
  "• Certification from the Inter-Ministerial Board (IMB) is mandatory to claim the deduction";

export const SECTION_140_WHO_CAN_APPLY =
  "A start-up is eligible if it satisfies all the following conditions:\n\n" +
  "• Private Limited Company or Limited Liability Partnership (LLP)\n" +
  "• It is incorporated on or after 1 April 2016 but before 1 April 2030\n" +
  "• Its total turnover does not exceed ₹100 crore in the tax year for which the deduction is claimed\n" +
  "• It holds a valid Certificate of Eligible Business from the Inter-Ministerial Board of Certification (IMB)\n" +
  "• It is engaged in an eligible business (innovation, development or improvement of products/processes/services, or a scalable business model with high potential of employment generation or wealth creation)\n" +
  "• It is not formed by splitting up or reconstruction of an existing business\n" +
  "• It is not formed by the transfer of previously used plant and machinery (except in specified cases)";

export const SECTION_140_ACTS_RULES = "IT Act, 2025";

/**
 * The general "Documents required" list the service page shows, as the document
 * words it. This is what becomes `document_types` rows, so the admin owns it.
 * The submit-time checklist is per organisation type instead — see below.
 */
export const SECTION_140_DOCUMENTS = [
  "Certificate of Incorporation / LLP Registration",
  "DPIIT Recognition Certificate",
  "Memorandum of Association / LLP Agreement",
  "Details of directors / partners and shareholding pattern",
  "Certificate from a Chartered Accountant",
  "Business plan / pitch deck explaining the innovation and scalability",
  "Audited financial statements (if available)",
  "Employees Declaration",
  "Details of products / services and intellectual property (if any)",
  "Declaration that the start-up is not formed by splitting up or reconstruction of an existing business",
  "Declaration regarding plant & machinery (not transferred from earlier business)",
];

/**
 * The entries the document words as conditional, so the backfill does not mark
 * them mandatory.
 */
export const SECTION_140_OPTIONAL_DOCUMENT_RE =
  /^audited financial statements|^details of products \/ services/i;

/* ------------------------------------------------------------------ *
 * Tab 1 — the two organisation types and the checklist each one gets.
 * ------------------------------------------------------------------ */

export const SECTION_140_ORG_TYPES = ["Company", "LLP"] as const;
export type Section140OrgType = (typeof SECTION_140_ORG_TYPES)[number];

/**
 * The document's "Documents Required" workflow lists, verbatim. The two
 * declarations appear only on the LLP list, and are left there rather than
 * copied across — the document is the specification.
 */
export const SECTION_140_APPLICATION_DOCUMENTS: Record<Section140OrgType, string[]> = {
  Company: [
    "Certificate of Incorporation",
    "DPIIT Recognition Certificate",
    "Memorandum of Association",
    "Details of directors and shareholding pattern",
    "Certificate from a Chartered Accountant",
    "Business plan / pitch deck explaining the innovation and scalability",
    "Audited financial statements (if available)",
    "Employees Declaration",
    "Details of products / services and intellectual property (if any)",
  ],
  LLP: [
    "LLP Registration Certificate",
    "DPIIT Recognition Certificate",
    "LLP Agreement",
    "Details of partners",
    "Certificate from a Chartered Accountant",
    "Business plan / pitch deck explaining the innovation and scalability",
    "Audited financial statements (if available)",
    "Employees Declaration",
    "Details of products / services and intellectual property (if any)",
    "Declaration that the start-up is not formed by splitting up or reconstruction of an existing business",
    "Declaration regarding plant & machinery (not transferred from earlier business)",
  ],
};
