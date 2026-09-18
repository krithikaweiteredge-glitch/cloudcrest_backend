/**
 * Catalog content for PAN / TAN — source: the client's "PANTAN Changes.docx".
 *
 * The document splits the service in two at the first page (PAN or TAN) and
 * then branches differently down each side, so each gets its own catalog row
 * under the existing `pan-tan` launcher:
 *
 *   PAN (`pan-tan-pan`)
 *     → applicant category: Indian Citizen (Form 93), Indian Non-Individual
 *       Entity (Form 94), Individual Who Is Not an Indian Citizen (Form 95),
 *       Foreign Non-Individual Entity (Form 96)
 *     → then Physical vs E-PAN for an Indian citizen, or an entity type for
 *       either non-individual category; a non-citizen individual goes straight
 *       to the checklist
 *
 *   TAN (`pan-tan-tan`)
 *     → DSC mode, then the category of deductor (Form 135, non-government)
 *     → a company or its branch also picks a company type and nationality;
 *       every other category goes straight to the checklist
 *
 * Form numbers are the document's own (93 / 94 / 95 / 96 and 135), not the
 * statutory 49A / 49AA / 49B, at the client's instruction — they are the
 * client's internal workflow codes.
 *
 * Documents: the document lists most requirements as alternatives ("Any ONE:
 * Aadhaar / Passport / Driving License / Voter ID"). Each such group is ONE
 * checklist entry naming the alternatives, so the applicant uploads one file
 * against it rather than seeing a slot per alternative they will never fill.
 *
 * Fees: ₹499 professional + ₹90 GST on both rows, per the client. That is the
 * value `scripts/backfill-pan-tan.ts` seeds; the admin owns both amounts in
 * Admin → Services from then on, and the wizard reads whatever is published
 * through the `pan-tan` fee context.
 */

export type PanTanFeeLine = { label: string; amount: number };

export const PAN_TAN_BASE_SLUG = "pan-tan";
export const PAN_SLUG = "pan-tan-pan";
export const TAN_SLUG = "pan-tan-tan";

/** The client's price. Identical on both rows today; each is editable alone. */
export const PAN_TAN_FEE_LINES: PanTanFeeLine[] = [
  { label: "Professional Fee", amount: 499 },
  { label: "GST @ 18%", amount: 90 },
];

/* ------------------------------------------------------------------ *
 * PAN — page 2: applicant category.
 * ------------------------------------------------------------------ */

export const PAN_CATEGORY_KEYS = [
  "indian-citizen",
  "indian-entity",
  "foreign-individual",
  "foreign-entity",
] as const;

export type PanCategoryKey = (typeof PAN_CATEGORY_KEYS)[number];

export type PanCategory = {
  key: PanCategoryKey;
  title: string;
  form: string;
  blurb: string;
};

export const PAN_CATEGORIES: PanCategory[] = [
  {
    key: "indian-citizen",
    title: "Indian Citizen",
    form: "Form 93",
    blurb: "An individual who is a citizen of India, applying for a physical PAN card or an instant e-PAN.",
  },
  {
    key: "indian-entity",
    title: "Indian Non-Individual Entity",
    form: "Form 94",
    blurb: "A company, LLP, firm, trust, HUF, AOP/BOI, artificial juridical person or local authority formed in India.",
  },
  {
    key: "foreign-individual",
    title: "Individual Who Is Not an Indian Citizen",
    form: "Form 95",
    blurb: "An individual who is not an Indian citizen — a foreign national, PIO or OCI cardholder.",
  },
  {
    key: "foreign-entity",
    title: "Foreign Non-Individual Entity",
    form: "Form 96",
    blurb: "An entity incorporated or registered outside India, or with an approved office in India.",
  },
];

/* ------------------------------------------------------------------ *
 * PAN — page 3: applicant / entity type.
 * ------------------------------------------------------------------ */

/** Indian citizen only — physical card or the instant e-PAN. */
export const PAN_DELIVERY_MODES = ["Physical PAN", "E-PAN (Instant)"] as const;
export type PanDeliveryMode = (typeof PAN_DELIVERY_MODES)[number];

