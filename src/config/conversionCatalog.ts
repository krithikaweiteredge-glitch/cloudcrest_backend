/**
 * Catalog content for the eight Business Conversion services.
 *
 * Two client sources:
 *
 *   - Content.docx — "About this approval", "Who can Apply" and "Acts and
 *     Rules" for four of the conversions (Pvt → Public, LLP → Pvt, OPC → Pvt,
 *     Proprietorship → Pvt). The other four have no copy in that document.
 *   - business-conversions-portal.html — the conversion stepper. Supplies each
 *     type's required-document list, its eligibility rules, the notes shown on
 *     individual steps, the statutory minimums, and the forms named in its fee
 *     step.
 *
 * None of this is rendered from code. `scripts/backfill-conversions.ts` writes
 * it into the catalog rows (`services` + `document_types`), where the admin
 * edits it like any other service, and the frontend reads it back from there:
 * the service page shows About / Who can Apply / Documents / Acts, the
 * conversion stepper reads `wizardRules`, and the upload panel at submission
 * reads the document checklist.
 *
 * Fees: only the amounts the HTML's fee step actually states are carried — the
 * newspaper-advertisement cost on three conversions — as fee lines. It gives no
 * professional fee and no figure for the slab-based government fee, so those
 * are left for the admin to add to each row's fee lines.
 */

/** Stored as JSON in `services.wizard_rules`; read by the frontend's resolveConversionRules. */
export type ConversionRules = {
  /** One rule per line, shown as the eligibility banner above the stepper form. */
  eligibility: string;
  minShareholders: number | null;
  maxShareholders: number | null;
  minDirectors: number | null;
  minPartners: number | null;
  notes: {
    name: string;
    members: string;
    capital: string;
  };
};

export type ConversionCatalogEntry = {
  /** Forms named in the HTML's fee step. */
  formNo: string;
  /** Content.docx "About this approval". Empty when the docx has no copy. */
  description: string;
  /** Content.docx "Who can Apply"; the HTML's rules where the docx has none. */
  whoCanApply: string;
  /** Content.docx "Acts and Rules". Empty when the docx has no copy. */
  actsRules: string;
  /** The HTML's "Required Documents" list for this type. */
  documents: string[];
  /** Fee rows the HTML's fee step gives an amount for. */
  feeLines?: { label: string; amount: number }[];
  rules: ConversionRules;
};

const bullets = (...items: string[]) => items.map((i) => `• ${i}`).join("\n");
const lines = (...items: string[]) => items.join("\n");

const NO_NOTES = { name: "", members: "", capital: "" };

