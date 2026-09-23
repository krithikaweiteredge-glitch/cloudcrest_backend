/**
 * Catalog content for RCMC (Registration-cum-Membership Certificate) — source:
 * the client's "RCMC.docx".
 *
 * The `rcmc` catalog row was created by the original seed with nothing but a
 * name and no About, Who can Apply, documents, Acts & Rules or price.
 * `scripts/backfill-rcmc.ts` writes the copy, checklist and price below onto
 * the row; the admin owns all of it from then on.
 *
 * The document specifies a one-tab registration workflow, which the wizard
 * implements (see `frontend/src/components/rcmc-wizard.tsx`):
 *
 *   Tab 1 — Applicant / Enterprise name, applicant type (eight types) and the
 *           contact person's name, email and mobile. The type picks the
 *           checklist — the document gives one list per type, every one of
 *           them starting with the applicant's IEC.
 *
 * Fees: the document prices this at a Professional Fee of ₹4,999 plus GST @ 18%
 * of ₹900. That is only the starting value the backfill writes — the admin owns
 * both amounts in Admin → Services from then on.
 */

export type RcmcFeeLine = { label: string; amount: number };

export const RCMC_SLUG = "rcmc";

/**
 * The client's price for an RCMC application. Written once by the backfill;
 * the admin owns it after.
 */
export const RCMC_FEE_LINES: RcmcFeeLine[] = [
  { label: "Professional Fee", amount: 4999 },
  { label: "GST @ 18%", amount: 900 },
];

/* ------------------------------------------------------------------ *
 * Service page copy.
 * ------------------------------------------------------------------ */

/** "About", from the document. */
export const RCMC_DESCRIPTION =
  "RCMC means Registration-cum-Membership Certificate. It connects an exporter with the relevant Export Promotion Council, Commodity Board or other authorised registering body. The appropriate authority depends on the goods or services being exported. Applications are handled through DGFT's e-RCMC system for participating authorities.\n\n" +
  "Requirements depend on the applicable export policy, benefit or sector. RCMC should not be described as compulsory for every export transaction — for example, EPCH explains that its registration facilitates council services and applicable export assistance.";

export const RCMC_WHO_CAN_APPLY =
  "• Merchant exporter — purchases goods and exports them.\n" +
  "• Manufacturer exporter — manufactures goods and exports them.\n" +
  "• Service exporter — applies through the appropriate service-sector authority.\n\n" +
  "The DGFT account, IEC profile and the chosen council's eligibility requirements must be satisfied.";

export const RCMC_ACTS_RULES = "DGFT manual | APEDA circular";

/**
 * The general "Documents" list the service page shows, as the document words
 * it: the export product/service and issuing council are identified first, and
 * that council's checklist is then shown. This is what becomes `document_types`
 * rows, so the admin owns it. The submit-time checklist is per applicant type
 * instead — see below.
 */
export const RCMC_DOCUMENTS = [
  "IEC (Importer Exporter Code)",
  "Constitution document, such as partnership deed or incorporation documents, where required",
  "Authorisation or board resolution, where required",
  "Manufacturing proof for manufacturer-exporter status",
  "Product-specific certificates, where required",
  "Council-specific declarations and supporting records",
];

/**
 * The entries the document words as conditional, so the backfill does not mark
 * them mandatory.
 */
export const RCMC_OPTIONAL_DOCUMENT_RE = /where required/i;

/* ------------------------------------------------------------------ *
 * Tab 1 — applicant types, and the checklist each one gets.
 * ------------------------------------------------------------------ */

export const RCMC_APPLICANT_TYPES = [
  "Individual / Proprietor",
  "Partnership Firm",
  "LLP",
  "Private Limited Company",
  "Public Limited Company",
  "OPC",
  "HUF",
  "Trust / Society / Other",
] as const;
export type RcmcApplicantType = (typeof RCMC_APPLICANT_TYPES)[number];

/** The per-type "Documents Required" lists from the document's workflow. */
export const RCMC_APPLICATION_DOCUMENTS: Record<RcmcApplicantType, string[]> = {
  "Individual / Proprietor": [
    "IEC",
    "Proprietor KYC",
    "Product-specific certificates, where applicable",
  ],
  "Partnership Firm": [
    "IEC",
    "Partnership Deed",
    "Authorised partner KYC",
    "Manufacturing proof, if manufacturer-exporter",
    "Product-specific certificates, where applicable",
  ],
  LLP: [
    "IEC",
    "LLP Incorporation certificate",
    "Authorisation / designated partner KYC, where required",
    "Manufacturing proof, if manufacturer-exporter",
    "Product-specific certificates, where applicable",
  ],
  "Private Limited Company": [
    "IEC",
    "Certificate of Incorporation",
    "Authorised Director details",
    "Manufacturing proof, if manufacturer-exporter",
    "Product-specific certificates, where applicable",
  ],
  "Public Limited Company": [
    "IEC",
    "Certificate of Incorporation",
    "Authorised Director details",
    "Manufacturing proof, if manufacturer-exporter",
    "Product-specific certificates, where applicable",
  ],
  OPC: [
    "IEC",
    "Certificate of Incorporation / Constitution Documents",
    "Manufacturing proof, if manufacturer-exporter",
    "Product-specific certificates, where applicable",
  ],
  HUF: [
    "IEC",
    "HUF / Karta-related supporting documents, where required",
    "Product-specific certificates, where applicable",
  ],
  "Trust / Society / Other": [
    "IEC",
    "Registration / Constitution Documents",
    "Authorisation / resolution, where required",
    "Product/service-specific certificates, where applicable",
    "Council-specific declarations / supporting documents",
  ],
};