/** Indian non-individual entity types, in the document's order. */
export const PAN_INDIAN_ENTITY_TYPES = [
  "Company",
  "Association of Persons / Body of Individuals",
  "Trust",
  "Limited Liability Partnership",
  "Firm",
  "Hindu Undivided Family",
  "Artificial Juridical Person",
  "Local Authority",
] as const;

/**
 * Foreign non-individual entity types, in the document's order. It splits
 * "Association of Persons" and "Body of Individuals" here where the Indian list
 * combines them, and has no Hindu Undivided Family — both kept as written.
 */
export const PAN_FOREIGN_ENTITY_TYPES = [
  "Association of Persons",
  "Body of Individuals",
  "Company",
  "Trust",
  "Limited Liability Partnership",
  "Firm",
  "Artificial Juridical Person",
  "Local Authority",
] as const;

/* ------------------------------------------------------------------ *
 * PAN — the document checklists.
 * ------------------------------------------------------------------ */

const PAN_PHYSICAL_DOCUMENTS = [
  "Proof of Identity & Address — Aadhaar Card / Indian Passport / Driving License / Voter ID (any one)",
  "Proof of Date of Birth — Birth Certificate / Marriage Certificate / Indian Passport / Driving License / Voter ID (any one)",
  "Passport-size photograph",
  "Signature copy",
];

const PAN_EPAN_DOCUMENTS = ["Aadhaar Card", "Passport-size photograph", "Signature copy"];

/**
 * One entry per Indian non-individual entity type. The document gives each its
 * own single requirement, phrased as alternatives.
 */
const PAN_INDIAN_ENTITY_DOCUMENTS: Record<string, string> = {
  Company:
    "Certificate of Registration issued in India by the Registrar of Companies OR the Corporate Identity Number (CIN)",
  "Association of Persons / Body of Individuals":
    "Copy of the agreement OR Certificate of Registration from the relevant authority OR a Central / State Government document establishing identity and address",
  Trust:
    "Trust Deed OR Certificate of Registration issued by the Charity Commissioner",
  "Limited Liability Partnership":
    "Certificate of Registration issued by the Registrar of LLPs OR the LLP Identification Number",
  Firm: "Certificate of Registration issued by the Registrar of Firms OR the Partnership Deed",
  "Hindu Undivided Family":
    "Original authenticated Karta affidavit OR the applicable Karta proof of identity, address and date of birth",
  "Artificial Juridical Person":
    "Government Department document establishing identity and address",
  "Local Authority": "Government Department document establishing identity and address",
};

const PAN_FOREIGN_INDIVIDUAL_DOCUMENTS = [
  "Proof of Identity — Passport / PIO card issued by the Government of India / OCI card issued by the Government of India / other prescribed national or citizenship ID or Taxpayer Identification Number, duly attested (any one)",
  "Proof of Address — Passport / PIO card / OCI card / other prescribed national ID or Taxpayer Identification Number / bank account statement in the country of residence / NRE bank account statement in India / certificate of residence in India or Residential Permit / Foreigners Registration Office certificate showing an Indian address / visa with appointment letter or contract and the employer's Indian address certificate (any one)",
  "Proof of Date of Birth — Passport / PIO card / OCI card / other prescribed ID or Taxpayer Identification Number containing date of birth / birth certificate issued by the relevant authority / foreign birth certificate, duly attested (any one)",
];

const PAN_FOREIGN_ENTITY_DOCUMENTS = [
  "Certificate of Registration issued in the country where the applicant is located, duly attested OR the registration certificate issued in India / approval granted by Indian authorities to set up an office in India (any one)",
];

