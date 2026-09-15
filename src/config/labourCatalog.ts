/**
 * Catalog content for the Labour Licence — source: the client's "Labour
 * license" document.
 *
 * The licence is registered state-wise, like the entity registrations (Society,
 * Trust, HUF, …): the applicant picks Telangana, Andhra Pradesh or Karnataka,
 * and each state is its own inactive `labour-licence-<state>` row nested under
 * `labour-licence` in Admin → Services. `scripts/backfill-labour-licence.ts`
 * creates those rows and writes what is below; the admin edits them from then on.
 *
 * Fees: the document's Professional Fee and GST are the fee lines. Its
 * government fee is a per-state slab on the number of persons employed, which
 * the application asks for, so the backend computes it — see config/labourFees.
 *
 * Documents: the document gives one list. Its name-board item asks for a Telugu
 * board, which is the Telangana / Andhra Pradesh requirement; Karnataka's Shops
 * & Establishments rules require the board in Kannada, so that state's item says
 * so. The Memorandum item applies to companies only — the application drops it
 * for any other type of organisation.
 */

export type LabourStateEntry = {
  state: string;
  feeLines: { label: string; amount: number }[];
  documents: string[];
};

const FEE_LINES = [
  { label: "Professional Fee", amount: 2499 },
  { label: "GST @ 18%", amount: 450 },
];

const documents = (nameBoardLanguage: string) => [
  `${nameBoardLanguage} Name Board Photograph of the particular shop or establishment`,
  "Copy of Rental deed or sale deed of the particular shop or establishment",
  "I.D. proof of the employer (Aadhaar and PAN)",
  "One passport size photograph of the employer",
  "Certificate of Incorporation",
  "Memorandum of Articles (companies only)",
];

export const LABOUR_BASE_SLUG = "labour-licence";

export const LABOUR_CATALOG: Record<string, LabourStateEntry> = {
  "labour-licence-telangana": { state: "Telangana", feeLines: FEE_LINES, documents: documents("Telugu") },
  "labour-licence-andhra-pradesh": { state: "Andhra Pradesh", feeLines: FEE_LINES, documents: documents("Telugu") },
  "labour-licence-karnataka": { state: "Karnataka", feeLines: FEE_LINES, documents: documents("Kannada") },
};
