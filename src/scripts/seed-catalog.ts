/**
 * Seeds the service catalog with the figures and checklists the client supplied,
 * which until now lived hardcoded in the frontend.
 *
 * Idempotent: services are matched on `slug` and updated in place, so it is safe
 * to re-run after editing the tables below. Document types are replaced wholesale
 * for each seeded service.
 *
 *   npm run db:seed:catalog
 *
 * Fee mapping — the client priced incorporations as
 *   professional + MCA filing + stamp duty + DSC
 * but `services` has three columns (professional_fee, govt_fee, gst_percent), so:
 *   professional_fee = professional + DSC   (both are paid to us / a vendor)
 *   govt_fee         = MCA filing + stamp duty
 *   gst_percent      = 0                    (the client's totals were GST-inclusive)
 * Totals therefore match the old frontend figures exactly.
 */
import { db, pool } from "../config/db.js";
import {
  serviceCategories,
  serviceSubcategories,
  services,
  documentTypes,
} from "../models/schema.js";
import { eq } from "drizzle-orm";
import { COMPANY_WIZARD_DEFAULTS } from "../config/companyWizardDefaults.js";
import { EXACT_NAMES } from "../config/exactNames.js";

type SeedService = {
  slug: string;
  name: string;
  shortTitle: string;
  authority: string;
  formNo: string;
  icon: string;
  description?: string;
  whoCanApply?: string;
  professionalFee: number;
  govtFee: number;
  gstPercent: number;
  documents: string[];
  /**
   * The customer sidebar lists every *active* service that has a slug. Entity-type
   * variants (`company-pvt`, `llp-micro_llp`) exist only so the wizards can price
   * each type, so they are seeded inactive: still resolvable by slug, never listed.
   */
  active?: boolean;
};

type SeedGroup = { category: string; subcategory: string; services: SeedService[] };

// ---------------------------------------------------------------------------
// Company incorporation — one row per entity type, plus the base `company` row
// the wizard falls back to. Source: FEE_TABLE in company-wizard.tsx.
//   professional = professional + dsc, govt = mca + stamp
// DSC was ₹1,500 for pvt/OPC and ₹750/director elsewhere (2 directors assumed).
// ---------------------------------------------------------------------------
const COMPANY_DOCS = [
  "PAN & Aadhaar of all directors",
  "Passport-size photographs",
  "Address proof (utility bill < 2 months)",
  "Registered office proof",
  "Rent agreement + NOC (if rented)",
  "Digital Signature Certificate (DSC)",
  "MoA & AoA drafts",
];

const companyService = (
  slug: string,
  name: string,
  shortTitle: string,
  formNo: string
): SeedService => ({
  slug,
  name,
  shortTitle,
  authority: "MCA",
  formNo,
  icon: "Building2",
  professionalFee: 0,
  govtFee: 0,
  gstPercent: 0,
  documents: COMPANY_DOCS,
  active: slug === "company",
});

const LLP_DOCS = [
  "PAN & Aadhaar of all designated partners",
  "Passport-size photographs",
  "Address proof of designated partners",
  "Registered office proof (utility bill < 2 months)",
  "Rent agreement + NOC (if rented)",
  "Digital Signature Certificate (DSC)",
  "LLP Agreement draft",
  "Consent letters (Form 9)",
];

const llpService = (
  slug: string,
  name: string,
  shortTitle: string,
  formNo: string
): SeedService => ({
  slug,
  name,
  shortTitle,
  authority: "MCA",
  formNo,
  icon: "Handshake",
  professionalFee: 0,
  govtFee: 0,
  gstPercent: 0,
  documents: LLP_DOCS,
  active: slug === "llp",
});

// ---------------------------------------------------------------------------
// Every other service. Titles / authorities / forms come from MODULE_GROUPS and
// the checklists from DOCS_BY_SLUG (module-page.tsx).
//
// !! The client never supplied fees for these — professional/govt are seeded at 0
// so nothing invented reaches a customer. Fill them in here or in Admin → Services.
// ---------------------------------------------------------------------------
const svc = (
  slug: string,
  name: string,
  shortTitle: string,
  authority: string,
  formNo: string,
  icon: string,
  documents: string[]
): SeedService => ({
  slug,
  name,
  shortTitle,
  authority,
  formNo,
  icon,
  professionalFee: 0,
  govtFee: 0,
  gstPercent: 0,
  documents,
});

// ---------------------------------------------------------------------------
// Minimal rows for the "New registration additions" list. Only identity is
// known — fees are 0 and the document checklist is empty, so an admin fills the
// detail later in Admin → Services. Same unpriced convention as `svc` above;
// these are active so they list in the customer sidebar. Form numbers are left
// as "—" rather than invented.
// ---------------------------------------------------------------------------
const min = (
  slug: string,
  name: string,
  shortTitle: string,
  authority: string,
  icon: string
): SeedService => ({
  slug,
  name,
  shortTitle,
  authority,
  formNo: "—",
  icon,
  professionalFee: 0,
  govtFee: 0,
  gstPercent: 0,
  documents: [],
});

