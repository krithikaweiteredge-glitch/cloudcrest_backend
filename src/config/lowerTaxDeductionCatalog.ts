/**
 * Catalog content for the Lower Tax Deduction Certificate — source: the
 * client's "Lower Tax Deduction.docx".
 *
 * The `lower-tax-deduction` catalog row was created by the original seed with
 * nothing but a name (see `min()` in scripts/seed-catalog.ts): no About, Who can
 * Apply, documents, Acts & Rules or price. This module holds the copy the
 * document supplies; `scripts/backfill-lower-tax-deduction.ts` writes it onto
 * the row, and the admin owns it from then on — exactly the LUT arrangement.
 *
 * The document also specifies a one-tab registration flow, which the wizard
 * implements (see `frontend/src/components/lower-tax-deduction-wizard.tsx`):
 *
 *   Tab 1 — Enterprise name, type of organisation (the seven kinds the "Who can
 *           Apply" list names), and the contact person's name, email and mobile.
 *
 * Fees: the document prices this at a Professional Fee of ₹6,999 plus GST @ 18%
 * of ₹1,260. That is only the starting value the backfill writes — the admin
 * owns both amounts in Admin → Services from then on, and the wizard reads
 * whatever is on the row through the catalog, never a hardcoded number.
 */

export type LowerTaxDeductionFeeLine = { label: string; amount: number };

export const LOWER_TAX_DEDUCTION_SLUG = "lower-tax-deduction";

/** Form No. 128 under the Income-tax Act, 2025 (the erstwhile Form 13). */
export const LOWER_TAX_DEDUCTION_FORM_NO = "128";

/**
 * The client's price for a Lower Tax Deduction Certificate application, as the
 * document states it. Written once by the backfill; the admin owns it after.
 */
export const LOWER_TAX_DEDUCTION_FEE_LINES: LowerTaxDeductionFeeLine[] = [
  { label: "Professional Fee", amount: 6999 },
  { label: "GST @ 18%", amount: 1260 },
];

/* ------------------------------------------------------------------ *
 * Service page copy.
 * ------------------------------------------------------------------ */

/** "About this approval", from the document. */
export const LOWER_TAX_DEDUCTION_DESCRIPTION =
  "A Lower Tax Deduction Certificate (also called Nil/Lower TDS Certificate) is issued under Section 395(1) of the Income-tax Act, 2025. It authorises the payer (deductor) to deduct tax at a lower rate or at Nil rate on specified incomes, instead of the normal TDS rates prescribed under the Act.\n\n" +
  "This certificate is useful when your estimated total tax liability for the Tax Year is lower than the TDS that would otherwise be deducted. It helps prevent excess tax deduction and the subsequent wait for refunds.\n\n" +
  "Key points under the new law\n" +
  "• Application is made in Form No. 128 (earlier Form 13)\n" +
  "• Fully digital process through the TRACES portal\n" +
  "• Certificate is valid for the period specified in it (generally for the Tax Year), unless cancelled by the Assessing Officer\n" +
  "• Once issued, the deductor is legally bound to deduct tax only at the rate mentioned in the certificate";

export const LOWER_TAX_DEDUCTION_WHO_CAN_APPLY =
  "Any person whose income is subject to TDS and whose estimated tax liability justifies a lower or nil deduction can apply. This includes:\n\n" +
  "• Individuals (including senior citizens and freelancers)\n" +
  "• Hindu Undivided Families (HUFs)\n" +
  "• Partnership firms and LLPs\n" +
  "• Companies (domestic and foreign)\n" +
  "• Trusts and charitable institutions\n" +
  "• Non-residents (in eligible cases)";

export const LOWER_TAX_DEDUCTION_ACTS_RULES = "IT ACT, 2025";

/**
 * "Documents required", verbatim from the document. This is what becomes
 * `document_types` rows — i.e. the service page's checklist and the upload slots
 * at submission — so the admin owns it once written.
 */
export const LOWER_TAX_DEDUCTION_DOCUMENTS = [
  "PAN of the applicant",
  "TRACES portal login credentials",
  "Computation of estimated total income and tax liability for the current Tax Year",
  "Income Tax Returns (ITRs) of the preceding four Tax Years (or computation of income if ITR was not filed for any year)",
  "Details of TDS already deducted in the current year (Form 26AS / AIS)",
  "List of deductors with their TAN, nature of payment and estimated amount",
  "Projected Profit & Loss Account and Balance Sheet (in case of business/profession)",
  "Copy of contracts / agreements / invoices under which payments are being received",
  "Registration / exemption certificate (if claiming exemption)",
  "Details of advance tax paid",
];

/**
 * The entries the document words as conditional — they only apply to some
 * applicants, so the backfill does not mark them mandatory.
 */
export const LOWER_TAX_DEDUCTION_OPTIONAL_DOCUMENT_RE =
  /^projected profit|^registration \/ exemption certificate/i;
