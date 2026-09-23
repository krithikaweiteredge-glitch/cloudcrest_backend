/**
 * Catalog content for Form 104 (the old Form 10A) — source: the client's
 * "Form 140.docx" (the file is misnamed; its content is entirely Form 104 /
 * provisional registration under Section 332(3), not "Form 140").
 *
 * The `form-10a` catalog row was created by the original seed with nothing but
 * a name — already synced to "Form 104 ( old form 10A)" via EXACT_NAMES — and
 * no About, Who can Apply, documents, Acts & Rules or price.
 * `scripts/backfill-form-10a.ts` writes the copy, checklist and price below onto
 * the row; the admin owns all of it from then on.
 *
 * Form 104 is the PROVISIONAL registration under Section 332 — used only when
 * activities have not yet commenced. An organisation whose activities have
 * already started, or that is renewing/modifying an existing registration,
 * files Form 105 instead (the `section-332` service already covers that case).
 *
 * The document specifies a one-tab registration workflow, which the wizard
 * implements (see `frontend/src/components/form-10a-wizard.tsx`):
 *
 *   Tab 1 — Name of the enterprise, type of organisation (five types) and the
 *           contact person's name, email and mobile. The type picks the
 *           checklist — the document gives one list per type, keyed to its own
 *           "Nature Code".
 *
 * Fees: the document prices this at a Professional Fee of ₹4,999 plus GST @ 18%
 * of ₹900. That is only the starting value the backfill writes — the admin owns
 * both amounts in Admin → Services from then on.
 */

export type Form10aFeeLine = { label: string; amount: number };

export const FORM_10A_SLUG = "form-10a";

/** The form this registration is filed on. */
export const FORM_10A_FORM_NO = "Form 104";

/**
 * The client's price for a Form 104 filing. Written once by the backfill; the
 * admin owns it after.
 */
export const FORM_10A_FEE_LINES: Form10aFeeLine[] = [
  { label: "Professional Fee", amount: 4999 },
  { label: "GST @ 18%", amount: 900 },
];

/* ------------------------------------------------------------------ *
 * Service page copy.
 * ------------------------------------------------------------------ */

/** "About this approval", from the document. */
export const FORM_10A_DESCRIPTION =
  "Form 104 is a common electronic application form under the Income-tax Rules, 2026, filed for provisional registration under Section 332(3) of the Income-tax Act, 2025.\n\n" +
  "Applicable only when activities have not commenced. If activities have already started, use Form 105 (old Form 10AB) instead.\n\n" +
  "Key points\n" +
  "• Provisional registration/approval is generally valid for three tax years (or until 6 months after commencement of activities, whichever is earlier). After that, regular registration/approval must be sought via Form 105.\n" +
  "• On approval, the department issues Form 106 (old Form 10AC) with a 16-digit Unique Registration Number (URN).\n" +
  "• The form is simplified compared to the old Form 10A: shorter, with reduced data points, greater use of pre-filled information, and fewer detailed disclosures.\n" +
  "• Filing is fully online on the Income Tax e-Filing portal. Order in Form 106 is generally required within one month from the end of the month in which the application is made.";

export const FORM_10A_WHO_CAN_APPLY =
  "New / unregistered NPOs seeking provisional registration under Section 332(3):\n\n" +
  "• Public trusts, societies, Section 8 companies, and other eligible non-profit bodies.\n" +
  "• Must be created/established in India for charitable or religious purposes.\n" +
  "• Activities must not have commenced.\n" +
  "• Must not have been previously registered under Sections 12A/12AA/12AB or 10(23C) of the old Act (or Section 332 of the new Act).\n" +
  "• Trust must be irrevocable.";

export const FORM_10A_ACTS_RULES = "Income-tax Act, 2025 | Income-tax Rules, 2026";

/**
 * The general "Documents Required" list the service page shows, as the document
 * words it. This is what becomes `document_types` rows, so the admin owns it.
 * The submit-time checklist is per organisation type instead — see below.
 */
export const FORM_10A_DOCUMENTS = [
  "Self-certified copy of FCRA registration (if registered under FCRA, 2010)",
  "Self-certified copy of any earlier rejection or cancellation order, if any",
  "Self-certified annual accounts for up to 3 preceding tax years (only if the entity existed earlier and return of income was not filed for the last tax year); if no accounts, a self-certified NIL declaration for each year",
  "Note on the proposed activities of the applicant",
  "PAN of the organisation and details of key persons / beneficial owners",
];

/**
 * The entries the document words as conditional, so the backfill does not mark
 * them mandatory.
 */
export const FORM_10A_OPTIONAL_DOCUMENT_RE =
  /registered under fcra|any earlier rejection|self-certified annual accounts/i;

/* ------------------------------------------------------------------ *
 * Tab 1 — organisation types, and the checklist each one gets.
 * ------------------------------------------------------------------ */

export const FORM_10A_ORG_TYPES = [
  "Public Trust",
  "Society",
  "Sec-8 company",
  "University / Educational Institution",
  "Government Financed Institutions",
] as const;
export type Form10aOrgType = (typeof FORM_10A_ORG_TYPES)[number];

/** The per-type "Documents Required" lists from the document's workflow, one per Nature Code. */
export const FORM_10A_APPLICATION_DOCUMENTS: Record<Form10aOrgType, string[]> = {
  "Public Trust": [
    "Self-certified copy of the Trust Deed (must be irrevocable)",
    "Self-certified copy of registration certificate issued by Registrar of Public Trusts / Charity Commissioner (or Sub-Registrar under the relevant State Public Trusts Act)",
    "Confirmation the trust is irrevocable, as required by Section 332(2)(b)",
  ],
  Society: [
    "Self-certified copy of Memorandum of Association (MOA) + Rules & Regulations / Bye-laws",
    "Self-certified copy of registration certificate issued by Registrar of Societies (under Societies Registration Act, 1860 or relevant State law)",
  ],
  "Sec-8 company": [
    "Self-certified copy of Memorandum of Association (MOA) + Articles of Association (AOA)",
    "Self-certified copy of Certificate of Incorporation issued by Registrar of Companies (ROC)",
    "Self-certified copy of Section 8 licence (Form INC-16 or equivalent under Companies Act, 2013)",
  ],
  "University / Educational Institution": [
    "Self-certified copy of the instrument of creation / establishment (e.g., University Act, Act of Parliament/State Legislature, or affiliation/recognition order) — or document evidencing creation, if not created under an instrument",
    "Self-certified copy of registration / recognition / affiliation certificate issued by the competent Government authority / UGC / relevant regulatory body",
  ],
  "Government Financed Institutions": [
    "Self-certified copy of the instrument of creation / establishment, or document evidencing creation",
    "Self-certified copy of registration / recognition certificate",
    "Evidence of Government / local authority financing (e.g., sanction order, grant letter, or notification showing the institution is wholly or partly financed by Government or local authority)",
  ],
};
