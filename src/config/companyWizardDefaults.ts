// Seed / backfill defaults for the Company Registration entity types.
//
// These populate each company variant's `services.wizardRules` column so the
// values live in the DATABASE (admin-editable via Admin → Services), not
// hardcoded in the frontend. The frontend only carries a neutral generic
// fallback; the real per-type suffix, min directors/shareholders, nominee flag,
// card tags and "popular" badge all come from here at seed time and from the DB
// (or admin edits) thereafter.
//
// Keyed by service slug. Shape matches the frontend WizardRules JSON exactly.
export type CompanyWizardRules = {
  suffix: string;
  minDirectors: number;
  minShareholders: number;
  requiresNominee: boolean;
  tags: string[];
  popular: boolean;
};

export const COMPANY_WIZARD_DEFAULTS: Record<string, CompanyWizardRules> = {
  "company-pvt": {
    suffix: "Private Limited",
    minDirectors: 2,
    minShareholders: 2,
    requiresNominee: false,
    tags: ["FDI Friendly", "Min 2 Dir"],
    popular: true,
  },
  "company-public": {
    suffix: "Limited",
    minDirectors: 3,
    minShareholders: 7,
    requiresNominee: false,
    tags: ["Min 3 Dir · 7 Sh"],
    popular: false,
  },
  "company-opc": {
    suffix: "(OPC) Private Limited",
    minDirectors: 1,
    minShareholders: 1,
    requiresNominee: true,
    tags: ["Single Member"],
    popular: false,
  },
  "company-sec8": {
    suffix: "Foundation / Trust / Association",
    minDirectors: 2,
    minShareholders: 2,
    requiresNominee: false,
    tags: ["Tax Exempt"],
    popular: false,
  },
  "company-guarantee": {
    // Surfaced as "Unlimited Company"; applicant picks either legal ending.
    suffix: "Private Limited / Limited",
    minDirectors: 2,
    minShareholders: 2,
    requiresNominee: false,
    tags: [],
    popular: false,
  },
  "company-nidhi": {
    suffix: "Nidhi Limited",
    minDirectors: 2,
    minShareholders: 2,
    requiresNominee: false,
    tags: ["Mutual Benefit"],
    popular: false,
  },
  "company-producer": {
    suffix: "Producer Company Limited",
    minDirectors: 2,
    minShareholders: 2,
    requiresNominee: false,
    tags: ["Agri / Producer"],
    popular: false,
  },
};
