/**
 * Catalog content for registration under Section 332 — source: the client's
 * "12A.docx".
 *
 * Section 332 of the Income-tax Act, 2025 is the successor to Sections 12A /
 * 12AA / 12AB of the 1961 Act, so the service is renamed with it: the row that
 * was seeded as `12a` / "12A" becomes `section-332` / "Section 332
 * Registration". `scripts/backfill-section-332.ts` performs that rename and
 * writes the copy, checklist and price below onto the row; the admin owns all
 * of it from then on.
 *
 * The old slug is kept as a redirect on the frontend (see
 * `LEGACY_SLUG_REDIRECTS` in `frontend/src/lib/modules.ts`) so existing links to
 * /m/12a still land on the service.
 *
 * Form numbers: the document names two pairs — Form 106 / 107 in its title and
 * "About" table, Form 104 / 105 in Acts & Rules and the Tab 2 options. The
 * client settled on 104 / 105 everywhere, so the About table below reads
 * Provisional → Form 104, Regular / Final → Form 105.
 *
 * The document specifies a two-tab registration workflow, which the wizard
 * implements (see `frontend/src/components/section-332-wizard.tsx`):
 *
 *   Tab 1 — Name of the enterprise, type of organisation (the five kinds the
 *           "Who can Apply" list names) and the contact person's name, email
 *           and mobile.
 *   Tab 2 — The application type, worded exactly as the document words it:
 *             A. Activities Commenced + Never registered before  → Form 104
 *             B. Activities have commenced or Renewal / Modification → Form 105
 *
 * The type of organisation picks the checklist — the document gives one list
 * per type; see SECTION_332_APPLICATION_DOCUMENTS.
 *
 * Fees: the document prices this at a Professional Fee of ₹6,999 plus GST @ 18%
 * of ₹1,260. That is only the starting value the backfill writes — the admin
 * owns both amounts in Admin → Services from then on, and the wizard reads
 * whatever is on the row.
 */

export type Section332FeeLine = { label: string; amount: number };

export const SECTION_332_SLUG = "section-332";

/** What the row was seeded as, before Section 332 replaced Section 12A. */
export const SECTION_332_LEGACY_SLUG = "12a";

/** The service name and the short title the sidebar and cards show. */
export const SECTION_332_NAME = "Section 332 Registration";
export const SECTION_332_SHORT_TITLE = "Section 332";

/** Both forms the service files, shown as the row's form number. */
export const SECTION_332_FORM_NO = "Form 104 / Form 105";

/**
 * The client's price for a Section 332 registration. Written once by the
 * backfill; the admin owns it after.
 */
export const SECTION_332_FEE_LINES: Section332FeeLine[] = [
  { label: "Professional Fee", amount: 6999 },
  { label: "GST @ 18%", amount: 1260 },
];

/* ------------------------------------------------------------------ *
 * Service page copy.
 * ------------------------------------------------------------------ */

/** "About this Approval", from the document, with the forms as 104 / 105. */
export const SECTION_332_DESCRIPTION =
  "Section 332 of the Income-tax Act, 2025 (corresponding to the earlier Sections 12A / 12AA / 12AB of the Income-tax Act, 1961) provides for the registration of Registered Non-Profit Organisations (RNPOs).\n\n" +
  "Registration under Section 332 is mandatory for charitable or religious organisations that wish to claim income-tax exemption on their income (under the provisions of Chapter XVII-B of the new Act).\n\n" +
  "Once registered, the organisation's income applied towards charitable or religious purposes is exempt from tax, subject to compliance with the prescribed conditions (including the 85% application rule).\n\n" +
  "Key points\n" +
  "• Entities are now called Registered Non-Profit Organisations (RNPOs)\n" +
  "• Registration is time-bound (provisional for 3 years or regular for 5/10 years)\n\n" +
  "Type of registration\n" +
  "• Provisional Registration — Form 104\n" +
  "• Regular / Final Registration — Form 105";

