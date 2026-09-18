/**
 * Catalog content for GST Registration — source: the client's
 * "GST_Registration_changes.docx".
 *
 * The document restructures GST registration into a three-page flow:
 *
 *   1. Select the service / taxpayer type — the nine cards in `GST_TYPES`.
 *      The document lists eleven categories and says the last three
 *      ("Non-Resident Online Services Provider", "SEZ Developer / SEZ Unit" and
 *      "UN Bodies / Embassies / Other Notified Persons (UIN)") should appear as
 *      a single "Other Registrations" card, so they are one entry whose
 *      `covers` names all three.
 *   2. Business name, State / UT, constitution of business, contact person and
 *      business details.
 *   3. A document checklist that changes with the constitution of business and
 *      the taxpayer type.
 *
 * Fees: the document prices EVERY GST registration at a Professional Fee of
 * ₹2,499 plus GST @ 18% of ₹450, and names no government fee — so, like
 * Professional Tax, nothing is computed in the backend. `GST_FEE_LINES` below is
 * only the starting value written by `scripts/backfill-gst.ts`; from then on the
 * admin owns both amounts in Admin → Services and the wizard reads whatever is
 * on the row (see `feesController`'s `gst` branch).
 *
 * Documents come in two lists, because the page and the application ask for
 * different things:
 *
 *   - `documents` on each entry — the general "Documents required" list the
 *     service page shows. These become `document_types` rows, so the admin owns
 *     them from Admin → Services.
 *   - `GST_CONSTITUTION_DOCUMENTS` + `GST_TYPE_ADDITIONAL_DOCUMENTS` — the
 *     document's dynamic checklist, which is what the applicant is actually
 *     asked to bring when submitting. It depends on the constitution of business
 *     and the taxpayer type, so it is code rather than admin content, and the
 *     wizard mirrors it (see `frontend/src/components/gst-wizard.tsx`).
 *
 * Note on the LLP list: the document's LLP block asks for the Aadhaar, PAN and
 * contact details "of all Directors", which is the Company block's wording — an
 * LLP has designated partners, not directors, and the same block's photo line
 * already says "Photos of Designated Partners". The three lines are written for
 * designated partners here.
 */

export type GstFeeLine = { label: string; amount: number };

/* ------------------------------------------------------------------ *
 * Page 1 — taxpayer types.
 * ------------------------------------------------------------------ */

export const GST_TYPE_KEYS = [
  "regular",
  "rule-14a",
  "composition",
  "casual",
  "nrtp",
  "isd",
  "tds",
  "tcs",
  "other",
] as const;

export type GstTypeKey = (typeof GST_TYPE_KEYS)[number];

export type GstTypeEntry = {
  key: GstTypeKey;
  /** Catalog slug, `gst-<key>`. */
  slug: string;
  title: string;
  short: string;
  form: string;
  icon: string;
  tags: string[];
  popular?: boolean;
  /** One-line description on the picker card. */
  blurb: string;
  /** The categories a grouped card stands in for — shown under its title. */
  covers?: string[];
  description: string;
  whoCanApply: string;
};

