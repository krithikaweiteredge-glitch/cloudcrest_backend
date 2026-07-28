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

type SeedService = {
  slug: string;
  name: string;
  shortTitle: string;
  authority: string;
  formNo: string;
  icon: string;
  description?: string;
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
  formNo: string,
  professional: number,
  mca: number,
  stamp: number,
  dsc: number
): SeedService => ({
  slug,
  name,
  shortTitle,
  authority: "MCA",
  formNo,
  icon: "Building2",
  professionalFee: professional + dsc,
  govtFee: mca + stamp,
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
  formNo: string,
  professional: number,
  mca: number,
  stamp: number
): SeedService => ({
  slug,
  name,
  shortTitle,
  authority: "MCA",
  formNo,
  icon: "Handshake",
  // LLP DSC was a flat ₹1,500 for 2 designated partners.
  professionalFee: professional + 1500,
  govtFee: mca + stamp,
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
  gstPercent: 18,
  documents,
});

const CATALOG: SeedGroup[] = [
  {
    category: "Entity Registration",
    subcategory: "Company Registration",
    services: [
      companyService("company", "Company Registration", "Company", "INC-32", 2499, 1000, 500, 1500),
      companyService("company-pvt", "Private Limited Company", "Private Limited", "INC-32", 2499, 1000, 500, 1500),
      companyService("company-public", "Public Limited Company", "Public Limited", "INC-32", 6499, 2500, 1000, 1500),
      companyService("company-opc", "One Person Company (OPC)", "OPC", "INC-32", 2499, 1000, 500, 1500),
      companyService("company-sec8", "Section 8 Company (Non-Profit)", "Section 8", "INC-12", 4499, 1500, 500, 1500),
      companyService("company-guarantee", "Company Limited by Guarantee", "Guarantee Co.", "INC-32", 3499, 1200, 500, 1500),
      companyService("company-nidhi", "Nidhi Company", "Nidhi", "INC-32 · NDH-4", 8499, 3000, 1000, 1500),
      companyService("company-producer", "Producer Company", "Producer Co.", "INC-32", 6499, 2500, 1000, 1500),
      companyService("company-foreign", "Foreign Company (Branch / Liaison)", "Foreign Co.", "FC-1", 14999, 5000, 2000, 1500),
    ],
  },
  {
    category: "Entity Registration",
    subcategory: "LLP Registration",
    // The LLP wizard has no entity-type step — every application is a standard
    // LLP — so there is a single row here, unlike Company.
    services: [
      llpService("llp", "LLP Registration", "LLP", "FiLLiP", 1999, 500, 500),
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
      svc("trust-society", "Trust & Societies", "Trust / Society", "Charity Commissioner", "Trust Deed / Form A", "Shield", [
        "Trust deed / MoA",
        "PAN & Aadhaar of trustees / members",
        "Address proof of office",
        "Photographs of trustees",
        "Registered office NOC",
      ]),
      svc("huf", "HUF", "HUF", "Income Tax", "HUF Deed", "HomeIcon", [
        "PAN of Karta",
        "Aadhaar of Karta and coparceners",
        "HUF deed on stamp paper",
        "Bank account proof",
      ]),
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
      svc("pan-tan", "PAN & TAN", "PAN / TAN", "Income Tax / NSDL", "49A / 49B", "IdCard", [
        "Identity proof (Aadhaar / Passport)",
        "Address proof",
        "Date of birth proof",
        "Passport-size photograph",
        "Business registration proof (for TAN)",
      ]),
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
      svc("dpiit", "Startup India / DPIIT", "DPIIT", "DPIIT", "Recognition", "Rocket", [
        "Certificate of incorporation",
        "PAN of entity",
        "Brief write-up on innovation",
        "Website / pitch deck",
        "Details of directors / founders",
      ]),
    ],
  },
  {
    category: "Labour Law",
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
    ],
  },
  {
    category: "Municipal Licences",
    subcategory: "Municipal Licences",
    services: [
      svc("shop-establishment", "Shop & Establishment", "Shop & Estd.", "Municipal Corp.", "Form-A", "Store", [
        "PAN & Aadhaar of proprietor",
        "Address proof of shop",
        "Rent agreement / ownership proof",
        "Photograph of shop front",
        "List of employees",
      ]),
      svc("trade-licence", "Trade Licence", "Trade", "Municipal Corp.", "Form-1", "FileBadge2", [
        "PAN & Aadhaar of applicant",
        "Property tax receipt / ownership proof",
        "NOC from landlord",
        "Layout plan of premises",
        "Photographs of the premises",
      ]),
      svc("fire-noc", "Fire NOC", "Fire NOC", "Fire Dept.", "Fire-1", "FlameKindling", [
        "Building plan approved by authority",
        "Ownership / lease deed",
        "Occupancy certificate",
        "Details of fire safety measures",
        "Photographs of installations",
      ]),
    ],
  },
  {
    category: "Industry Licences",
    subcategory: "Industry Licences",
    services: [
      svc("fssai", "FSSAI Licence", "FSSAI", "FSSAI", "Form A/B", "Leaf", [
        "PAN & Aadhaar of applicant",
        "Business address proof",
        "List of food products",
        "Layout of processing unit",
        "Water test report",
        "Food safety management plan",
      ]),
      svc("pollution-ncb", "Pollution Control NOC", "PCB Consent", "State PCB", "Consent", "ShieldCheck", [
        "Incorporation certificate",
        "Site plan & manufacturing process",
        "Consent application form",
        "Land documents",
        "List of hazardous materials",
      ]),
      svc("drug-licence", "Drug Licence", "Drug", "State FDA", "Form-19", "Pill", [
        "Site plan & key plan of premises",
        "Qualification certificates of pharmacist",
        "Affidavit of non-conviction",
        "Ownership / rent proof",
        "Cold storage details (if applicable)",
      ]),
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
  const values = {
    subcategoryId,
    name: s.name,
    description: s.description ?? null,
    professionalFee: s.professionalFee.toFixed(2),
    govtFee: s.govtFee.toFixed(2),
    gstPercent: s.gstPercent.toFixed(2),
    active: s.active ?? true,
    slug: s.slug,
    shortTitle: s.shortTitle,
    authority: s.authority,
    formNo: s.formNo,
    icon: s.icon,
  };

  const [existing] = await db.select().from(services).where(eq(services.slug, s.slug)).limit(1);

  let serviceId: number;
  if (existing) {
    await db.update(services).set(values).where(eq(services.id, existing.id));
    serviceId = existing.id;
  } else {
    const [created] = await db.insert(services).values(values).returning();
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
