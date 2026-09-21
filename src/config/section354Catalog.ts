/**
 * Catalog content for approval under Section 354 — source: the client's
 * "80G Chnages.docx".
 *
 * Under the Income-tax Act, 2025 the old Section 80G approval is replaced by
 * approval under Section 354, so the service is renamed with it: the row that
 * was seeded as `80g` / "80G" becomes `section-354` / "Section 354 Approval".
 * `scripts/backfill-section-354.ts` performs that rename and writes the copy,
 * checklist and price below onto the row; the admin owns all of it from then on.
 *
 * The old slug is kept as a redirect on the frontend (see
 * `LEGACY_SLUG_REDIRECTS` in `frontend/src/lib/modules.ts`) so existing links to
 * /m/80g still land on the service.
 *
 * Form numbers are kept exactly as the document has them: its heading is
 * "Certificate of Donation (Form No. 107)", while the application itself is
 * filed on Form 105 (Documents section, Acts & Rules). So the row's form number
 * is Form 105, and the About copy opens with the document's heading.
 *
 * Two slips in the source text are corrected: "Companies Act, 2103" is the
 * Companies Act, 2013, and "societies Registration Act" is capitalised.
 *
 * The document specifies a one-tab registration workflow, which the wizard
 * implements (see `frontend/src/components/section-354-wizard.tsx`):
 *
 *   Tab 1 — Name of the enterprise, type of organisation (five types) and the
 *           contact person's name, email and mobile. The type picks the
 *           checklist — the document gives one list per type.
 *
 * Fees: the document prices this at a Professional Fee of ₹6,999 plus GST @ 18%
 * of ₹1,260. That is only the starting value the backfill writes — the admin
 * owns both amounts in Admin → Services from then on.
 */

export type Section354FeeLine = { label: string; amount: number };

export const SECTION_354_SLUG = "section-354";

/** What the row was seeded as, before Section 354 replaced Section 80G. */
export const SECTION_354_LEGACY_SLUG = "80g";

/** The service name and the short title the sidebar and cards show. */
export const SECTION_354_NAME = "Section 354 Approval";
export const SECTION_354_SHORT_TITLE = "Section 354";

/** The form the application is filed on. */
export const SECTION_354_FORM_NO = "Form 105";

/**
 * The client's price for a Section 354 approval. Written once by the backfill;
 * the admin owns it after.
 */
export const SECTION_354_FEE_LINES: Section354FeeLine[] = [
  { label: "Professional Fee", amount: 6999 },
  { label: "GST @ 18%", amount: 1260 },
];

/* ------------------------------------------------------------------ *
 * Service page copy.
 * ------------------------------------------------------------------ */

/** "About the Approval", from the document, headed by the document's title. */
export const SECTION_354_DESCRIPTION =
  "Certificate of Donation (Form No. 107)\n\n" +
  "Under the Income-tax Act, 2025, the old Section 80G approval has been replaced by approval under Section 354.\n\n" +
  "This approval allows a registered Non-Profit Organisation (NPO) to receive donations that are eligible for deduction in the hands of the donor under Section 133(1)(b)(ii) of the Income-tax Act, 2025.\n\n" +
  "Key points\n" +
  "• Approval is generally valid for 5 tax years (10 tax years in certain cases of small organisations)\n" +
  "• After approval, the organisation must issue donation certificates (Form 114) and file the Statement of Donations (Form 113)";

export const SECTION_354_WHO_CAN_APPLY =
  "The following can apply for approval under Section 354(2) of the Income-tax Act, 2025:\n\n" +
  "Registered Non-Profit Organisations under Section 332, which include:\n" +
  "• Public Trusts\n" +
  "• Societies registered under the Societies Registration Act, 1860 (or any other law)\n" +
  "• Section 8 Companies (Companies Act, 2013)\n" +
  "• Universities and Educational Institutions\n" +
  "• Other notified eligible entities\n\n" +
  "Applicants must fall under one of these situations:\n" +
  "• Activities have already commenced\n" +
  "• Provisional approval is about to expire\n" +
  "• Existing approval is due for renewal\n" +
  "• Objects have been modified\n\n" +
  "Important conditions for eligibility (Section 354(1)):\n" +
  "• Not expressed to be for the benefit of any particular religious community or caste\n" +
  "• Established in India for charitable purposes\n" +
  "• Religious expenditure does not exceed 5% of total income\n" +
  "• Instrument/rules do not allow transfer of assets for non-charitable purposes\n" +
  "• Maintains regular accounts\n" +
  "• Complies with statement and certificate requirements (Form 113 & Form 114)";

export const SECTION_354_ACTS_RULES = "Income-tax Act | Income-tax Rules | Form 105";

/**
 * The general "Documents required" list the service page shows — "generally
 * required while filing Form 105 for Section 354 approval". This is what becomes
 * `document_types` rows, so the admin owns it. The submit-time checklist is per
 * organisation type instead — see below.
 */
export const SECTION_354_DOCUMENTS = [
  "Self-certified copy of the Trust Deed / Memorandum of Association / Bye-laws / Instrument of creation",
  "Self-certified copy of registration certificate with Registrar of Public Trusts / Registrar of Societies / Registrar of Companies (as applicable)",
  "Self-certified copy of registration under FCRA, 2010 (if registered)",
  "Self-certified copy of existing registration/approval order under Section 332 / 354 of the Income-tax Act, 2025",
  "Self-certified copy of any previous rejection or cancellation order (if applicable)",
  "Note on activities of the organisation",
  "Details of assets and liabilities",
  "List of office bearers / trustees with PAN and addresses",
  "PAN of the organisation",
];

/**
 * The entries the document words as conditional, so the backfill does not mark
 * them mandatory.
 */
export const SECTION_354_OPTIONAL_DOCUMENT_RE =
  /registration under FCRA|previous rejection or cancellation/i;

/* ------------------------------------------------------------------ *
 * Tab 1 — organisation types, and the checklist each one gets.
 * ------------------------------------------------------------------ */

export const SECTION_354_ORG_TYPES = [
  "Public Trust",
  "Society",
  "Sec-8 company",
  "University / Educational Institution",
  "Government Financed Institutions",
] as const;
export type Section354OrgType = (typeof SECTION_354_ORG_TYPES)[number];

/** The per-type lists every type shares after its first two entries. */
const COMMON_TAIL = [
  "Self-certified copy of registration under FCRA, 2010 (if registered)",
  "Self-certified copy of existing registration/approval order under Section 332 / 354 of the Income-tax Act, 2025",
  "Self-certified copy of any previous rejection or cancellation order (if applicable)",
  "Note on activities of the organisation",
  "Details of assets and liabilities",
  "List of office bearers / trustees with PAN and addresses",
  "PAN of the organisation",
];

/** The per-type "Documents Required" lists from the document's workflow. */
export const SECTION_354_APPLICATION_DOCUMENTS: Record<Section354OrgType, string[]> = {
  "Public Trust": [
    "Self-certified copy of the Trust Deed",
    "Self-certified copy of registration certificate with Registrar of Public Trusts",
    ...COMMON_TAIL,
  ],
  Society: [
    "Self-certified copy of the Bye-laws / Instrument of creation",
    "Self-certified copy of registration certificate with Registrar of Societies",
    ...COMMON_TAIL,
  ],
  "Sec-8 company": [
    "Self-certified copy of the Memorandum of Association",
    "Self-certified copy of registration certificate with Registrar of Companies (as applicable)",
    ...COMMON_TAIL,
  ],
  "University / Educational Institution": SECTION_354_DOCUMENTS,
  "Government Financed Institutions": SECTION_354_DOCUMENTS,
};