export const GST_TYPES: GstTypeEntry[] = [
  {
    key: "regular",
    slug: "gst-regular",
    title: "Normal Scheme (Regular)",
    short: "Regular",
    form: "REG-01",
    icon: "Wallet",
    tags: ["Most common", "Full ITC"],
    popular: true,
    blurb: "Standard registration for businesses crossing the turnover threshold.",
    description:
      "The normal scheme is the standard GST registration for businesses that cross the prescribed turnover threshold or otherwise make taxable supplies. A regular taxpayer collects GST from customers, claims input tax credit on eligible purchases and files periodic returns.\n\nThis is the most common category and suits the majority of trading, manufacturing and service businesses.",
    whoCanApply:
      "• Aggregate turnover above ₹40 lakh (goods) or ₹20 lakh (services).\n• ₹20 lakh / ₹10 lakh threshold for special-category states.\n• Anyone making regular taxable supplies of goods or services.",
  },
  {
    key: "rule-14a",
    slug: "gst-rule-14a",
    title: "Normal Scheme — Under Rule 14A",
    short: "Rule 14A",
    form: "REG-01",
    icon: "Zap",
    tags: ["Certificate in 3 days", "Aadhaar authenticated"],
    blurb: "The simplified route — registration certificate within 3 days.",
    description:
      "Rule 14A is the simplified, optional route to a normal GST registration for small taxpayers. An applicant who opts in and completes Aadhaar authentication is granted the registration certificate within three working days, instead of waiting out the standard verification timeline.\n\nEverything else works exactly as it does under the normal scheme — the taxpayer collects GST, claims input tax credit and files the same periodic returns.",
    whoCanApply:
      "• Applicants for a normal registration who opt for the Rule 14A route.\n• Aadhaar authentication of the authorised signatory is required.\n• Registration certificate is granted within 3 working days.",
  },
  {
    key: "composition",
    slug: "gst-composition",
    title: "Composition Scheme",
    short: "Composition",
    form: "REG-01 · CMP-02",
    icon: "Wallet",
    tags: ["Flat rate", "Turnover ≤ ₹1.5 Cr"],
    blurb: "A flat-rate scheme for small taxpayers with simpler compliance.",
    description:
      "The composition scheme is a simplified GST option for small taxpayers. Instead of the regular rates, eligible businesses pay tax at a low flat rate on turnover, file quarterly and enjoy much lighter compliance.\n\nThe trade-off: a composition dealer cannot collect GST from customers or claim input tax credit, and cannot make inter-state supplies or supply through e-commerce operators.",
    whoCanApply:
      "• Aggregate turnover up to ₹1.5 crore (₹75 lakh for special-category states).\n• Pay tax at a flat rate; cannot collect tax from customers or claim ITC.\n• Not available to inter-state suppliers or supplies through e-commerce operators.",
  },
  {
    key: "casual",
    slug: "gst-casual",
    title: "Casual Taxable Person (CTP)",
    short: "CTP",
    form: "REG-01",
    icon: "Wallet",
    tags: ["Occasional", "Advance tax"],
    blurb: "For occasional supplies in a state where you have no fixed place of business.",
    description:
      "A casual taxable person occasionally supplies goods or services in a state or union territory where they have no fixed place of business — for example at an exhibition, trade fair or seasonal stall.\n\nRegistration is required before supply begins, and an advance deposit of the estimated tax liability is payable. The registration is valid for up to 90 days and can be extended once.",
    whoCanApply:
      "• A person who occasionally supplies goods / services where they have no fixed establishment.\n• Typical for exhibitions, trade fairs and seasonal stalls.\n• Must deposit advance tax based on estimated liability; valid up to 90 days.",
  },
  {
    key: "nrtp",
    slug: "gst-nrtp",
    title: "Non-Resident Taxable Person (NRTP)",
    short: "NRTP",
    form: "REG-09",
    icon: "Globe",
    tags: ["Foreign", "Advance tax"],
    blurb: "For persons based outside India making taxable supplies in India.",
    description:
      "A non-resident taxable person resides outside India but occasionally supplies goods or services in India without a fixed place of business here.\n\nRegistration is made on Form GST REG-09 at least five days before commencing business, along with an advance deposit of the estimated tax liability for the registration period.",
    whoCanApply:
      "• A person residing outside India who occasionally supplies goods / services in India.\n• Has no fixed place of business in India.\n• Registers via Form REG-09 with an advance tax deposit.",
  },
  {
    key: "isd",
    slug: "gst-isd",
    title: "Input Service Distributor (ISD)",
    short: "ISD",
    form: "REG-01",
    icon: "Share2",
    tags: ["Credit distribution"],
    blurb: "Distribute input-service tax credit across branches under the same PAN.",
    description:
      "An Input Service Distributor is an office of a business that receives tax invoices for input services and distributes the eligible input tax credit to its branch units having the same PAN.\n\nISD registration is separate from the normal GST registration and is used purely to allocate common input-service credit across locations.",
    whoCanApply:
      "• An office of a supplier that receives tax invoices for input services.\n• Distributes the eligible input tax credit to its branches having the same PAN.\n• Requires a separate ISD registration in addition to the normal GSTIN.",
  },
  {
    key: "tds",
    slug: "gst-tds",
    title: "Tax Deductor at Source (TDS)",
    short: "TDS",
    form: "REG-07",
    icon: "FileText",
    tags: ["Deductor", "TAN"],
    blurb: "For notified persons required to deduct TDS on payments to suppliers.",
    description:
      "Certain notified persons must register as a GST deductor. Government departments, local authorities and specified agencies deduct tax at source on payments made to suppliers and register on Form GST REG-07.\n\nThis registration is separate from a supplier's regular GSTIN and is keyed to the deductor's TAN.",
    whoCanApply:
      "• Government departments, local authorities and notified persons required to deduct TDS under GST.\n• Registers via Form REG-07 using the deductor's TAN.\n• Requires details of the Drawing and Disbursing Officer where applicable.",
  },
  {
    key: "tcs",
    slug: "gst-tcs",
    title: "Tax Collector at Source (TCS)",
    short: "TCS",
    form: "REG-07",
    icon: "ShoppingCart",
    tags: ["Collector", "Mandatory"],
    blurb: "For e-commerce operators required to collect TCS on supplies made through them.",
    description:
      "An e-commerce operator that facilitates the supply of goods or services between other parties must register as a tax collector and collect Tax Collected at Source on the net value of taxable supplies made through the platform.\n\nRegistration is mandatory irrespective of turnover and is made on Form GST REG-07.",
    whoCanApply:
      "• E-commerce operators facilitating supplies between sellers and buyers.\n• Registration is mandatory regardless of turnover.\n• Required to collect TCS on the net value of taxable supplies through the platform.",
  },
  {
    key: "other",
    slug: "gst-other",
    title: "Other Registrations",
    short: "Other",
    form: "REG-01 · REG-13",
    icon: "Shield",
    tags: ["OIDAR", "SEZ", "UIN"],
    blurb: "Non-resident online services providers, SEZ developers / units and UIN holders.",
    covers: [
      "Non-Resident Online Services Provider",
      "SEZ Developer / SEZ Unit",
      "UN Bodies / Embassies / Other Notified Persons (UIN)",
    ],
    description:
      "Three registrations that fall outside the standard categories are handled together here, because they ask for the same set of documents:\n\n• Non-Resident Online Services Provider — an OIDAR supplier providing online information and database access or retrieval services into India from outside the country.\n• SEZ Developer / SEZ Unit — a developer or a unit in a Special Economic Zone, which registers separately from any other place of business in the same state.\n• UN Bodies, Embassies and Other Notified Persons — who obtain a Unique Identity Number (UIN) to claim refund of the tax paid on their inward supplies.\n\nYour Cloudcrest BM advisor confirms which of the three applies and files on the correct form.",
    whoCanApply:
      "• Non-resident online services (OIDAR) providers supplying into India from outside the country.\n• SEZ developers and SEZ units.\n• UN bodies, embassies, consulates and other notified persons applying for a Unique Identity Number (UIN).",
  },
];