// ---------------------------------------------------------------------------
// Societies — captured from the live catalog (originally added via Admin, so
// until now they lived only in the DB and not in this seed).
//
// Society registration is handled STATE-WISE: the Society wizard picks a TYPE
// (MACS / Co-operative / general Society) AND a STATE (Telangana / Andhra
// Pradesh / Karnataka), and every (type × state) combination has its OWN
// who-can-apply, fee, documents and tabs. Each combination is therefore its own
// service row (slug `society-<type>-<state>`), inactive and resolved by the
// wizard exactly like the entity-type variants above. The three type rows stay
// as neutral fallbacks; the base `society` row is the last resort. An admin
// authors each combination in Admin → Services — they start empty and the wizard
// falls back to the type row until then.
//
// The MACS content below is Telangana-specific (it cites the Telangana MACS Act,
// 1995), so it is seeded onto the MACS × Telangana combo rather than the shared
// MACS type row.
// ---------------------------------------------------------------------------
const MACS_ABOUT =
  "A Mutually Aided Cooperative Society (MACS) is a self-reliant, member-owned and member-controlled cooperative registered under the Telangana Mutually Aided Co-operative Societies Act, 1995.\n" +
  "It is specially suitable for flat owners’ associations, apartment maintenance societies, plot owners’ associations, gated communities, thrift & credit groups, and farmer producer organisations.\n" +
  "Unlike traditional cooperative societies, MACS societies enjoy greater autonomy with minimal government interference and cannot accept share capital or land from the Government.";

const MACS_WHO =
  "1. A minimum of 21 individuals belonging to different families with a common bond (e.g., residents of the same apartment complex, layout, or colony).\n" +
  "2. All promoters must be adults (18 years or above) and residents within the proposed area of operation.\n" +
  "3. Existing societies registered under the Telangana Cooperative Societies Act, 1964 can also convert into a Mutually Aided Cooperative Society after returning any Government assistance.";

const MACS_DOCS = [
  "Proposed Bye-laws of the Society (duly signed by all promoters)",
  "List of promoters with full details (Name, Father’s name, Age, Address, Occupation, Aadhaar number, Mobile number, Caste, Photograph)",
  "Aadhaar cards and passport-size photographs of all promoters",
  "Proof of address of the proposed registered office",
];

// The 3 society types and 3 states the wizard offers. The combination slug the
// wizard resolves is `${type.slug}-${state.slug}`. In the admin catalog these nest
// as a tree by slug prefix: `society` › type (`society-macs`) › state
// (`society-macs-telangana`), so each type reads as a launcher with its three
// states as steps below it — the same way GST shows its registration types.
const SOCIETY_TYPES = [
  { slug: "society-macs", label: "MACS", name: "Mutually Aided Cooperative Society" },
  { slug: "society-coop", label: "Co-operative", name: "Co-operative Society" },
  { slug: "society-general", label: "General", name: "Society (General)" },
] as const;

const SOCIETY_STATES = [
  { state: "Telangana", slug: "telangana" },
  { state: "Andhra Pradesh", slug: "andhra-pradesh" },
  { state: "Karnataka", slug: "karnataka" },
] as const;

// Content already authored for a specific (type × state) cell, keyed by combo
// slug. Every combo not listed here starts empty for the admin to fill in.
const SOCIETY_COMBO_CONTENT: Record<
  string,
  Partial<Pick<SeedService, "description" | "whoCanApply" | "documents">>
> = {
  "society-macs-telangana": {
    description: MACS_ABOUT,
    whoCanApply: MACS_WHO,
    documents: MACS_DOCS,
  },
};

// One inactive row per cell of the 3×3 (type × state) grid. In the admin tree
// these render as the state steps nested under their type, so the row name is just
// the state ("Telangana"); the short title keeps the type for search. The wizard
// overrides the displayed title anyway.
const SOCIETY_COMBOS: SeedService[] = SOCIETY_TYPES.flatMap((t) =>
  SOCIETY_STATES.map((st): SeedService => {
    const slug = `${t.slug}-${st.slug}`;
    const content = SOCIETY_COMBO_CONTENT[slug] ?? {};
    return {
      slug,
      name: st.state,
      shortTitle: `${t.label} · ${st.state}`,
      authority: "Charity",
      formNo: "—",
      icon: "Award",
      professionalFee: 0,
      govtFee: 0,
      gstPercent: 0,
      documents: content.documents ?? [],
      description: content.description,
      whoCanApply: content.whoCanApply,
      active: false,
    };
  })
);

// Society type rows — the launcher for each type's state steps (and the wizard's
// fallback if a specific combination row is missing). Kept inactive so they never
// appear in the customer sidebar. The base `society` row is active (it anchors the
// wizard entry and is the top of the admin tree) but carries no content.
const SOCIETY_TYPE_ROWS: SeedService[] = [
  {
    slug: "society",
    name: "Society",
    shortTitle: "Society",
    authority: "Charity",
    formNo: "Form A",
    icon: "Award",
    professionalFee: 0,
    govtFee: 0,
    gstPercent: 0,
    documents: [],
    active: true,
  },
  ...SOCIETY_TYPES.map((t): SeedService => ({
    slug: t.slug,
    name: t.name,
    shortTitle: t.label,
    authority: "Charity",
    formNo: "—",
    icon: "Award",
    professionalFee: 0,
    govtFee: 0,
    gstPercent: 0,
    documents: [],
    active: false,
  })),
];