export const CONVERSION_CATALOG: Record<string, ConversionCatalogEntry> = {
  // -------------------------------------------------------------------------
  // Private Limited → Public Limited. docx §1 + HTML `pvt_public`.
  // -------------------------------------------------------------------------
  "conversion-pvt-to-public": {
    formNo: "MGT-14 + INC-27",
    description:
      "Conversion of a Private Limited Company into a Public Limited Company is carried out by altering the Articles of Association and passing a Special Resolution under the Companies Act, 2013. The conversion is completed by filing the prescribed forms with the Registrar of Companies (ROC).",
    whoCanApply: bullets(
      "Any Private Limited Company registered under the Companies Act, 2013 can apply for conversion into a Public Limited Company, subject to applicable legal requirements.",
      "The company should have at least 7 members and 3 directors as applicable to a public company.",
      "The company must comply with the requirements for alteration of its Articles and conversion.",
    ),
    actsRules: bullets(
      "Companies Act, 2013 – Sections 14 and 18",
      "Companies (Incorporation) Rules, 2014 – Rule 33",
      "Companies (Management and Administration) Rules, 2014",
      "Applicable MCA rules, forms and notifications",
    ),
    documents: [
      "Board Resolution approving conversion and altered Articles of Association",
      "Special Resolution (certified copy, passed at EGM) altering AOA to remove private company restrictions",
      "Notice and Explanatory Statement of the General Meeting",
      "Altered Memorandum of Association (MOA), if applicable",
      "Altered Articles of Association (AOA)",
      "List of Members (minimum 7) and List of Directors (minimum 3)",
      "Consent of new members/directors being admitted or appointed, if any",
      "Copy of PAN of the Company",
      "Certificate of Incorporation",
      "Latest audited financial statements",
      "Declaration of compliance by a Director/CS/CA in practice",
      "Copy of Form MGT-14 acknowledgement (filed within 30 days of the Special Resolution)",
      "Form INC-27 – Application for conversion, filed with the ROC",
    ],
    rules: {
      eligibility: lines(
        "Minimum 7 Members and Minimum 3 Directors required",
        "Special Resolution required to alter the Articles of Association (removing private company restrictions)",
        "No Regional Director approval required",
        "No minimum paid-up capital threshold applies",
      ),
      minShareholders: 7,
      maxShareholders: null,
      minDirectors: 3,
      minPartners: null,
      notes: {
        name: "Post name alteration, the altered MOA/AOA must be filed with Form MGT-14 and Form INC-27 with the ROC.",
        members:
          "Minimum 7 Members and Minimum 3 Directors required for a Public Company · Existing members/directors below threshold must be increased before conversion.",
        capital: "",
      },
    },
  },

  // -------------------------------------------------------------------------
  // LLP → Private Limited. docx §2 + HTML `llp_pvt`.
  // -------------------------------------------------------------------------
  "conversion-llp-to-pvt": {
    formNo: "URC-1 + SPICe+",
    feeLines: [{ label: "Newspaper Advertisement Cost", amount: 7500 }],
    description:
      "Conversion of an LLP into a Private Limited Company is a process through which an eligible LLP is registered as a company under the Companies Act, 2013. The conversion is completed by filing the prescribed forms and documents with the Registrar of Companies (ROC).",
    whoCanApply: bullets(
      "Any eligible LLP registered under the Limited Liability Partnership Act, 2008 can apply, subject to applicable legal requirements.",
      "All partners of the LLP should comply with the requirements for conversion.",
      "The proposed company must meet the requirements applicable to a Private Limited Company.",
    ),
    actsRules: bullets(
      "Companies Act, 2013",
      "Limited Liability Partnership Act, 2008",
      "Companies (Authorised to Register) Rules, 2014",
      "Companies (Incorporation) Rules, 2014",
      "Applicable MCA rules, forms and notifications",
    ),
    documents: [
      "Written consent of ALL partners for conversion (unanimous)",
      "Statement of Assets & Liabilities of the LLP certified by a CA in practice (not older than 6 days before Form URC-1 filing)",
      "Certified copy of the LLP Agreement and all supplementary agreements",
      "Copy of Newspaper Advertisement (Form URC-2, English + vernacular)",
      "List of all partners with names, addresses, and DIN/DPIN",
      "List of proposed first directors with DIN, PAN, address, and consent to act as director (DIR-2)",
      "NOC from secured creditors of the LLP, if any",
      "Latest Income Tax Return acknowledgement of the LLP",
      "Copy of LLP Incorporation Certificate",
      "Proposed MOA and AOA of the company",
      "Form URC-1 with statement of particulars",
      "Certificate from a CA/CS/CWA certifying compliance with Section 366 and the Third Schedule",
    ],
    rules: {
      eligibility: lines(
        "Minimum 2 Partners/Directors required",
        "Unanimous written consent of ALL partners mandatory",
        "Mandatory newspaper advertisement (Form URC-2, 21-day objection window) before filing",
        "The LLP stands dissolved upon conversion",
      ),
      minShareholders: 2,
      maxShareholders: null,
      minDirectors: 2,
      minPartners: null,
      notes: {
        name: "After name approval (RUN/Part A of SPICe+), a public notice in Form URC-2 must be published in one English and one vernacular newspaper. A 21-day objection window applies before Form URC-1 can be filed.",
        members: "Minimum 2 Shareholders and Minimum 2 Directors required for a Private Limited Company.",
        capital: "",
      },
    },
  },

  // -------------------------------------------------------------------------
  // OPC → Private Limited. docx §3 + HTML `opc_pvt`.
  // -------------------------------------------------------------------------
  "conversion-opc-to-pvt": {
    formNo: "INC-6 + MGT-14",
    description:
      "Conversion of a One Person Company (OPC) into a Private Limited Company is carried out by complying with the applicable provisions of the Companies Act, 2013. The conversion involves meeting the requirements of a Private Limited Company and filing the prescribed forms with the Registrar of Companies (ROC).",
    whoCanApply: bullets(
      "Any eligible OPC registered under the Companies Act, 2013 can apply for conversion.",
      "The company should meet the minimum requirements applicable to a Private Limited Company.",
      "The required increase in members and directors should be completed as applicable.",
    ),
    actsRules: bullets(
      "Companies Act, 2013 – Sections 18 and applicable provisions",
      "Companies (Incorporation) Rules, 2014",
      "Companies (Management and Administration) Rules, 2014",
      "Applicable MCA rules, forms and notifications",
    ),
    documents: [
      "Board Resolution approving conversion and alteration of MOA/AOA",
      "Special Resolution (certified copy) passed by the sole member approving conversion",
      "Altered MOA & AOA (removing OPC and nominee clauses)",
      "List of Proposed Members and Directors (minimum 2 each)",
      "Consent of new member(s) and director(s) being admitted/appointed",
      "NOC from creditors, or self-declaration confirming no outstanding creditors",
      "Latest audited financial statements",
      "Copy of PAN and Certificate of Incorporation of the Company",
      "Copy of Form MGT-14 acknowledgement (filed within 30 days of the resolution)",
      "Form INC-6 – Application for conversion (filed within 30 days of the voluntary conversion resolution)",
      "Declaration of compliance certified by a CA/CS/CMA in practice",
    ],
    rules: {
      eligibility: lines(
        "Minimum 2 Members and Minimum 2 Directors required post-conversion",
        "Voluntary conversion permitted at any time (the earlier 2-year lock-in and paid-up capital/turnover thresholds were removed w.e.f. the 2021 amendment)",
        "Special Resolution required",
      ),
      minShareholders: 2,
      maxShareholders: null,
      minDirectors: 2,
      minPartners: null,
      notes: {
        name: "",
        members:
          "Minimum 2 Members and Minimum 2 Directors required post-conversion · Nominee and OPC-specific clauses to be removed from the MOA.",
        capital: "",
      },
    },
  },

  // -------------------------------------------------------------------------
  // Proprietorship → Private Limited. docx §4 + HTML `prop_pvt`.
  // -------------------------------------------------------------------------
  "conversion-proprietorship-to-pvt": {
    formNo: "SPICe+",
    description:
      "Conversion of a Proprietorship Business into a Private Limited Company is generally carried out by incorporating a new company and transferring the business, assets and liabilities of the proprietorship to the company, subject to applicable tax and legal requirements.",
    whoCanApply: bullets(
      "Any individual carrying on business as a sole proprietorship can opt for conversion.",
      "The proposed company should comply with the requirements applicable to a Private Limited Company.",
      "The proprietor and proposed shareholders/directors should meet the applicable legal requirements.",
    ),
    actsRules: bullets(
      "Companies Act, 2013",
      "Companies (Incorporation) Rules, 2014",
      "Income-tax Act, 1961 – applicable provisions relating to transfer/conversion",
      "Applicable MCA rules, forms and notifications",
    ),
    documents: [
      "Proprietor's PAN",
      "Proof of business address / registered office of the proposed company",
      "Proprietorship's business registration documents, if any (Udyam, Shop & Establishment, GST certificate)",
      "Latest financial statements of the proprietorship (Balance Sheet, P&L)",
      "Business Transfer Agreement / Slump Sale Agreement between the proprietor and the company",
      "MOA containing the object clause for takeover of the proprietorship business",
      "Details of assets and liabilities being transferred",
      "Bank account details of the proprietorship (for closure) and the proposed company (for opening)",
      "DIN and DSC of proposed directors",
      "Consent of proposed directors and shareholders (DIR-2)",
      "GST registration cancellation of the proprietorship (Form GST REG-16) and fresh GST registration for the company",
      "Certificate of Incorporation of the company",
    ],
    rules: {
      eligibility: lines(
        "No statutory ‘conversion’ route exists – a new Private Limited Company is incorporated and the proprietorship’s business is transferred to it under a Business Transfer/Slump Sale Agreement",
        "Minimum 2 Shareholders and 2 Directors required",
        "Proprietor should retain at least 50% voting rights for 5 years to claim capital gains exemption under Section 47(xiv), Income-tax Act, 1961",
      ),
      minShareholders: null,
      maxShareholders: null,
      minDirectors: null,
      minPartners: null,
      notes: {
        name: "The MOA of the proposed company must include an object clause explicitly stating the intention to take over the running business of the proprietorship.",
        members: "",
        capital: "",
      },
    },
  },

  // -------------------------------------------------------------------------
  // Private Limited → OPC. HTML `pvt_opc` only — no docx copy.
  // -------------------------------------------------------------------------
  "conversion-pvt-to-opc": {
    formNo: "INC-6",
    description: "",
    whoCanApply: bullets(
      "Company must have exactly 1 member at the time of conversion",
      "Member must be an Indian citizen resident in India",
      "No cap on paid-up capital or turnover",
    ),
    actsRules: "",
    documents: [
      "Board Resolution approving conversion",
      "Special Resolution (certified copy, passed at EGM)",
      "List of Members and List of Creditors",
      "NOC from all secured creditors (or declaration of no secured debt)",
      "Latest audited financial statements",
      "Form INC-3 – Nominee’s written consent",
      "PAN & Identification Proof of the sole Member and Nominee",
      "Altered MOA & AOA (removing multi-member clauses, adding nominee clause)",
      "Copy of PAN of the Company",
      "Declaration of compliance by a Director/CS/CA in practice",
    ],
    rules: {
      eligibility: lines(
        "Company must have exactly 1 member at the time of conversion",
        "Member must be an Indian citizen resident in India",
        "No cap on paid-up capital or turnover",
      ),
      minShareholders: null,
      maxShareholders: null,
      minDirectors: null,
      minPartners: null,
      notes: {
        ...NO_NOTES,
      },
    },
  },

  // -------------------------------------------------------------------------
  // Partnership → LLP. HTML `partnership_llp` only — no docx copy.
  // -------------------------------------------------------------------------
  "conversion-partnership-to-llp": {
    formNo: "FiLLiP + Form 17",
    description: "",
    whoCanApply: bullets(
      "Minimum 2 Designated Partners required",
      "At least 1 Designated Partner must be a resident of India",
    ),
    actsRules: "",
    documents: [
      "Proof of registered office (utility bill, not older than 2 months)",
      "NOC from property owner (if rented/leased)",
      "Subscriber sheet signed by all partners",
      "Statement of Assets & Liabilities certified by a CA in practice",
      "List of all secured creditors with their consent",
    ],
    rules: {
      eligibility: lines(
        "Minimum 2 Designated Partners required",
        "At least 1 Designated Partner must be a resident of India",
      ),
      minShareholders: null,
      maxShareholders: null,
      minDirectors: null,
      minPartners: 2,
      notes: {
        ...NO_NOTES,
      },
    },
  },

  // -------------------------------------------------------------------------
  // Partnership → Private Limited. HTML `partnership_pvt` only — no docx copy.
  // -------------------------------------------------------------------------
  "conversion-partnership-to-pvt": {
    formNo: "URC-1 + SPICe+",
    feeLines: [{ label: "Newspaper Advertisement Cost", amount: 7500 }],
    description: "",
    whoCanApply: bullets(
      "Minimum 2 Partners/Directors required",
      "Mandatory newspaper advertisement (21-day objection window) before filing",
      "Consent of majority (not less than 3/4th) of partners required",
    ),
    actsRules: "",
    documents: [
      "Written consent of majority (not less than 3/4th) of partners",
      "Copy of Newspaper Advertisement (Form URC-2)",
      "Statement of Assets & Liabilities certified by a CA",
      "NOC from secured creditors",
    ],
    rules: {
      eligibility: lines(
        "Minimum 2 Partners/Directors required",
        "Mandatory newspaper advertisement (21-day objection window) before filing",
        "Consent of majority (not less than 3/4th) of partners required",
      ),
      minShareholders: 2,
      maxShareholders: null,
      minDirectors: 2,
      minPartners: null,
      notes: {
        name: "",
        members: "Minimum 2 Shareholders and Minimum 2 Directors required for a Private Limited Company.",
        capital: "",
      },
    },
  },

  // -------------------------------------------------------------------------
  // Public → Private Limited. HTML `public_pvt` only — no docx copy, and the
  // HTML drops this type's Capital step, which is where every other type lists
  // its documents, so there is no checklist to import either.
  // -------------------------------------------------------------------------
  "conversion-public-to-pvt": {
    formNo: "RD-1 + INC-27/INC-28",
    feeLines: [{ label: "Newspaper Advertisement Cost", amount: 10000 }],
    description: "",
    whoCanApply: bullets(
      "Members restricted to max 200",
      "Special Resolution required at EGM",
      "Approval of Regional Director (RD) mandatory via Form RD-1",
      "Newspaper advertisement required at least 21 days prior",
    ),
    actsRules: "",
    documents: [],
    rules: {
      eligibility: lines(
        "Members restricted to max 200",
        "Special Resolution required at EGM",
        "Approval of Regional Director (RD) mandatory via Form RD-1",
        "Newspaper advertisement required at least 21 days prior",
      ),
      minShareholders: null,
      maxShareholders: 200,
      minDirectors: 2,
      minPartners: null,
      notes: {
        name: "",
        members: "Members restricted to maximum 200 for a Private Company · Approval of Regional Director is mandatory.",
        capital: "",
      },
    },
  },
};
