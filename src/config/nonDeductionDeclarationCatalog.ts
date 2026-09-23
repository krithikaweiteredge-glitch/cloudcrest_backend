/**
 * Catalog content for the Declaration for Non-Deduction of Tax — source: the
 * client's "Declaration of non deduction of tax.docx".
 *
 * The `non-deduction-declaration` catalog row was created by the original seed
 * with nothing but a name — already synced to "Declaration for non-deduction of
 * tax" via EXACT_NAMES — and no About, Who can Apply, documents, Acts & Rules or
 * price. `scripts/backfill-non-deduction-declaration.ts` writes the copy,
 * checklist and price below onto the row; the admin owns all of it from then on.
 *
 * The document specifies a one-tab registration workflow, which the wizard
 * implements (see `frontend/src/components/non-deduction-declaration-wizard.tsx`):
 *
 *   Tab 1 — Name of the declarant, type of person (three options), and the
 *           contact person's name, email and mobile. Unlike the org-type
 *           wizards this session has built, the document gives ONE document
 *           checklist that applies to every type — the type only decides
 *           eligibility, not the paperwork.
 *
 * Fees: the document prices this at a Professional Fee of ₹999 plus GST @ 18%
 * of ₹180. That is only the starting value the backfill writes — the admin owns
 * both amounts in Admin → Services from then on.
 */

export type NonDeductionDeclarationFeeLine = { label: string; amount: number };

export const NON_DEDUCTION_DECLARATION_SLUG = "non-deduction-declaration";

/** The form this declaration is filed on. */
export const NON_DEDUCTION_DECLARATION_FORM_NO = "Form 121";

/**
 * The client's price for filing this declaration. Written once by the
 * backfill; the admin owns it after.
 */
export const NON_DEDUCTION_DECLARATION_FEE_LINES: NonDeductionDeclarationFeeLine[] = [
  { label: "Professional Fee", amount: 999 },
  { label: "GST @ 18%", amount: 180 },
];

/* ------------------------------------------------------------------ *
 * Service page copy.
 * ------------------------------------------------------------------ */

/** "About this approval", from the document. */
export const NON_DEDUCTION_DECLARATION_DESCRIPTION =
  "A Declaration for non-deduction of tax is made in Form No. 121 under Section 393(6) of the Income-tax Act, 2025 (read with Rule 211 of the Income-tax Rules, 2026).\n\n" +
  "It is a self-declaration submitted by the recipient of income to the payer (bank, company, etc.), stating that the estimated total tax liability for the Tax Year is Nil. On the basis of this declaration, the payer does not deduct tax at source (TDS) on specified incomes.\n\n" +
  "This form replaces the earlier Form 15G and Form 15H. It is useful when your total income is below the taxable limit and you want to avoid unnecessary TDS deduction and subsequent refund claims.\n\n" +
  "Key points\n" +
  "• Single unified form (Form 121) for all eligible residents irrespective of age\n" +
  "• Fully digital / physical submission to the payer\n" +
  "• Valid only for the Tax Year for which it is filed\n" +
  "• PAN is mandatory — declaration without PAN is invalid\n" +
  "• Must be submitted before the income is credited or paid";

export const NON_DEDUCTION_DECLARATION_WHO_CAN_APPLY =
  "Any person whose estimated tax liability for the Tax Year is Nil and who receives income subject to TDS can apply. This includes:\n\n" +
  "• Resident Individuals\n" +
  "• Resident Hindu Undivided Families (HUFs)\n\n" +
  "Not eligible:\n" +
  "• Non-residents (including NRIs)\n" +
  "• Companies, Firms, LLPs, AOPs, BOIs and other non-individual entities";

export const NON_DEDUCTION_DECLARATION_ACTS_RULES =
  "Income-tax Act, 2025 | Income-tax Rules, 2026 (Rule 211)";

/**
 * The general "Documents required" list the service page shows, as the document
 * words it. The document gives one flat list — it doesn't vary by declarant
 * type — so this is also the submit-time checklist.
 */
export const NON_DEDUCTION_DECLARATION_DOCUMENTS = [
  "PAN of the declarant (mandatory)",
  "Details of the income / investment for which non-deduction is sought (FD number, account number, etc.)",
  "Name, address and TAN of the payer",
  "Estimated total income computation for the current Tax Year",
  "Proof of age (in case of senior citizens, if required by the payer)",
  "Bank account / investment details",
];

/**
 * The entries the document words as conditional, so the backfill does not mark
 * them mandatory.
 */
export const NON_DEDUCTION_DECLARATION_OPTIONAL_DOCUMENT_RE = /proof of age/i;

/* ------------------------------------------------------------------ *
 * Tab 1 — type of person.
 * ------------------------------------------------------------------ */

export const NON_DEDUCTION_DECLARATION_PERSON_TYPES = [
  "Resident Individual (below 60 years)",
  "Resident Individual (60 years and above)",
  "Resident Hindu Undivided Family (HUF)",
] as const;

/**
 * The submit-time checklist — the same for every declarant type. Tab 1's
 * "Income tax logins" (asked in the wizard's own workflow section, distinct from
 * the general Documents list above) is included here since the wizard asks it.
 */
export const NON_DEDUCTION_DECLARATION_APPLICATION_DOCUMENTS = [
  "PAN of the applicant",
  "Details of the income / investment for which non-deduction is sought (FD number, account number, etc.)",
  "Name, address and TAN of the payer",
  "Income Tax portal login credentials",
  "Bank account / investment details",
];
