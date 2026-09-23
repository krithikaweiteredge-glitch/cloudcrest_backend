/**
 * Catalog content for Startup India / DPIIT Recognition — source: the client's
 * "DPIIT CHANGES.docx".
 *
 * Unlike the other docx-driven catalogs this session added, this document
 * gives no About / Who can Apply narrative — only a two-tab registration
 * workflow, a new documents list and a revised fee. `scripts/backfill-dpiit.ts`
 * writes the documents and price below onto the row; the admin owns them from
 * then on. About / Who can Apply / Acts & Rules are left exactly as they are
 * on the row (currently unset) — nothing in the source document to write.
 *
 * The `dpiit` row was seeded with a 5-item generic checklist and a
 * ₹10,000 + ₹1,800 GST price (`professionalFee`/`gstPercent` and `feeLines`
 * both already set). The client reviewed this document and confirmed it
 * supersedes both, so the backfill writes unconditionally under --apply, the
 * same as `backfill-icegate.ts`.
 *
 * The document specifies a two-tab registration workflow, which the wizard
 * implements (see `frontend/src/components/dpiit-wizard.tsx`):
 *
 *   Tab 1 — Enterprise name, type of enterprise (five types) and the
 *           authorised person's name, mobile and email.
 *   Tab 2 — Business type (Manufacturer / Service Provider / Both), number of
 *           employees, and business details.
 *
 * The document's documents list is not split by enterprise type — it applies
 * as given, with two entries the document itself marks "For companies and
 * LLP" and three entries scoped to one enterprise type each (MOA & AOA for a
 * Company, LLP Agreement for an LLP, Partnership Deed for a Partnership).
 */

export type DpiitFeeLine = { label: string; amount: number };

export const DPIIT_SLUG = "dpiit";

/**
 * The client's revised price for DPIIT recognition — was ₹10,000 + ₹1,800 GST.
 * Written by the backfill; the admin owns it after.
 */
export const DPIIT_FEE_LINES: DpiitFeeLine[] = [
  { label: "Professional Fee", amount: 9999 },
  { label: "GST @ 18%", amount: 1800 },
];

/* ------------------------------------------------------------------ *
 * Tab 1 — enterprise types.
 * ------------------------------------------------------------------ */

export const DPIIT_ENTERPRISE_TYPES = ["Company", "LLP", "Partnership", "Cooperative", "Sole Proprietor"] as const;
export type DpiitEnterpriseType = (typeof DPIIT_ENTERPRISE_TYPES)[number];

/* ------------------------------------------------------------------ *
 * Tab 2 — business type.
 * ------------------------------------------------------------------ */

export const DPIIT_BUSINESS_TYPES = ["Manufacturer", "Service Provider", "Both"] as const;

/**
 * The general "Documents Required" list, verbatim from the document. This is
 * what becomes `document_types` rows, so the admin owns it.
 */
export const DPIIT_DOCUMENTS = [
  "UDYAM Certificate",
  "GST Certificate",
  "Website Link",
  "Pitch Deck about Business",
  "Company Logo",
  "Certificate of Incorporation (for companies and LLP)",
  "Directors' Mail and Mobile (for companies and LLP)",
  "IPR documents (Patent / Trademark / Copyright filing receipts or certificates), if any",
  "MOA & AOA (Company)",
  "LLP Agreement (LLP)",
  "Partnership Deed (Partnership)",
];

/**
 * The entries the document scopes to one or two enterprise types rather than
 * every applicant, so the backfill does not mark them mandatory.
 */
export const DPIIT_OPTIONAL_DOCUMENT_RE =
  /for companies and llp|if any|^moa & aoa|^llp agreement|^partnership deed/i;

/**
 * Per-enterprise-type documents, for the wizard's submit-time checklist. The
 * document's list isn't fully split by type, so this keeps every applicant's
 * common items and adds only the one entry scoped to their type.
 */
const DPIIT_COMMON_DOCUMENTS = [
  "UDYAM Certificate",
  "GST Certificate",
  "Website Link",
  "Pitch Deck about Business",
  "Company Logo",
  "IPR documents (Patent / Trademark / Copyright filing receipts or certificates), if any",
];

export const DPIIT_APPLICATION_DOCUMENTS: Record<DpiitEnterpriseType, string[]> = {
  Company: [
    ...DPIIT_COMMON_DOCUMENTS,
    "Certificate of Incorporation",
    "Directors' Mail and Mobile",
    "MOA & AOA",
  ],
  LLP: [
    ...DPIIT_COMMON_DOCUMENTS,
    "Certificate of Incorporation",
    "Directors' Mail and Mobile",
    "LLP Agreement",
  ],
  Partnership: [...DPIIT_COMMON_DOCUMENTS, "Partnership Deed"],
  Cooperative: DPIIT_COMMON_DOCUMENTS,
  "Sole Proprietor": DPIIT_COMMON_DOCUMENTS,
};