/** The slugs the document's list retires, replaced by the nine above. */
export const GST_RETIRED_SLUGS = [
  // Not a category in the document's list.
  "gst-voluntary",
  // Replaced by `gst-tcs`, which the document names separately.
  "gst-ecom",
  // The document splits deductor and collector into their own categories.
  "gst-tds_tcs",
];

export const GST_BASE_SLUG = "gst";

export const gstTypeBySlug = (slug: string): GstTypeEntry | undefined =>
  GST_TYPES.find((t) => t.slug === slug);

/* ------------------------------------------------------------------ *
 * Page 2 — constitution of business.
 * ------------------------------------------------------------------ */

/** The eight entity types the document lists, in its order. */
export const GST_CONSTITUTIONS = [
  "Proprietorship / Individual",
  "Partnership Firm",
  "Limited Liability Partnership (LLP)",
  "Private Limited Company",
  "Public Limited Company",
  "One Person Company",
  "Hindu Undivided Family (HUF)",
  "Society / Club / Association of Persons (AOP) / Body of Individuals (BOI)",
] as const;

export type GstConstitution = (typeof GST_CONSTITUTIONS)[number];

/**
 * Which of the document's six checklists each constitution uses. The three
 * company forms share the document's "Company" list, which is written for an
 * entity with directors.
 */