/** The checklist for one PAN application. */
export function panDocuments(
  category: string,
  deliveryMode: string,
  entityType: string,
): string[] {
  if (category === "indian-citizen") {
    return deliveryMode === "E-PAN (Instant)"
      ? [...PAN_EPAN_DOCUMENTS]
      : [...PAN_PHYSICAL_DOCUMENTS];
  }
  if (category === "indian-entity") {
    const doc = PAN_INDIAN_ENTITY_DOCUMENTS[entityType.trim()];
    return doc ? [doc] : [];
  }
  if (category === "foreign-individual") return [...PAN_FOREIGN_INDIVIDUAL_DOCUMENTS];
  if (category === "foreign-entity") return [...PAN_FOREIGN_ENTITY_DOCUMENTS];
  return [];
}

/* ------------------------------------------------------------------ *
 * TAN.
 * ------------------------------------------------------------------ */

/**
 * The document shows this as a checkbox, but the two are mutually exclusive —
 * an applicant is one or the other — so the wizard renders them as a pair of
 * option cards.
 */
export const TAN_DSC_MODES = ["Non-DSC User", "DSC User"] as const;

/** Category of deductor — Form 135, non-government category. */
export const TAN_DEDUCTOR_CATEGORIES = [
  "Company",
  "Branch / Division of a Company",
  "Individual",
  "Branch of Individual Business (Sole Proprietorship)",
  "LLP / Firm / Association of Persons / Trust / Body of Individuals / Artificial Juridical Person / Hindu Undivided Family",
  "Branch of LLP / Firm / Association of Persons / Trust / Body of Individuals / Artificial Juridical Person / Hindu Undivided Family",
] as const;

export const TAN_FORM = "Form 135";

/** Asked only of a company or a company's branch / division. */
export const TAN_COMPANY_TYPES = [
  "Central Government Company / Company established by Central Act",
  "State Government Company / Company established by State Act",
  "Public Limited Company",
  "Private Limited Company",
  "One Person Company",
  "Section 8 Company",
  "Other Company",
] as const;

export const TAN_NATIONALITIES = ["Indian", "Foreign"] as const;

/** True when the deductor category is a company or a company's branch. */
export const tanIsCompany = (category: string) =>
  category === "Company" || category === "Branch / Division of a Company";

/** True when the deductor category is an individual or a sole proprietor's branch. */
export const tanIsIndividual = (category: string) =>
  category === "Individual" || category === "Branch of Individual Business (Sole Proprietorship)";

const TAN_COMPANY_DOCUMENTS = [
  "Copy of the Certificate of Registration issued in India by the Registrar of Companies",
];

const TAN_INDIVIDUAL_DOCUMENTS = [
  "Proof of Identity — Aadhaar Card / Indian Passport / Driving License / Voter ID (any one)",
  "Proof of Address — Aadhaar Card / Indian Passport / Voter ID / Electricity Bill not more than 3 months old / Property Registration Document (any one)",
  "Proof of Date of Birth — Birth Certificate / Indian Passport / Voter ID / Marriage Certificate / Matriculation Certificate (any one)",
];

/** LLP / Firm / AOP / Trust / BOI / AJP / HUF and their branches. */
const TAN_ENTITY_DOCUMENTS = ["Registration Certificate"];

/**
 * The PAN card of the person responsible is a document; their designation,
 * mobile and email are data the wizard collects as fields instead of asking for
 * a file that does not exist. Asked of every category except an individual
 * deductor, who is that person.
 */
export const TAN_RESPONSIBLE_PERSON_DOCUMENT =
  "PAN card of the person responsible for deduction / collection";

/** The checklist for one TAN application. */
export function tanDocuments(deductorCategory: string): string[] {
  const category = deductorCategory.trim();
  if (!category) return [];
  if (tanIsIndividual(category)) return [...TAN_INDIVIDUAL_DOCUMENTS];
  if (tanIsCompany(category)) return [...TAN_COMPANY_DOCUMENTS, TAN_RESPONSIBLE_PERSON_DOCUMENT];
  // LLP / Firm / AOP / Trust / BOI / AJP / HUF and their branches — the
  // document says "same as Company", plus the authorised person's details.
  return [...TAN_ENTITY_DOCUMENTS, TAN_RESPONSIBLE_PERSON_DOCUMENT];
}

