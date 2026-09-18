/**
 * Catalog content for the Letter of Undertaking (LUT) — source: the client's
 * "LUT.docx".
 *
 * The `lut` catalog row was created empty by the original seed (no About, Who
 * can Apply, documents, Acts & Rules or price). This module holds the copy the
 * document supplies; `scripts/backfill-lut.ts` writes it onto the row, and the
 * admin owns it from then on.
 *
 * The document also specifies a two-tab workflow, which the wizard implements
 * (see `frontend/src/components/lut-wizard.tsx`):
 *
 *   Tab 1 — Enterprise name, the financial year being filed for, and the
 *           contact person's name, email and mobile.
 *   Tab 2 — GST portal login (optional) and two witnesses' name, occupation
 *           and address (each optional).
 *
 * The optional fields drive the document checklist: "If the above optional
 * details are not filled all those documents sections should be displayed
 * here". So anything left blank on Tab 2 turns into an upload slot at
 * submission instead — `lutApplicationDocuments` below is the single source of
 * truth for that, and the wizard mirrors it.
 *
 * Fees: the document itself names none; the client gave the price separately as
 * a Professional Fee of ₹999 plus GST @ 18% of ₹180. That is only the starting
 * value `scripts/backfill-lut.ts` writes — the admin owns both amounts in
 * Admin → Services from then on, and the wizard reads whatever is on the row
 * through the `lut` fee context, exactly as GST does.
 */

export type LutFeeLine = { label: string; amount: number };

export const LUT_SLUG = "lut";

/**
 * The client's price for an LUT filing. Written once by the backfill; the admin
 * owns it thereafter.
 */
export const LUT_FEE_LINES: LutFeeLine[] = [
  { label: "Professional Fee", amount: 999 },
  { label: "GST @ 18%", amount: 180 },
];

/* ------------------------------------------------------------------ *
 * Service page copy.
 * ------------------------------------------------------------------ */

/**
 * "About this approval", from the document.
 *
 * Two small repairs to the source text, which is mid-edit there: its first
 * sentence ends "filed by a GST-registered." with the noun missing, and the
 * sentence "you undertake to:" breaks off before its list. The noun is restored
 * and the undertaking is stated in general terms rather than invented — if the
 * exact undertaking wording matters, the admin can edit it in Admin → Services.
 */
export const LUT_DESCRIPTION =
  "A Letter of Undertaking (LUT) is a formal declaration filed by a GST-registered person. It allows you to make zero-rated supplies — the export of goods or services, or supply to SEZ units and developers — without payment of Integrated GST (IGST).\n\n" +
  "Instead of paying IGST upfront and later claiming a refund, you give an undertaking to comply with the conditions prescribed for zero-rated supplies under the GST law.\n\n" +
  "Key benefits\n" +
  "• No blockage of working capital\n" +
  "• No need to file IGST refund claims for the export itself\n" +
  "• Fully digital process on the GST portal\n" +
  "• Valid for the entire financial year";

export const LUT_WHO_CAN_APPLY =
  "Any person registered under GST who intends to make zero-rated supplies without payment of IGST can file an LUT. This includes:\n\n" +
  "• Exporters of goods (manufacturers, traders, etc.)\n" +
  "• Exporters of services (IT / ITeS, freelancers, consultants, SaaS companies, etc.)\n" +
  "• Suppliers of goods or services to SEZ units or SEZ developers for authorised operations";

export const LUT_ACTS_RULES = "GST Act, 2017";

/**
 * The general "Documents required" list the service page shows, as the document
 * words it. This is what becomes `document_types` rows, so the admin owns it.
 * The submit-time checklist is `lutApplicationDocuments` instead, because it
 * depends on what the applicant filled in on Tab 2.
 */
export const LUT_GENERAL_DOCUMENTS = [
  "GSTIN and login credentials",
  "Financial year for which the LUT is being filed",
  "Name, complete address and occupation of two independent and reliable witnesses",
  "Copy of the previous year's LUT (if renewing)",
  "IEC (Importer Exporter Code) — recommended if exporting goods",
];

/* ------------------------------------------------------------------ *
 * Tab 2 — the optional details, and the documents they stand in for.
 * ------------------------------------------------------------------ */

/**
 * The upload slot each optional block falls back to when it is left blank. The
 * document asks for exactly this: "If the above optional details are not filled
 * all those documents sections should be displayed here like Gst logins,
 * Witness Details".
 *
 * The two witnesses get a slot each rather than one shared slot, so an
 * applicant who typed one witness and not the other is asked only for the one
 * that is missing.
 */
export const LUT_GST_LOGIN_DOCUMENT =
  "GST portal login credentials (user ID and password)";
export const LUT_WITNESS_DOCUMENTS = [
  "Witness 1 details — name, occupation and complete address",
  "Witness 2 details — name, occupation and complete address",
];

/** Documents every LUT application is asked for, whatever Tab 2 contains. */
export const LUT_BASE_APPLICATION_DOCUMENTS = [
  "GSTIN certificate",
  "Copy of the previous year's LUT (if renewing)",
  "IEC (Importer Exporter Code) — recommended if exporting goods",
];

/** What the applicant typed into Tab 2, as far as the checklist cares. */
export type LutOptionalDetails = {
  /** True when BOTH the GST user ID and password were entered. */
  gstLoginEntered: boolean;
  /** True when the witness's name, occupation and address were all entered. */
  witness1Entered: boolean;
  witness2Entered: boolean;
};

/**
 * The submit-time checklist: the base documents, plus an upload slot for each
 * optional block the applicant left blank.
 */
export function lutApplicationDocuments(details: LutOptionalDetails): string[] {
  const list = [...LUT_BASE_APPLICATION_DOCUMENTS];
  if (!details.gstLoginEntered) list.push(LUT_GST_LOGIN_DOCUMENT);
  if (!details.witness1Entered) list.push(LUT_WITNESS_DOCUMENTS[0]);
  if (!details.witness2Entered) list.push(LUT_WITNESS_DOCUMENTS[1]);
  return list;
}

/**
 * The financial years offered on Tab 1. An LUT is filed for one financial year,
 * and is normally filed at or before the start of that year, so the list runs
 * from the current year forward one and back two.
 */
export function lutFinancialYears(today = new Date()): string[] {
  // The Indian financial year starts in April: before April, the current FY is
  // the one that began in the previous calendar year.
  const startYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  const label = (y: number) => `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
  return [startYear + 1, startYear, startYear - 1, startYear - 2].map(label);
}