const CHECKLIST_OF_CONSTITUTION: Record<GstConstitution, keyof typeof GST_CONSTITUTION_DOCUMENTS> = {
  "Proprietorship / Individual": "proprietorship",
  "Partnership Firm": "partnership",
  "Limited Liability Partnership (LLP)": "llp",
  "Private Limited Company": "company",
  "Public Limited Company": "company",
  "One Person Company": "company",
  "Hindu Undivided Family (HUF)": "huf",
  "Society / Club / Association of Persons (AOP) / Body of Individuals (BOI)": "society",
};

/* ------------------------------------------------------------------ *
 * Page 3 — the dynamic checklist.
 * ------------------------------------------------------------------ */

/** The document's six constitution-wise checklists, verbatim and in its order. */
export const GST_CONSTITUTION_DOCUMENTS = {
  proprietorship: [
    "PAN of Proprietor",
    "Aadhaar of Proprietor",
    "Photograph of Proprietor",
    "Proof of Principal Place of Business",
    "Electricity Bill",
    "Rental Agreement / NOC",
    "Supporting Document for Trade Name (Trade licence or any other government licence certificate)",
    "Bank Account Proof",
  ],
  partnership: [
    "PAN of Firm",
    "PAN of all Partners",
    "Aadhaar of all Partners",
    "Partnership Deed",
    "Photos of Partners (including the Managing Partner)",
    "Mail and Mobile of all Partners",
    "Proof of Principal Place of Business",
    "Electricity Bill",
    "Rental Agreement / NOC",
    "Supporting Document for Trade Name (Trade licence or any other government licence certificate)",
    "Bank Proof",
  ],
  company: [
    "PAN of Entity",
    "Certificate of Incorporation",
    "Photos of Directors",
    "Aadhaar of all Directors",
    "PAN of all Directors",
    "Mail and Mobile of all Directors",
    "Proof of Principal Place of Business",
    "Electricity Bill",
    "Rental Agreement / NOC",
    "Supporting Document for Trade Name (Trade licence or any other government licence certificate)",
    "Bank Proof",
  ],
  llp: [
    "PAN of Entity",
    "Certificate of Incorporation",
    "Photos of Designated Partners",
    "Aadhaar of all Designated Partners",
    "PAN of all Designated Partners",
    "Mail and Mobile of all Designated Partners",
    "Proof of Principal Place of Business",
    "Electricity Bill",
    "Rental Agreement / NOC",
    "Supporting Document for Trade Name (Trade licence or any other government licence certificate)",
    "Bank Proof",
  ],
  huf: [
    "PAN of HUF",
    "Aadhaar of Karta",
    "Photo and details of Karta",
    "Proof of Principal Place of Business",
    "Electricity Bill",
    "Rental Agreement / NOC",
    "Supporting Document for Trade Name (Trade licence or any other government licence certificate)",
    "Bank Proof",
  ],
  society: [
    "PAN of Society",
    "PAN of all Members",
    "Aadhaar of all Members",
    "Society By-laws",
    "Photos of all Members",
    "Mail and Mobile of all Members",
    "Proof of Principal Place of Business",
    "Electricity Bill",
    "Rental Agreement / NOC",
    "Supporting Document for Trade Name (Trade licence or any other government licence certificate)",
    "Bank Proof",
  ],
} as const;

/**
 * The document's "Additional docs for special type of registrations" — added on
 * top of the constitution checklist for the taxpayer types that need them. The
 * types absent from this map add nothing.
 *
 * The "Other Registrations" card stands in for three categories, so its list is
 * the union of the document's non-resident-online-provider and UIN items; the
 * document names no extra documents for an SEZ developer or unit beyond the
 * constitution checklist.
 */