// Services seeded but hidden from the customer sidebar (active = false). The
// industry-specific sub-heads live "inside" their department picker (surfaced via
// the family endpoint), and a few originals aren't in the client document at all.
const INACTIVE_SLUGS = new Set<string>([
  // Industry-specific sub-heads — nested inside their department entry.
  "ind-multi-state-coop", "ind-fertiliser-dealer", "ind-dta-sale", "ind-eou-exit",
  "ind-eou-lop-extension", "ind-eou-setup", "ind-eou-exit-undertaking", "ind-eou-export-house",
  "ind-eou-apr", "ind-eou-qpr", "ind-eou-qpr-implementation", "ind-restricted-import-export",
  "ind-idr-eou", "ind-idr-sez", "ind-eou-legal-agreement", "ind-eou-lop", "ind-investment-advisor",
  "ind-investment-funds", "ind-sez-unit", "ind-sez-codeveloper", "ind-sez-developer",
  "ind-sez-clearance", "ind-ifldp-vision-doc", "ind-fdi", "ind-nbfc", "ind-food-license",
  "ind-food-import-license", "ind-petty-food", "ind-cbse-affiliation", "ind-iem-part-a",
  "ind-iem-part-b", "ind-nidhi-plus-fbo",
]);

const CATALOG: SeedGroup[] = [
  {
    category: "Entity Registration",
    subcategory: "Company Registration",
    services: [
      companyService("company", "Company Registration", "Company", "INC-32"),
      companyService("company-pvt", "Private Limited Company", "Private Limited", "INC-32"),
      companyService("company-public", "Public Limited Company", "Public Limited", "INC-32"),
      companyService("company-opc", "One Person Company (OPC)", "OPC", "INC-32"),
      companyService("company-sec8", "Section 8 Company (Non-Profit)", "Section 8", "INC-12"),
      companyService("company-guarantee", "Unlimited Company", "Unlimited Co.", "INC-32"),
      companyService("company-nidhi", "Nidhi Company", "Nidhi", "INC-32 · NDH-4"),
      companyService("company-producer", "Producer Company", "Producer Co.", "INC-32"),
    ],
  },
  {
    category: "Entity Registration",
    subcategory: "LLP Registration",
    // The LLP wizard has no entity-type step — every application is a standard
    // LLP — so there is a single row here, unlike Company.
    services: [
      llpService("llp", "LLP Registration", "LLP", "FiLLiP"),
    ],
  },
  {
    category: "Entity Registration",
    subcategory: "Other Entities",
    services: [
      svc("partnership", "Partnership Firm", "Partnership", "Registrar of Firms", "Form A", "Users", [
        "PAN of all partners",
        "Aadhaar of partners",
        "Partnership deed",
        "Address proof of firm",
        "Rent agreement / ownership proof",
      ]),
      {
        ...svc("partnership-registered", "Registered Partnership Firm", "Registered", "Registrar of Firms", "Form 1", "Users", [
          "PAN of all partners",
          "Aadhaar of partners",
          "Passport-size photographs of all partners",
          "Partnership deed executed on stamp paper",
          "Proof of principal place of business",
          "Bank account proof",
          "Form 1 application to Registrar of Firms",
          "Affidavit / statement signed by all partners",
        ]),
        active: false,
        description: "A registered partnership firm is registered with the Registrar of Firms under the Indian Partnership Act, 1932. Registration gives the firm legal standing to enforce contractual rights in court.",
        whoCanApply: "• Two or more persons carrying on business and sharing profits.\n• Firms needing legal enforceability and credibility.\n• Partners competent to contract.",
        wizardRules: JSON.stringify({ tags: ["ROF Registered", "Legal Standing"], popular: true }),
      },
      {
        ...svc("partnership-unregistered", "Unregistered Partnership Firm", "Unregistered", "Partnership Deed", "Deed", "Users", [
          "PAN of all partners",
          "Aadhaar of partners",
          "Passport-size photographs of all partners",
          "Notarised partnership deed",
          "Proof of principal place of business",
          "Bank account proof",
        ]),
        active: false,
        description: "An unregistered partnership firm is created by executing a partnership deed but is not filed with the Registrar of Firms. It is quick and low-cost to set up.",
        whoCanApply: "• Two or more persons wanting a quick, low-cost structure.\n• Firms that plan to register with the Registrar of Firms later.",
        wizardRules: JSON.stringify({ tags: ["Deed Only", "Quick Setup"] }),
      },
      svc("huf", "HUF", "HUF", "Income Tax", "HUF Deed", "HomeIcon", [
        "PAN of Karta",
        "Aadhaar of Karta and coparceners",
        "HUF deed on stamp paper",
        "Bank account proof",
      ]),
      // New addition — Sole Proprietorship. (Trust also lives in this subcategory,
      // still admin-managed and intentionally not seeded here.)
      min("sole-proprietorship", "Sole Proprietorship", "Proprietorship", "—", "Store"),
      // Society: the base row + three type fallbacks, then one row per (type ×
      // state) combination. See the SOCIETY_* definitions above for the rationale.
      ...SOCIETY_TYPE_ROWS,
      ...SOCIETY_COMBOS,
    ],
  },
  {
    category: "Tax Registration",
    subcategory: "Tax Registrations",
    services: [
      svc("gst", "GST Registration", "GST", "GSTN", "REG-01", "Wallet", [
        "PAN of business",
        "Aadhaar of proprietor / partners",
        "Business address proof",
        "Rent agreement + NOC",
        "Bank statement or cancelled cheque",
        "Board resolution (companies)",
        "Digital Signature (DSC)",
      ]),
      {
        ...svc("gst-regular", "Normal / Regular Taxpayer", "Regular", "GSTN", "REG-01", "Wallet", [
          "PAN of business",
          "Aadhaar of proprietor / partners / directors",
          "Passport-size photograph of authorised signatory",
          "Proof of principal place of business",
          "Bank account proof",
          "Authorisation letter / board resolution",
          "Proof of business constitution",
        ]),
        active: false,
        description: "Standard GST registration for businesses crossing the turnover threshold (₹40L goods / ₹20L services). Allows collecting tax and claiming Input Tax Credit.",
        whoCanApply: "• Turnover crossing ₹40 lakh (goods) or ₹20 lakh (services).\n• Anyone making regular inter-state or intra-state taxable supplies.",
        wizardRules: JSON.stringify({ tags: ["Most common", "Full ITC"], popular: true }),
      },
      {
        ...svc("gst-composition", "Composition Scheme", "Composition", "GSTN", "REG-01 · CMP-02", "Wallet", [
          "PAN of business",
          "Aadhaar of proprietor / partners",
          "Proof of principal place of business",
          "Bank account proof",
          "Form CMP-02 opt-in declaration",
        ]),
        active: false,
        description: "A flat-rate scheme for small taxpayers (turnover ≤ ₹1.5 crore) with simplified quarterly compliance.",
        whoCanApply: "• Turnover up to ₹1.5 crore (₹75 lakh for special states).\n• Pay tax at flat rate (cannot collect GST or claim ITC).",
        wizardRules: JSON.stringify({ tags: ["Flat rate", "Turnover ≤ ₹1.5 Cr"] }),
      },
      {
        ...svc("gst-voluntary", "Voluntary Registration", "Voluntary", "GSTN", "REG-01", "Wallet", [
          "PAN of business",
          "Aadhaar of proprietor / partners / directors",
          "Proof of principal place of business",
          "Bank account proof",
          "Proof of business constitution",
        ]),
        active: false,
        description: "Opt-in registration for businesses below the turnover threshold to claim ITC and sell B2B or inter-state.",
        whoCanApply: "• Businesses below threshold wanting Input Tax Credit.\n• Suppliers needing a GSTIN for B2B sales or e-commerce.",
        wizardRules: JSON.stringify({ tags: ["Optional", "Claim ITC"] }),
      },
      {
        ...svc("gst-casual", "Casual Taxable Person (CTP)", "CTP", "GSTN", "REG-01", "Wallet", [
          "PAN of business",
          "Aadhaar of signatory",
          "Proof of temporary place of business",
          "Estimated turnover & tax liability details",
          "Advance tax deposit challan",
        ]),
        active: false,
        description: "For occasional supplies in a state where you have no fixed place of business (e.g. trade fair, exhibition).",
        whoCanApply: "• Occasional suppliers at exhibitions or seasonal stalls.\n• Advance tax deposit required for registration period (up to 90 days).",
        wizardRules: JSON.stringify({ tags: ["Occasional", "Advance tax"] }),
      },
      {
        ...svc("gst-nrtp", "Non-Resident Taxable Person (NRTP)", "NRTP", "GSTN", "REG-09", "Globe", [
          "Non-resident passport / tax ID",
          "Authorised signatory PAN (Indian resident)",
          "Advance tax deposit challan",
          "Proof of business outside India",
        ]),
        active: false,
        description: "For foreign residents occasionally supplying goods or services in India without a fixed office.",
        whoCanApply: "• Foreign residents supplying goods or services in India.\n• Apply on Form REG-09 with advance tax deposit.",
        wizardRules: JSON.stringify({ tags: ["Foreign", "Advance tax"] }),
      },
      {
        ...svc("gst-isd", "Input Service Distributor (ISD)", "ISD", "GSTN", "REG-01", "Share2", [
          "PAN of company / HO",
          "Existing GSTIN of head office",
          "List of branch GSTINs to receive credit",
          "Authorisation letter",
        ]),
        active: false,
        description: "For head offices distributing input tax credit for common input services to branch units.",
        whoCanApply: "• Multi-unit businesses distributing common input service tax credits.",
        wizardRules: JSON.stringify({ tags: ["Credit distribution"] }),
      },
      {
        ...svc("gst-ecom", "E-Commerce Operator", "E-Commerce", "GSTN", "REG-01", "ShoppingCart", [
          "PAN of business",
          "Proof of digital platform ownership / agreement",
          "Aadhaar of directors / partners",
          "Bank account proof",
        ]),
        active: false,
        description: "Mandatory GST registration for e-commerce platform operators facilitating third-party supplies.",
        whoCanApply: "• Platform operators facilitating supplies between sellers and buyers.\n• Required to collect TCS under GST.",
        wizardRules: JSON.stringify({ tags: ["TCS", "Mandatory"] }),
      },
      {
        ...svc("gst-tds_tcs", "TDS / TCS Deductor", "TDS / TCS", "GSTN", "REG-07", "FileText", [
          "TAN of government department / deductor",
          "PAN of authorised officer",
          "Office address proof",
        ]),
        active: false,
        description: "For notified government bodies, local authorities, or specified deductors deducting TDS under GST.",
        whoCanApply: "• Government departments & notified deductors deducting GST TDS on Form REG-07.",
        wizardRules: JSON.stringify({ tags: ["Deduct / Collect", "TAN"] }),
      },
      {
        ...svc("gst-other", "Special / Other GST Registration", "Special / SEZ", "GSTN", "REG-01", "Shield", [
          "PAN of entity",
          "SEZ approval letter / developer certificate",
          "Address proof",
        ]),
        active: false,
        description: "For SEZ units, developers, OIDAR service providers, and UN/embassy Unique Identity Number (UIN) applicants.",
        whoCanApply: "• SEZ developers, SEZ units, OIDAR providers, and foreign embassy UIN applicants.",
        wizardRules: JSON.stringify({ tags: ["SEZ / Special"] }),
      },
      svc("pan-tan", "PAN & TAN", "PAN / TAN", "Income Tax / NSDL", "49A / 49B", "IdCard", [
        "Identity proof (Aadhaar / Passport)",
        "Address proof",
        "Date of birth proof",
        "Passport-size photograph",
        "Business registration proof (for TAN)",
      ]),
      // MSME & IEC live in "Other Business Registrations" per the client document.
      svc("dpiit", "Startup India / DPIIT", "DPIIT", "DPIIT", "Recognition", "Rocket", [
        "Certificate of incorporation",
        "PAN of entity",
        "Brief write-up on innovation",
        "Website / pitch deck",
        "Details of directors / founders",
      ]),
      // New additions — in document order.
      min("lut", "LUT (Letter of Undertaking)", "LUT", "GSTN", "Wallet"),
      min("lower-tax-deduction", "Lower Tax Deduction Certificate", "Lower TDS", "Income Tax", "Wallet"),
      min("80iac", "80IAC Tax Exemption (Startups)", "80IAC", "CBDT / DPIIT", "Rocket"),
      min("12a", "12A Registration", "12A", "Income Tax", "HeartPulse"),
      min("80g", "80G Registration", "80G", "Income Tax", "HeartPulse"),
      min("icegate", "ICEGATE Registration", "ICEGATE", "CBIC", "Globe"),
      min("form-10a", "Form 10A Registration", "Form 10A", "Income Tax", "Wallet"),
      min("non-deduction-declaration", "Declaration for Non-Deduction of Tax", "Non-Deduction", "Income Tax", "Wallet"),
      min("rcmc", "RCMC (Registration-cum-Membership Certificate)", "RCMC", "DGFT / EPC", "Globe"),
    ],
  },
  {
    category: "Labour & Municipal License",
    subcategory: "Labour Registrations",
    services: [
      svc("labour-licence", "Labour Licence", "Labour Licence", "State Labour Dept.", "CLRA", "HardHat", [
        "Certificate of incorporation",
        "PAN of establishment",
        "Address proof",
        "List of workers / contract labour",
        "Consent of principal employer",
      ]),
      svc("epf", "EPF Registration", "EPF", "EPFO", "Form-1", "Coins", [
        "PAN of establishment",
        "Certificate of incorporation",
        "Address proof of premises",
        "List of employees with salary",
        "Bank account details",
        "Digital Signature (DSC)",
      ]),
      svc("esi", "ESI Registration", "ESI", "ESIC", "Form-01", "HeartPulse", [
        "PAN of establishment",
        "Registration certificate under Shops & Estd. / Factories Act",
        "Address proof",
        "List of employees & wages",
        "Bank details",
        "Cancelled cheque",
      ]),
      // New addition.
      min("professional-tax", "Professional Tax Registration", "Professional Tax", "State Commercial Tax Dept.", "Coins"),
    ],
  },
  {
    // Same category as Labour above — the sidebar groups by category, so these
    // render together as the document's "Labour & Municipal License".
    category: "Labour & Municipal License",
    subcategory: "Municipal Licences",
    services: [
      svc("trade-licence", "Trade Licence", "Trade", "Municipal Corp.", "Form-1", "FileBadge2", [
        "PAN & Aadhaar of applicant",
        "Property tax receipt / ownership proof",
        "NOC from landlord",
        "Layout plan of premises",
        "Photographs of the premises",
      ]),
    ],
  },
  {
    // The document lists FSSAI / Factory / Drug at the top of Industry Specific,
    // with no separate "Industry Licences" group — so they live here.
    category: "Industry Specific Registrations",
    subcategory: "Licences",
    services: [
      svc("fssai", "FSSAI Licence", "FSSAI", "FSSAI", "Form A/B", "Leaf", [
        "PAN & Aadhaar of applicant",
        "Business address proof",
        "List of food products",
        "Layout of processing unit",
        "Water test report",
        "Food safety management plan",
      ]),
      svc("drug-licence", "Drug Licence", "Drug", "State FDA", "Form-19", "Pill", [
        "Site plan & key plan of premises",
        "Qualification certificates of pharmacist",
        "Affidavit of non-conviction",
        "Ownership / rent proof",
        "Cold storage details (if applicable)",
      ]),
      // New addition.
      min("factory-licence", "Factory Licence", "Factory", "Dir. of Industrial Safety & Health", "Factory"),
    ],
  },
  {
    category: "Intellectual Property",
    subcategory: "Intellectual Property",
    services: [
      svc("trademark", "Trademark", "Trademark", "IP India", "TM-A", "Award", [
        "Logo / wordmark in JPG/PNG",
        "Trademark class & description",
        "Applicant identity proof",
        "Business registration proof",
        "User affidavit (if prior use)",
        "Power of Attorney (TM-48)",
      ]),
      svc("patent", "Patent", "Patent", "IP India", "Form-1", "FileBadge2", [
        "Detailed invention description",
        "Drawings / diagrams",
        "Applicant details",
        "Priority document (if any)",
        "Form-1, 2, 3, 5 drafts",
        "Assignment deed (if applicable)",
      ]),
      svc("copyright", "Copyright", "Copyright", "Copyright Office", "Form-XIV", "Copyright", [
        "Copy of the work being registered",
        "Applicant identity proof",
        "NOC from author (if different)",
        "Power of Attorney",
        "Publisher details (if published)",
      ]),
      svc("design", "Design Registration", "Design", "IP India", "Form-1", "Palette", [
        "Representation of the design (4 views)",
        "Novelty statement",
        "Applicant identity proof",
        "Power of Attorney",
        "Class of article (Locarno)",
      ]),
      // New addition.
      min("layout-design", "Layout Design (Semiconductor)", "Layout Design", "SICLDR", "Palette"),
    ],
  },

  // =========================================================================
  // New categories from "New registration additions" — minimal rows, in the
  // order given by the document. Fees are 0 and checklists empty pending Admin.
  // =========================================================================
  {
    category: "Business Conversion",
    subcategory: "Business Conversions",
    services: [
      min("conversion-pvt-to-public", "Private to Public Limited Company", "Pvt → Public", "MCA", "Building2"),
      min("conversion-llp-to-pvt", "LLP to Private Limited Company", "LLP → Pvt Ltd", "MCA", "Building2"),
      min("conversion-opc-to-pvt", "OPC to Private Limited Company", "OPC → Pvt Ltd", "MCA", "Building2"),
      min("conversion-proprietorship-to-pvt", "Proprietorship to Private Limited Company", "Prop. → Pvt Ltd", "MCA", "Building2"),
      min("conversion-partnership-to-pvt", "Partnership to Private Limited Company", "Partnership → Pvt Ltd", "MCA", "Building2"),
      min("conversion-pvt-to-opc", "Private Limited to OPC", "Pvt Ltd → OPC", "MCA", "Building2"),
      min("conversion-partnership-to-llp", "Partnership to LLP", "Partnership → LLP", "MCA", "Handshake"),
      min("conversion-public-to-pvt", "Public to Private Limited Company", "Public → Pvt Ltd", "MCA", "Building2"),
    ],
  },
  {
    category: "Business Closure",
    subcategory: "Business Closures",
    services: [
      min("closure-pvt", "Closure of Private Limited Company", "Closure Pvt Ltd", "MCA", "Building2"),
      min("closure-llp", "Closure of LLP", "Closure LLP", "MCA", "Handshake"),
      min("closure-opc", "Closure of OPC", "Closure OPC", "MCA", "Building2"),
      min("closure-proprietorship", "Closure of Sole Proprietorship", "Closure Proprietorship", "—", "Store"),
      min("closure-partnership", "Closure of Partnership Firm", "Closure Partnership", "Registrar of Firms", "Users"),
      min("closure-nidhi", "Closure of Nidhi Company", "Closure Nidhi", "MCA", "Building2"),
      min("closure-sec8", "Closure of Section 8 Company", "Closure Section 8", "MCA", "Building2"),
      min("closure-public", "Closure of Public Limited Company", "Closure Public Ltd", "MCA", "Building2"),
      min("closure-trust", "Dissolution of Trust", "Dissolution Trust", "Charity Commissioner", "Shield"),
      min("closure-society", "Dissolution of Society", "Dissolution Society", "Registrar of Societies", "Users"),
    ],
  },
  {
    category: "Other Business Registrations",
    subcategory: "Other Business Registrations",
    services: [
      svc("msme", "MSME / Udyam", "MSME", "MoMSME", "Udyam", "Factory", [
        "Aadhaar of proprietor / signatory",
        "PAN of business",
        "Bank account details",
        "Business address proof",
        "Investment & turnover details",
      ]),
      svc("iec", "IEC Import-Export", "IEC", "DGFT", "ANF-2A", "Globe", [
        "PAN of applicant / entity",
        "Aadhaar / voter ID of proprietor",
        "Business address proof",
        "Cancelled cheque of current account",
        "Digital photograph",
      ]),
      min("din", "Director Identification Number (DIN)", "DIN", "MCA", "IdCard"),
      min("lei", "Legal Entity Identifier (LEI)", "LEI", "LEIL", "IdCard"),
      min("ngo-darpan", "NGO Darpan (NPO)", "NGO Darpan", "NITI Aayog", "Users"),
      min("rera", "RERA Registration", "RERA", "State RERA", "HomeIcon"),
      min("dsc", "Digital Signature Certificate", "DSC", "Certifying Authority (CCA)", "FileBadge2"),
      min("iso", "ISO Certification", "ISO", "Certification Body", "Award"),
    ],
  },
  {
    category: "Industry Specific Registrations",
    subcategory: "Agriculture, Seeds, Fertilisers & Pesticides",
    services: [
      // Department entry (active, listed in the sidebar); its sub-heads below are
      // inactive and shown inside its picker via the family endpoint.
      min("ind-agri", "Agriculture, Seeds, Fertilisers & Pesticides", "Agriculture, Seeds, Fertilisers & Pesticides", "Agriculture, Seeds, Fertilisers & Pesticides", "FileBadge2"),
      min("ind-multi-state-coop", "Registration of Multi-State Co-operative Society", "Multi-State Co-op", "Central Registrar of Co-operative Societies", "Leaf"),
    ],
  },
  {
    category: "Industry Specific Registrations",
    subcategory: "Department of Agriculture, Cooperation and Farmers Welfare",
    services: [
      min("ind-dept-agriculture", "Department of Agriculture, Cooperation and Farmers Welfare", "Department of Agriculture, Cooperation and Farmers Welfare", "Department of Agriculture, Cooperation and Farmers Welfare", "FileBadge2"),
      min("ind-fertiliser-dealer", "Registration for Sale of Fertilisers as an Industrial Dealer", "Fertiliser Dealer", "Dept. of Agriculture, Cooperation & Farmers Welfare", "Leaf"),
    ],
  },
  {
    category: "Industry Specific Registrations",
    subcategory: "Department of Commerce",
    services: [
      min("ind-dept-commerce", "Department of Commerce", "Department of Commerce", "Department of Commerce", "FileBadge2"),
      min("ind-dta-sale", "Application for DTA Sale / Advance DTA Sale Permission", "DTA Sale", "Department of Commerce", "Globe"),
      min("ind-eou-exit", "Application for Exit from EOU Scheme (ANF-6D)", "EOU Exit", "Department of Commerce", "Globe"),
      min("ind-eou-lop-extension", "Extension of Letter of Permission (LOP) for EOU", "EOU LOP Extension", "Department of Commerce", "Globe"),
      min("ind-eou-setup", "Setting up of New Export Oriented Unit (EOU)", "New EOU", "Department of Commerce", "Globe"),
      min("ind-eou-exit-undertaking", "Legal Undertaking for Exit of a Unit from EOU", "EOU Exit Undertaking", "Department of Commerce", "Globe"),
      min("ind-eou-export-house", "Export House Certificate — EOU", "EOU Export House", "Department of Commerce", "Globe"),
      min("ind-eou-apr", "Annual Progress Report (APR) for Working EOU Units", "EOU APR", "Department of Commerce", "Globe"),
      min("ind-eou-qpr", "Quarterly Progress Report (QPR) for Working EOU Units", "EOU QPR", "Department of Commerce", "Globe"),
      min("ind-eou-qpr-implementation", "QPR for EOU Units Under Implementation", "EOU QPR (Impl.)", "Department of Commerce", "Globe"),
      min("ind-restricted-import-export", "Import / Export of Restricted Items", "Restricted Import/Export", "Department of Commerce", "Globe"),
      min("ind-idr-eou", "Industrial License — IDR Act (EOU)", "IDR Act — EOU", "Department of Commerce", "Factory"),
      min("ind-idr-sez", "Industrial License — IDR Act (SEZ)", "IDR Act — SEZ", "Department of Commerce", "Factory"),
      min("ind-eou-legal-agreement", "Legal Agreement for EOU / EHTP / STP / BTP", "EOU Legal Agreement", "Department of Commerce", "Globe"),
      min("ind-eou-lop", "Letter of Permission — EOU", "EOU LOP", "Department of Commerce", "Globe"),
      min("ind-investment-advisor", "Registration as Investment Advisor", "Investment Advisor", "Department of Commerce", "Coins"),
      min("ind-investment-funds", "Registration of Investment Funds", "Investment Funds", "Department of Commerce", "Coins"),
      min("ind-sez-unit", "Setting up of SEZ Unit", "SEZ Unit", "Department of Commerce", "Globe"),
      min("ind-sez-codeveloper", "Setting up SEZ (Co-developer)", "SEZ Co-developer", "Department of Commerce", "Globe"),
      min("ind-sez-developer", "Setting up SEZ (Developer)", "SEZ Developer", "Department of Commerce", "Globe"),
      min("ind-sez-clearance", "SEZ Clearance", "SEZ Clearance", "Department of Commerce", "Globe"),
      min("ind-ifldp-vision-doc", "Vision Document Component under STEP Sub-scheme of IFLDP (2021-26)", "IFLDP Vision Doc", "Department of Commerce", "FileBadge2"),
    ],
  },
  {
    category: "Industry Specific Registrations",
    subcategory: "Department of Finance",
    services: [
      min("ind-dept-finance", "Department of Finance", "Department of Finance", "Department of Finance", "FileBadge2"),
      min("ind-fdi", "Foreign Direct Investment (FDI)", "FDI", "Department of Finance", "Coins"),
      min("ind-nbfc", "Registration as Non-Banking Financial Company (NBFC)", "NBFC", "Department of Finance", "Wallet"),
    ],
  },
  {
    category: "Industry Specific Registrations",
    subcategory: "Department of Health and Family Welfare",
    services: [
      min("ind-dept-health", "Department of Health and Family Welfare", "Department of Health and Family Welfare", "Department of Health and Family Welfare", "FileBadge2"),
      min("ind-food-license", "License for Food Business", "Food Business", "Dept. of Health & Family Welfare", "Leaf"),
      min("ind-food-import-license", "License for Importing Food Items, Ingredients & Additives", "Food Import", "Dept. of Health & Family Welfare", "Leaf"),
      min("ind-petty-food", "Registration of Petty Food Business", "Petty Food", "Dept. of Health & Family Welfare", "Leaf"),
    ],
  },
  {
    category: "Industry Specific Registrations",
    subcategory: "Department of School Education and Literacy",
    services: [
      min("ind-dept-education", "Department of School Education and Literacy", "Department of School Education and Literacy", "Department of School Education and Literacy", "FileBadge2"),
      min("ind-cbse-affiliation", "CBSE Affiliation", "CBSE Affiliation", "Dept. of School Education & Literacy", "Award"),
    ],
  },
  {
    category: "Industry Specific Registrations",
    subcategory: "DPIIT",
    services: [
      min("ind-dept-dpiit", "DPIIT", "DPIIT", "DPIIT", "FileBadge2"),
      min("ind-iem-part-a", "Industrial Entrepreneur Memorandum (Part-A)", "IEM Part-A", "DPIIT", "Factory"),
      min("ind-iem-part-b", "Industrial Entrepreneur Memorandum (Part-B)", "IEM Part-B", "DPIIT", "Factory"),
    ],
  },
  {
    category: "Industry Specific Registrations",
    subcategory: "Ministry of Tourism",
    services: [
      min("ind-dept-tourism", "Ministry of Tourism", "Ministry of Tourism", "Ministry of Tourism", "FileBadge2"),
      min("ind-nidhi-plus-fbo", "Food Business Operator Registration on NIDHI+", "NIDHI+ FBO", "Ministry of Tourism", "Store"),
    ],
  },
];