/* ------------------------------------------------------------------ *
 * Service page copy.
 * ------------------------------------------------------------------ */

export const PAN_DESCRIPTION =
  "A Permanent Account Number (PAN) is the ten-character alphanumeric identifier issued by the Income Tax Department to every taxpayer. It is quoted on income tax returns, on specified financial transactions, and as proof of identity across banking and investment.\n\n" +
  "The application route depends on who is applying — an Indian citizen, an Indian non-individual entity, an individual who is not an Indian citizen, or a foreign entity — and each route has its own form and its own document set. An Indian citizen can choose between a physical PAN card and an instant e-PAN issued against Aadhaar.";

export const PAN_WHO_CAN_APPLY =
  "• Indian citizens applying for a physical PAN card or an instant e-PAN (Form 93).\n" +
  "• Indian non-individual entities — company, LLP, firm, trust, HUF, AOP / BOI, artificial juridical person or local authority (Form 94).\n" +
  "• Individuals who are not Indian citizens, including foreign nationals, PIO and OCI cardholders (Form 95).\n" +
  "• Foreign non-individual entities, whether registered abroad or approved to set up an office in India (Form 96).";

export const TAN_DESCRIPTION =
  "A Tax Deduction and Collection Account Number (TAN) is the ten-character alphanumeric number every person who deducts or collects tax at source must obtain. It is quoted on all TDS / TCS returns, challans and certificates, and deducting without one is not permitted.\n\n" +
  "The application asks for the category of deductor, and — for a company or a company's branch — the type of company and whether the deductor is Indian or foreign. The details of the person responsible for deduction or collection are part of the application.";

export const TAN_WHO_CAN_APPLY =
  "• Companies and the branches or divisions of a company that deduct or collect tax at source.\n" +
  "• Individuals and the branches of an individual's business (sole proprietorship) liable to deduct tax.\n" +
  "• LLPs, firms, associations of persons, trusts, bodies of individuals, artificial juridical persons and Hindu Undivided Families — and their branches.\n" +
  "• Any other person required by the Income Tax Act to deduct or collect tax at source.";

export const PAN_TAN_ACTS_RULES = "Income Tax Act, 1961";

/**
 * The general "Documents required" list each service page shows. The page
 * cannot know the applicant's category yet — that is asked in the wizard — so
 * it shows the shape of what is needed and the wizard narrows it.
 */
export const PAN_GENERAL_DOCUMENTS = [
  "Proof of identity (Aadhaar, Passport, Driving License or Voter ID, as applicable)",
  "Proof of address",
  "Proof of date of birth",
  "Passport-size photograph and signature copy (individual applicants)",
  "Certificate of registration / incorporation, trust deed or partnership deed (non-individual applicants)",
];

export const TAN_GENERAL_DOCUMENTS = [
  "Certificate of registration of the deductor (companies, LLPs, firms, trusts and their branches)",
  "Proof of identity, address and date of birth (individual deductors and sole proprietors)",
  "PAN card of the person responsible for deduction / collection",
  "Designation, mobile number and email ID of the person responsible",
];

export type PanTanRow = {
  slug: string;
  name: string;
  shortTitle: string;
  form: string;
  icon: string;
  description: string;
  whoCanApply: string;
  documents: string[];
};

export const PAN_TAN_ROWS: PanTanRow[] = [
  {
    slug: PAN_SLUG,
    name: "PAN",
    shortTitle: "PAN",
    form: "Form 93 / 94 / 95 / 96",
    icon: "IdCard",
    description: PAN_DESCRIPTION,
    whoCanApply: PAN_WHO_CAN_APPLY,
    documents: PAN_GENERAL_DOCUMENTS,
  },
  {
    slug: TAN_SLUG,
    name: "TAN",
    shortTitle: "TAN",
    form: TAN_FORM,
    icon: "FileText",
    description: TAN_DESCRIPTION,
    whoCanApply: TAN_WHO_CAN_APPLY,
    documents: TAN_GENERAL_DOCUMENTS,
  },
];
