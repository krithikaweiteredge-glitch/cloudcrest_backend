/**
 * Catalog content for EPF and ESI registration — source: the client's "EPFO AND
 * ESI" document, which gives one application, one checklist and one fee for
 * both services.
 *
 * EPFO and ESIC are central bodies, so each stays a single catalog row (`epf`,
 * `esi`); the applicant's state is a field on the application, not a row.
 * `scripts/backfill-employer-registration.ts` writes what is below; the admin
 * edits it from then on.
 *
 * Fees: Professional Fee + GST are the row's fee lines. The document names no
 * government fee, so nothing is computed — the lines are the whole price.
 *
 * Documents: the document's items that depend on the entity are split per
 * organisation type, and the parenthesised type list at the end of each name is
 * what the wizard filters on (see frontend `employer-registration-wizard.tsx`).
 */

export const EMPLOYER_REGISTRATION_SLUGS = ["epf", "esi"] as const;

export const EMPLOYER_REGISTRATION_FEE_LINES = [
  { label: "Professional Fee", amount: 2499 },
  { label: "GST @ 18%", amount: 450 },
];

export const EMPLOYER_REGISTRATION_DOCUMENTS = [
  "Certificate of Incorporation (Company / LLP)",
  "Registration Certificate (Proprietor / Partnership Firm / Society / Trust)",
  "PAN card of the Proprietor, Partners or Directors",
  "Aadhaar card of the Proprietor, Partners or Directors",
  "Address proof of registered office — Electricity / Water / Telephone Bill (not older than 2 months), or Rental Agreement / ROC",
  "Cancelled Cheque / Bank statement of the entity",
  "Signature photo of the authorised person",
  "Mail ID and Mobile number of each Director / Partner (Company / LLP / Partnership Firm)",
];