async function findOrCreateCategory(name: string) {
  const [existing] = await db
    .select()
    .from(serviceCategories)
    .where(eq(serviceCategories.name, name))
    .limit(1);
  if (existing) return existing.id;

  const [created] = await db.insert(serviceCategories).values({ name }).returning();
  return created.id;
}

async function findOrCreateSubcategory(categoryId: number, name: string) {
  const rows = await db
    .select()
    .from(serviceSubcategories)
    .where(eq(serviceSubcategories.name, name));
  const existing = rows.find((r) => r.categoryId === categoryId);
  if (existing) return existing.id;

  const [created] = await db
    .insert(serviceSubcategories)
    .values({ categoryId, name })
    .returning();
  return created.id;
}

async function upsertService(subcategoryId: number, s: SeedService) {
  // Names/short titles come from the client document where one is defined for
  // the slug, so both the seed and the catalog read exactly as the document.
  const exactName = EXACT_NAMES[s.slug];
  const values = {
    subcategoryId,
    name: exactName ?? s.name,
    description: s.description ?? null,
    whoCanApply: s.whoCanApply ?? null,
    professionalFee: s.professionalFee.toFixed(2),
    govtFee: s.govtFee.toFixed(2),
    gstPercent: s.gstPercent.toFixed(2),
    active: INACTIVE_SLUGS.has(s.slug) ? false : (s.active ?? true),
    slug: s.slug,
    shortTitle: exactName ?? s.shortTitle,
    authority: s.authority,
    formNo: s.formNo,
    icon: s.icon,
  };

  const [existing] = await db.select().from(services).where(eq(services.slug, s.slug)).limit(1);

  let serviceId: number;
  if (existing) {
    // wizardRules is intentionally left out of `values`, so re-seeding never
    // overwrites rules an admin has edited in the catalog.
    await db.update(services).set(values).where(eq(services.id, existing.id));
    serviceId = existing.id;
  } else {
    // On first insert, seed the company entity-type rules from the shared
    // backend defaults so the values live in the DB (not the frontend).
    const wizardRules = COMPANY_WIZARD_DEFAULTS[s.slug]
      ? JSON.stringify(COMPANY_WIZARD_DEFAULTS[s.slug])
      : null;
    const [created] = await db.insert(services).values({ ...values, wizardRules }).returning();
    serviceId = created.id;
  }

  // Replace the checklist so re-running never duplicates rows.
  await db.delete(documentTypes).where(eq(documentTypes.serviceId, serviceId));
  if (s.documents.length > 0) {
    await db.insert(documentTypes).values(
      s.documents.map((name) => ({ serviceId, name, mandatory: true }))
    );
  }

  return { serviceId, created: !existing };
}

async function main() {
  let created = 0;
  let updated = 0;

  for (const group of CATALOG) {
    const categoryId = await findOrCreateCategory(group.category);
    const subcategoryId = await findOrCreateSubcategory(categoryId, group.subcategory);

    for (const s of group.services) {
      const res = await upsertService(subcategoryId, s);
      if (res.created) created++;
      else updated++;
      console.log(
        `  ${res.created ? "created" : "updated"}  ${s.slug.padEnd(20)} ` +
          `₹${s.professionalFee} + ₹${s.govtFee} + ${s.gstPercent}% GST  ` +
          `(${s.documents.length} docs)${s.active === false ? "  [unlisted variant]" : ""}`
      );
    }
  }

  const unpriced = CATALOG.flatMap((g) => g.services).filter(
    (s) => s.professionalFee === 0 && s.govtFee === 0
  );

  console.log(`\nDone. ${created} created, ${updated} updated.`);
  if (unpriced.length > 0) {
    console.log(
      `\n${unpriced.length} services have no pricing (the client never supplied one):\n  ` +
        unpriced.map((s) => s.slug).join(", ") +
        `\nSet their fees in Admin → Services, or edit this script and re-run.`
    );
  }
}

main()
  .catch((err) => {
    console.error("Catalog seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