export const SECTION_332_WHO_CAN_APPLY =
  "• Public Trusts\n" +
  "• Societies registered under the Societies Registration Act, 1860 (or any corresponding State law)\n" +
  "• Companies registered under Section 8 of the Companies Act, 2013 (or earlier Section 25 companies)\n" +
  "• Universities established by law or educational institutions affiliated/recognised by the Government\n" +
  "• Institutions financed wholly or partly by the Government or a local authority";

export const SECTION_332_ACTS_RULES =
  "Income-tax Act | Income-tax Rules | Form 104 | Form 105";

/**
 * The general "Documents Required" list the service page shows, as the document
 * words it. This is what becomes `document_types` rows, so the admin owns it.
 * The submit-time checklist is per organisation type instead — see below.
 */
export const SECTION_332_DOCUMENTS = [
  "Self-certified copy of the instrument creating the trust / society / institution (Trust Deed / Memorandum & Articles / Bye-laws)",
  "Self-certified copy of registration with Registrar of Societies / Registrar of Companies / Charity Commissioner (as applicable)",
  "PAN of the organisation",
  "Details of trustees / office-bearers / directors along with their PANs and Aadhaar (where applicable)",
  "Copy of the latest financial statements / annual accounts (if activities have already commenced)",
  "Note on the activities of the organisation",
  "Details of existing bank accounts",
  "Self-declaration regarding the objects and that the trust is irrevocable",
];

/**
 * The entries the document words as conditional, so the backfill does not mark
 * them mandatory.
 */
export const SECTION_332_OPTIONAL_DOCUMENT_RE = /^copy of the latest financial statements/i;

/* ------------------------------------------------------------------ *
 * Tab 1 — organisation types, and the checklist each one gets.
 * ------------------------------------------------------------------ */

export const SECTION_332_ORG_TYPES = [
  "Public Trust",
  "Society",
  "Sec-8 company",
  "University / Educational Institution",
  "Government Financed Institutions",
] as const;
export type Section332OrgType = (typeof SECTION_332_ORG_TYPES)[number];

/** The per-type "Documents Required" lists from the document's workflow, verbatim. */
export const SECTION_332_APPLICATION_DOCUMENTS: Record<Section332OrgType, string[]> = {
  "Public Trust": [
    "Self-certified copy of the instrument creating the trust (Trust Deed)",
    "PAN of the organisation",
    "Details of trustees / office-bearers with their PANs and Aadhaar (where applicable)",
    "Copy of the latest financial statements / annual accounts (if activities have already commenced)",
    "Note on the activities of the organisation",
    "Details of existing bank accounts",
    "Self-declaration regarding the objects and that the trust is irrevocable",
  ],
  Society: [
    "Self-certified copy of the instrument creating the society (Bye-laws)",
    "Self-certified copy of registration with Registrar of Societies",
    "PAN of the organisation",
    "Details of office-bearers with their PANs and Aadhaar (where applicable)",
    "Copy of the latest financial statements / annual accounts (if activities have already commenced)",
    "Note on the activities of the organisation",
    "Details of existing bank accounts",
    "Self-declaration regarding the objects and that the trust is irrevocable",
  ],
  "Sec-8 company": [
    "Self-certified copy of the instrument creating the Company (Memorandum & Articles)",
    "Self-certified copy of registration with Registrar of Companies",
    "PAN of the organisation",
    "Details of Directors along with their PANs and Aadhaar (where applicable)",
    "Copy of the latest financial statements / annual accounts (if activities have already commenced)",
    "Note on the activities of the organisation",
    "Details of existing bank accounts",
    "Self-declaration regarding the objects and that the trust is irrevocable",
  ],
  "University / Educational Institution": SECTION_332_DOCUMENTS,
  "Government Financed Institutions": SECTION_332_DOCUMENTS,
};

/* ------------------------------------------------------------------ *
 * Tab 2 — the application type, and the form each one files.
 * ------------------------------------------------------------------ */

/** Tab 2's two options, worded exactly as the document words them. */
export const SECTION_332_APPLICATION_TYPES = [
  { key: "A", label: "Activities Commenced + Never registered before", form: "Form 104" },
  { key: "B", label: "Activities have commenced or Renewal / Modification", form: "Form 105" },
] as const;
