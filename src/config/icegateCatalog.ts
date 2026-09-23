/**
 * Catalog content for ICE GATE Registration — source: the client's
 * "ICE GATE.docx".
 *
 * The `icegate` catalog row was created by the original seed with nothing but
 * a name (already synced to "ICE GATE" via the name-sync script) and no About,
 * Who can Apply, documents, Acts & Rules or price.
 * `scripts/backfill-icegate.ts` writes the copy, checklist and price below onto
 * the row; the admin owns all of it from then on.
 *
 * This is a distinct service from `iec` (the existing Importer-Exporter Code
 * wizard, built earlier from "IEC updated.html") — the two are priced and
 * filed separately even though both concern import/export registrations.
 *
 * The document specifies a two-tab registration workflow, which the wizard
 * implements (see `frontend/src/components/icegate-wizard.tsx`):
 *
 *   Tab 1 — Enterprise name, type of organisation (eight types) and the
 *           contact person's name, email and mobile.
 *   Tab 2 — Authorised person's name and designation, what the applicant
 *           intends to do (Import / Export / Both), and the document
 *           checklist for the chosen organisation type.
 *
 * The document's Tab 1 dropdown offers "Trusts and Societies" as one combined
 * option, but its Tab 2 checklist gives Trust and Society separate document
 * lists. Since only one combined option is offered, `ICEGATE_APPLICATION_DOCUMENTS`
 * carries the union of both lists for that entry — the applicant uploads
 * whichever of the Trust Deed / Society registration actually applies to them.
 *
 * Fees: the document prices this at a Professional Fee of ₹4,999 plus GST @ 18%
 * of ₹900. That is only the starting value the backfill writes — the admin owns
 * both amounts in Admin → Services from then on.
 */

export type IcegateFeeLine = { label: string; amount: number };

export const ICEGATE_SLUG = "icegate";

/**
 * The client's price for an ICE GATE registration. Written once by the
 * backfill; the admin owns it after.
 */
export const ICEGATE_FEE_LINES: IcegateFeeLine[] = [
  { label: "Professional Fee", amount: 4999 },
  { label: "GST @ 18%", amount: 900 },
];

/* ------------------------------------------------------------------ *
 * Service page copy.
 * ------------------------------------------------------------------ */

/** "About this approval", from the document. */
export const ICEGATE_DESCRIPTION =
  "Importer Exporter Code (IEC) is a unique code issued by the Directorate General of Foreign Trade (DGFT) to businesses and other eligible persons engaged in import or export activities. IEC is generally required for undertaking import or export of goods from or to India, subject to applicable exemptions.\n\n" +
  "The IEC is linked with the applicant's PAN and is used for various customs, banking and foreign-trade related transactions. The application is made online through the DGFT portal.";

export const ICEGATE_WHO_CAN_APPLY =
  "IEC can generally be obtained by:\n\n" +
  "• Proprietorship Firms\n" +
  "• Partnership Firms\n" +
  "• LLPs\n" +
  "• Private Limited Companies\n" +
  "• Public Limited Companies\n" +
  "• One Person Companies (OPCs)\n" +
  "• Trusts and Societies\n" +
  "• HUFs\n\n" +
  "The applicant should have a valid PAN and the required bank account and supporting documents. Certain categories of persons or transactions may be exempt from obtaining IEC under the applicable Foreign Trade Policy provisions.";

export const ICEGATE_ACTS_RULES = "Foreign Trade (Development and Regulation) Act, 1992";

/**
 * The general "Documents Required" list the service page shows, as the
 * document words it. This is what becomes `document_types` rows, so the admin
 * owns it. The submit-time checklist is per organisation type instead — see
 * below.
 */
export const ICEGATE_DOCUMENTS = [
  "PAN of the applicant/entity",
  "Proof of establishment/incorporation/registration, wherever applicable",
  "Address proof of the firm/entity",
  "Proof of bank account — cancelled cheque, or bank certificate",
  "Digital signature or Aadhaar-based authentication of the authorised person, as applicable",
];

/**
 * The entries the document words as conditional, so the backfill does not mark
 * them mandatory.
 */
export const ICEGATE_OPTIONAL_DOCUMENT_RE = /wherever applicable|as applicable/i;

/* ------------------------------------------------------------------ *
 * Tab 1 — organisation types, and the checklist each one gets.
 * ------------------------------------------------------------------ */

export const ICEGATE_ORG_TYPES = [
  "Proprietorship",
  "Partnership Firm",
  "LLP",
  "Private Limited Company",
  "Public Limited Company",
  "OPC",
  "Trusts and Societies",
  "HUF",
] as const;
export type IcegateOrgType = (typeof ICEGATE_ORG_TYPES)[number];

/** The address-proof options common to every type ("ANY ONE" per the document). */
const ADDRESS_PROOF_ANY_ONE =
  "Address proof (any one) — Sale deed, Rent/lease agreement, Electricity bill, or Telephone/landline bill";
const BANK_PROOF = "Bank proof — cancelled cheque or bank certificate";
const GST_CERT = "GST Certificate";

/**
 * The per-type "Documents Required" lists from the document's Tab 2 workflow.
 * "Trusts and Societies" carries the union of the document's separate Trust
 * and Society lists — see the module doc comment above.
 */
export const ICEGATE_APPLICATION_DOCUMENTS: Record<IcegateOrgType, string[]> = {
  Proprietorship: [
    "PAN of proprietor",
    ADDRESS_PROOF_ANY_ONE,
    BANK_PROOF,
    "Aadhaar of proprietor",
    GST_CERT,
  ],
  "Partnership Firm": [
    "PAN of Firm",
    ADDRESS_PROOF_ANY_ONE,
    BANK_PROOF,
    "Partners' KYC",
    GST_CERT,
    "Partnership Deed",
  ],
  LLP: [
    "PAN of LLP",
    ADDRESS_PROOF_ANY_ONE,
    BANK_PROOF,
    "LLP Deed",
    GST_CERT,
    "Certificate of Incorporation",
    "Directors' KYC",
  ],
  "Private Limited Company": [
    "PAN of Company",
    ADDRESS_PROOF_ANY_ONE,
    BANK_PROOF,
    "MOA and AOA",
    GST_CERT,
    "Certificate of Incorporation",
    "Directors' KYC",
  ],
  "Public Limited Company": [
    "PAN of Company",
    ADDRESS_PROOF_ANY_ONE,
    BANK_PROOF,
    "MOA and AOA",
    GST_CERT,
    "Certificate of Incorporation",
    "Directors' KYC",
  ],
  OPC: [
    "PAN of Company",
    ADDRESS_PROOF_ANY_ONE,
    BANK_PROOF,
    "MOA and AOA",
    GST_CERT,
    "Certificate of Incorporation",
    "Directors' KYC",
  ],
  "Trusts and Societies": [
    "PAN of Trust / Society",
    ADDRESS_PROOF_ANY_ONE,
    BANK_PROOF,
    "Trust Deed / Registration Certificate (for a Trust) or Memorandum / Bye-laws (for a Society)",
    GST_CERT,
  ],
  HUF: ["PAN of HUF", ADDRESS_PROOF_ANY_ONE, BANK_PROOF, GST_CERT],
};

/** "What do you intend to do?" — Tab 2's second question. */
export const ICEGATE_INTENT_OPTIONS = ["Import Goods", "Export Goods", "Import & Export Goods"] as const;