export const GST_TYPE_ADDITIONAL_DOCUMENTS: Partial<Record<GstTypeKey, string[]>> = {
  nrtp: [
    "Bank Account Proof",
    "Passport / TIN / unique identification number of the foreign entity (as applicable)",
    "Clearance certificate / Certificate of Incorporation / Licence from the country of origin",
  ],
  other: [
    "Proof of Bank Accounts",
    "Passport / TIN / unique identification number of the foreign entity (as applicable)",
    "Clearance certificate / Certificate of Incorporation / Licence from the country of origin (for OIDAR)",
    "MEA letter / relevant notification details (as applicable, for UIN)",
  ],
  tds: [
    "Documents as prescribed for the specific category (constitution documents, Authorised Signatory and Bank proof)",
    "Details of the Drawing and Disbursing Officer (DDO), where applicable",
  ],
  tcs: [
    "Documents as prescribed for the specific category (constitution documents, Authorised Signatory and Bank proof)",
    "Details of the Drawing and Disbursing Officer (DDO), where applicable",
  ],
};

/**
 * The checklist the applicant is asked for at submission: the constitution's
 * list, then the taxpayer type's additions, de-duplicated so an item the
 * constitution already asks for isn't shown twice.
 *
 * Before a constitution is picked there is nothing sensible to narrow to, so the
 * caller gets only the type's additions — the wizard asks for the constitution
 * on the step before the checklist, so that state is momentary.
 */
export function gstApplicationDocuments(constitution: string, typeKey: string): string[] {
  const listKey = CHECKLIST_OF_CONSTITUTION[constitution.trim() as GstConstitution];
  const base: readonly string[] = listKey ? GST_CONSTITUTION_DOCUMENTS[listKey] : [];
  const extra = GST_TYPE_ADDITIONAL_DOCUMENTS[typeKey.trim() as GstTypeKey] ?? [];
  const seen = new Set<string>();
  return [...base, ...extra].filter((d) => {
    const k = d.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/* ------------------------------------------------------------------ *
 * Fees and the service page's general document list.
 * ------------------------------------------------------------------ */

/**
 * The document's price for every GST registration. Written once by
 * `scripts/backfill-gst.ts`; the admin owns both amounts thereafter.
 */
export const GST_FEE_LINES: GstFeeLine[] = [
  { label: "Professional Fee", amount: 2499 },
  { label: "GST @ 18%", amount: 450 },
];

/**
 * The base `gst` launcher row carries the same price. It has no taxpayer type
 * of its own, but it is what Admin → Services shows as the GST service's price
 * and what the fee engine falls back to for a type row that isn't priced yet,
 * so leaving it unpriced (or at a stray figure) misquotes the service. Only its
 * price is written — its name, form and documents belong to the admin.
 */
export const GST_BASE_FEE_LINES: GstFeeLine[] = GST_FEE_LINES;

/**
 * The general "Documents required" list shown on every GST service page. The
 * page can't know the applicant's constitution yet — that is asked on page 2 —
 * so it shows the common set and the wizard narrows it on page 3.
 */
export const GST_GENERAL_DOCUMENTS = [
  "PAN of the business / applicant",
  "Aadhaar of the proprietor / partners / directors",
  "Photograph of the proprietor / partners / directors",
  "Proof of Principal Place of Business",
  "Electricity Bill",
  "Rental Agreement / NOC",
  "Supporting Document for Trade Name (Trade licence or any other government licence certificate)",
  "Bank Account Proof",
  "Constitution document (Partnership Deed / Certificate of Incorporation / Society By-laws, as applicable)",
  "Mail and Mobile of all Partners / Directors / Members",
];

export type GstCatalogEntry = {
  type: GstTypeEntry;
  feeLines: GstFeeLine[];
  documents: string[];
};

/** Every GST type row, keyed by slug, as the backfill writes it. */
export const GST_CATALOG: Record<string, GstCatalogEntry> = Object.fromEntries(
  GST_TYPES.map((type) => [
    type.slug,
    { type, feeLines: GST_FEE_LINES, documents: GST_GENERAL_DOCUMENTS },
  ]),
);
