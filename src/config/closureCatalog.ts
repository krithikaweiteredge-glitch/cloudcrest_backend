/**
 * Catalog content for the Business Closure services.
 *
 * Three client sources, read together:
 *
 *   - "Business Closure -sindhura.docx" — Private / Public Company & OPC
 *     (voluntary strike-off), LLP, and the Section 8 Company's two routes.
 *   - "Business Closure -KAVYA.docx" — Partnership Firm, Trust (Public and
 *     Private), Society and Nidhi Company.
 *   - business-closure-application.html — the closure form. It repeats the same
 *     content in its "Important Information" sections and supplies the forms.
 *
 * Nothing here is rendered from code. `scripts/backfill-closures.ts` writes it
 * into the catalog rows the admin edits (`services` + `document_types`); the
 * service page, the closure stepper and the upload panel read it back from
 * there.
 *
 * Two closures are split into sub-types, each with its own service page, which
 * the applicant picks before the page opens:
 *
 *   - Trust — Public Trust / Private Trust. The docx gives each its own Who can
 *     apply, Documents and Acts.
 *   - Section 8 Company — the docx explains that a Section 8 company cannot use
 *     voluntary strike-off under Section 248(2), so closure goes one of two
 *     ways: Method 1, conversion into an ordinary company and then strike-off;
 *     or Method 2, voluntary liquidation under Section 59 of the IBC. The base
 *     row's About carries that explanation, shown above the choice.
 *
 * Sub-type rows are created inactive, like the company wizard's entity types,
 * so they don't appear as separate sidebar entries.
 *
 * Fees: only a flat rupee amount the sources state outright becomes a fee line
 * (STK-2 ₹10,000; INC-18 ₹2,000). Amounts that depend on something the form
 * doesn't ask — the MGT-14 capital slabs, the Small / other LLP fee — are kept
 * as the sources write them, in a Fees tab on the service page.
 *
 * Proprietorship closure is in the catalog but in neither document nor the
 * HTML, so it has no entry here.
 */

export type ClosureTab = {
  title: string;
  content: string;
  /** Show straight after "Who can Apply" instead of at the end. */
  afterWho?: boolean;
};

export type ClosureCatalogEntry = {
  /** For a sub-type this script creates: the existing closure it sits under. */
  parent?: string;
  /** Name / short label — used only when the row is created. */
  name?: string;
  shortTitle?: string;
  formNo?: string;
  description: string;
  whoCanApply: string;
  actsRules: string;
  documents: string[];
  /** Extra service-page tabs, straight from a section of the source. */
  extraTabs?: ClosureTab[];
  /** Flat amounts the sources state outright. Anything else is left for the admin. */
  feeLines?: { label: string; amount: number }[];
};

const bullets = (...items: string[]) => items.map((i) => `• ${i}`).join("\n");
const paras = (...blocks: string[]) => blocks.join("\n\n");

/* ------------------------------------------------------------------------ *
 * Private / Public Company & OPC — sindhura.docx "CLOSURES RELATED TO PUBLIC
 * COMPANY, PRIVATE COMPANY & OPC". One procedure (voluntary strike-off) for
 * all three; the docx notes MGT-14 is not required for an OPC.
 * ------------------------------------------------------------------------ */

const COMPANY_ABOUT =
  "Voluntary Strike-Off is the process of closing a company by applying to the ROC for removal of its name from the Register of Companies under Section 248(2) of the Companies Act, 2013. The process involves completing pending compliances, settling assets and liabilities, closing GST and other statutory registrations, obtaining Board and members' approval, filing MGT-14 after passing the Special Resolution, preparing and notarising the prescribed STK-3 and STK-4 documents, preparing STK-8, and finally submitting Form STK-2 to the MCA. Upon successful scrutiny and completion of the prescribed process, the company's name is removed from the Register of Companies.";

const COMPANY_WHO = bullets(
  "Company has not commenced business or operations after incorporation.",
  "Company has ceased to carry on business or operations and does not intend to resume its business.",
  "Company is no longer required to continue its existence and the members decide to close the company.",
  "Company has completed or discontinued its business activities and has no further commercial operations to undertake.",
  "Company has settled/extinguished all its liabilities and is in a position to make the strike-off application.",
);

const COMPANY_INELIGIBLE = paras(
  "A company cannot apply for voluntary strike-off if, during the preceding three months, it has:\n" +
    bullets(
      "Changed its name or shifted its registered office from one State to another;",
      "Disposed of property or rights other than in the normal course of business;",
      "Carried on activities other than those necessary for closure, statutory compliance or making the strike-off application;",
      "Applied to the Tribunal for approval of a compromise or arrangement which has not been finally concluded; or",
      "Is under winding-up proceedings.",
    ),
  "Section 8 Companies are not eligible to apply for voluntary strike-off under Section 248(2).",
);

const MGT14_DOC = "MGT-14 filing of Special Resolution";

const companyDocuments = (isOpc: boolean) => [
  "Board Resolution approving voluntary strike-off",
  "Special Resolution / Members' Consent",
  ...(isOpc ? [] : [MGT14_DOC]),
  "STK-3 – Indemnity Bond, duly executed and notarised",
  "STK-4 – Affidavit/Declaration, duly executed and notarised",
  "STK-8 – Statement of Accounts certified by a Chartered Accountant",
  "Latest Bank Statement",
  "Bank Account Closure Certificate/Letter, wherever applicable",
  "Proof of settlement of Assets and Liabilities",
  "GST Cancellation/Closure Documents, wherever applicable",
  "Closure Documents of Other Statutory Registrations/Licences, wherever applicable",
  "Details of pending litigation/proceedings, if any",
  "Any other documents/information as may be required by ROC/MCA",
];

const STK2_FEE = { label: "Form STK-2 – Government Fee", amount: 10000 };

const companyFeesTab = (isOpc: boolean): ClosureTab => ({
  title: "Fees",
  content: isOpc
    ? bullets("Form STK-2 — ₹10,000")
    : paras(
        bullets("Form STK-2 — ₹10,000"),
        "Form MGT-14 (based on nominal share capital):\n" +
          bullets(
            "Nominal share capital up to ₹1,00,000 — ₹200",
            "₹1,00,001 to ₹5,00,000 — ₹300",
            "₹5,00,001 to ₹10,00,000 — ₹400",
            "₹10,00,001 to ₹50,00,000 — ₹500",
            "₹50,00,001 to ₹1 crore — ₹600",
          ),
        "Late fee for filing of MGT-14:\n" +
          bullets(
            "Up to 30 days — 2 × Normal Fee",
            "More than 30 days and up to 60 days — 4 × Normal Fee",
            "More than 60 days and up to 90 days — 6 × Normal Fee",
            "More than 90 days and up to 180 days — 10 × Normal Fee",
            "More than 180 days — 12 × Normal Fee",
          ),
      ),
});

const companyEntry = (isOpc: boolean): ClosureCatalogEntry => ({
  formNo: "STK-2",
  description: COMPANY_ABOUT,
  whoCanApply: COMPANY_WHO,
  actsRules: "",
  documents: companyDocuments(isOpc),
  extraTabs: [{ title: "Who is Ineligible?", content: COMPANY_INELIGIBLE, afterWho: true }, companyFeesTab(isOpc)],
  feeLines: [STK2_FEE],
});

export const CLOSURE_CATALOG: Record<string, ClosureCatalogEntry> = {
  "closure-pvt": companyEntry(false),
  "closure-public": companyEntry(false),
  "closure-opc": companyEntry(true),

  // -------------------------------------------------------------------------
  // LLP — sindhura.docx "Closure Of LLP".
  // -------------------------------------------------------------------------
  "closure-llp": {
    formNo: "Form 24",
    description: paras(
      "Voluntary closure of an LLP is the process of removing the LLP's name from the Register of LLPs maintained by the Registrar of Companies (ROC), MCA.",
      "Under Section 75 of the Limited Liability Partnership Act, 2008 read with Rule 37 of the LLP Rules, 2009, an LLP can apply for strike-off where it has not been carrying on business or operation for a period of one year or more, with the consent of all its partners.",
    ),
    whoCanApply: paras(
      "An LLP can generally apply for voluntary strike-off where:\n" +
        bullets(
          "The LLP has not been carrying on business or operation for a period of one year or more.",
          "All partners have consented to the application.",
          "The LLP has settled or made appropriate arrangements regarding its liabilities.",
          "There are no circumstances preventing the filing of Form 24.",
          "The LLP is not subject to pending proceedings such as inspection, investigation or prosecution.",
          "There are no open/unsatisfied charges against the LLP.",
          "No partner dispute is marked against the LLP in MCA records.",
        ),
      "LLPs generally cannot proceed with Form 24 where, for example:\n" +
        bullets(
          "There is an open/unsatisfied charge against the LLP.",
          "An inspection, investigation or prosecution is pending.",
          "A partner dispute is marked in the MCA records.",
          "Another MCA form is pending for approval/payment.",
          "Correction of the LLP's master data is pending.",
          "The LLP is otherwise not eligible under the prescribed requirements.",
        ),
    ),
    actsRules: "",
    documents: [
      "Consent of all partners for closure of the LLP",
      "Latest LLP Agreement and amendments, wherever applicable",
      "LLP Form 24 – Application for Strike-Off",
      "Statement of Account and Solvency",
      "Statement of Account showing the LLP's assets and liabilities",
      "Affidavit/Declaration by designated partners",
      "Indemnity undertaking for liabilities that may arise after strike-off",
      "Bank Account Closure Certificate/Letter, if the LLP had a bank account",
      "Latest Bank Statement",
      "Copy of latest Income-tax Return acknowledgement, where the LLP has carried on business and filed an Income-tax return",
      "GST Cancellation/Closure documents, wherever applicable",
      "Closure documents of other statutory registrations/licences, wherever applicable",
      "Evidence of settlement of liabilities, if applicable",
      "Details of pending litigation/proceedings, if any",
      "Copy of the initial LLP Agreement and subsequent amendments, where required",
      "Any other documents/information required by the ROC/MCA",
    ],
    extraTabs: [
      {
        title: "MCA Fee",
        content: bullets("Small LLP — ₹500", "Other than Small LLP — ₹1,000"),
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Section 8 Company — sindhura.docx "Closure of Section 8 Company". The base
  // row explains why there are two routes; each route is its own sub-type.
  // -------------------------------------------------------------------------
  "closure-sec8": {
    description:
      "A Section 8 Company cannot directly apply for voluntary strike-off under Section 248(2) of the Companies Act, 2013. Therefore, depending upon the circumstances of the company, closure may generally be approached through one of the following routes:\n" +
      bullets(
        "Method 1 – Conversion of Section 8 Company and Subsequent Strike-Off",
        "Method 2 – Voluntary Liquidation and Dissolution",
      ),
    whoCanApply: "",
    actsRules: "",
    documents: [],
  },

  "closure-sec8-conversion": {
    parent: "closure-sec8",
    name: "Method 1 – Conversion of Section 8 Company and Subsequent Strike-Off",
    shortTitle: "Conversion + Strike-Off",
    formNo: "INC-18 + INC-20 + STK-2",
    description: paras(
      "Under this route, the Section 8 Company is first converted into an ordinary Private Limited or Public Limited Company by surrendering/revoking its Section 8 status. After the conversion is completed, the company may examine whether it satisfies the conditions for voluntary strike-off under Section 248.",
      "The broad process is:\nBoard Approval → Members' Special Resolution → MGT-14 → Application to Regional Director in INC-18 → Regional Director Approval → Alteration of MOA/AOA → INC-20 → Conversion into Ordinary Company → Fulfil Strike-Off Conditions → STK-2 → ROC Strike-Off",
      "The company must first address its assets, liabilities, statutory dues and other obligations. Particular care is required where the company has received donations, grants, CSR funds or other restricted funds.",
      "The MCA's Instruction Kit prescribes Form INC-18 for application to the Regional Director for conversion of a Section 8 Company into a company of any other kind.",
      "After conversion, the company can consider the normal strike-off process only if it satisfies the applicable requirements under Section 248.",
      "Key MCA Forms:\n" +
        bullets(
          "MGT-14 – Filing of Special Resolution, wherever applicable",
          "INC-18 – Application to Regional Director for conversion",
          "INC-20 – Intimation to ROC regarding revocation/surrender of Section 8 licence",
          "STK-2 – Application for strike-off after conversion, if eligible",
          "STK-3, STK-4 and STK-8 – Applicable at the subsequent strike-off stage, subject to the requirements applicable to the converted company",
        ),
    ),
    whoCanApply: paras(
      "This route may be considered where:\n" +
        bullets(
          "The Section 8 Company has ceased or intends to discontinue its non-profit activities.",
          "The members wish to remove the Section 8 status.",
          "The company wishes to become an ordinary Private Limited/Public Limited Company.",
          "The company can comply with the conditions prescribed for conversion.",
          "Assets and liabilities can be appropriately dealt with.",
          "There are no unresolved issues that prevent the conversion.",
          "After conversion, the company satisfies the conditions for strike-off under Section 248.",
        ),
      "Important:\n" +
        bullets(
          "Conversion does not automatically result in closure.",
          "The company first becomes an ordinary company and must then separately satisfy the eligibility requirements for strike-off.",
        ),
    ),
    actsRules: "",
    // The docx lists two groups, and some names recur in both ("Board
    // Resolution", MGT-14), so each carries its group's heading.
    documents: [
      ...[
        "Certificate of Incorporation",
        "Memorandum of Association",
        "Articles of Association",
        "Section 8 Licence",
        "Latest Company Master Data",
        "Board Resolution",
        "Notice of General Meeting",
        "Special Resolution",
        "Explanatory Statement",
        "MGT-14 filing details",
        "Form INC-18",
        "Statement of Assets and Liabilities",
        "Financial Statements",
        "Details of members",
        "Details of creditors",
        "Consent of lenders/creditors, wherever applicable",
        "Valuation Report by Registered Valuer, wherever applicable",
        "Certificate from CA/CS/CMA regarding compliance, wherever applicable",
        "Regional Director approval/order",
        "Altered MOA and AOA",
        "Form INC-20",
      ].map((d) => `For Conversion — ${d}`),
      ...[
        "Board Resolution",
        "Members' Special Resolution/Consent",
        "MGT-14, wherever applicable",
        "STK-3",
        "STK-4",
        "STK-8",
        "CA-certified Statement of Accounts",
        "Bank statement/Bank closure proof",
        "Evidence of settlement of liabilities",
        "GST cancellation/closure documents, wherever applicable",
        "Income Tax compliance documents",
        "Other statutory registration closure documents",
        "STK-2",
      ].map((d) => `For Subsequent Strike-Off — ${d}`),
    ],
    extraTabs: [
      {
        title: "MCA Fee",
        content: paras(
          "Conversion:\n" + bullets("Form INC-18 — ₹2,000"),
          "Subsequent Strike-Off:\n" +
            bullets("Once converted and eligible, the applicable MCA fee for STK-2 & MGT-14 is paid separately."),
        ),
      },
    ],
    feeLines: [{ label: "Form INC-18 – MCA Fee", amount: 2000 }],
  },

  "closure-sec8-liquidation": {
    parent: "closure-sec8",
    name: "Method 2 – Voluntary Liquidation and Dissolution",
    shortTitle: "Voluntary Liquidation",
    description: paras(
      "Voluntary liquidation is a formal process through which the company winds up its affairs, settles its liabilities, realises its assets and ultimately seeks dissolution.",
      "This route is governed primarily by Section 59 of the Insolvency and Bankruptcy Code, 2016 and the IBBI (Voluntary Liquidation Process) Regulations, 2017, as amended from time to time. The current regulations were amended on 2 June 2026.",
      "The broad process is:\nBoard Meeting → Declaration of Solvency → Members' Resolution → Appointment of Liquidator → Public Announcement → Claims from Creditors/Stakeholders → Realisation of Assets → Settlement of Liabilities → Final Accounts/Report → Application for Dissolution → NCLT Dissolution Order",
      "Section 59 requires, among other things, a declaration from the majority of directors, verified by affidavit, stating that they have made a full inquiry into the affairs of the company and have formed the required opinion regarding its debts and ability to pay them.",
      "The process is supervised by an appointed Insolvency Professional acting as Liquidator.",
    ),
    whoCanApply: paras(
      "Voluntary liquidation may be considered where:\n" +
        bullets(
          "The company has decided to permanently discontinue its activities.",
          "The company is solvent and is eligible to commence voluntary liquidation.",
          "The company is able to settle its debts and other liabilities.",
          "The members wish to formally wind up the company's affairs.",
          "The company has assets that need to be realised or distributed in accordance with law.",
          "A formal dissolution through liquidation is considered appropriate.",
        ),
      "Particularly relevant where the company has:\n" +
        bullets(
          "Assets",
          "Bank balances",
          "Creditors",
          "Debtors",
          "Employee dues",
          "Government dues",
          "Grants or donations",
          "CSR funds",
          "Foreign contributions/FCRA matters",
          "Other regulatory obligations",
        ),
      "The specific treatment of such funds and assets should be reviewed before commencement of liquidation.",
    ),
    actsRules: "",
    documents: [
      ...[
        "Certificate of Incorporation",
        "MOA and AOA",
        "Section 8 Licence",
        "Latest audited financial statements",
        "Books and records of the company",
        "Statement of Assets and Liabilities",
        "Details of creditors",
        "Details of debtors",
        "Details of bank accounts",
        "Details of statutory liabilities",
        "Details of pending litigation/proceedings",
        "Details of grants/donations/CSR funds, wherever applicable",
        "Details of other statutory registrations",
      ].map((d) => `Initial Documents — ${d}`),
      ...[
        "Board Resolution",
        "Declaration of Solvency",
        "Affidavit accompanying Declaration of Solvency",
        "Audited Financial Statements",
        "Records of business operations, as applicable",
        "Valuation report, where applicable",
        "Members' Resolution approving voluntary liquidation",
        "Appointment/consent documents of Liquidator",
        "Creditors' approval, where required",
        "Public Announcement",
        "Proof of publication of Public Announcement",
      ].map((d) => `For Commencement of Liquidation — ${d}`),
      ...[
        "Claims received from creditors/stakeholders",
        "Verification of claims",
        "Asset realisation records",
        "Settlement/payment records",
        "Bank statements",
        "Liquidator's reports",
        "Distribution records",
        "Final Statement of Accounts",
        "Final Report",
      ].map((d) => `During Liquidation — ${d}`),
    ],
    extraTabs: [
      {
        title: "MCA Fee",
        content:
          "The cost structure can include:\n" +
          bullets(
            "Applicable NCLT filing fee",
            "Liquidator's professional remuneration",
            "Insolvency Professional expenses",
            "Public announcement expenses",
            "Valuation expenses, wherever applicable",
            "Professional/legal fees",
            "Statutory filing and compliance costs",
            "Other liquidation expenses",
          ),
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Partnership Firm — KAVYA.docx "Closuer of Partnership Firm".
  // -------------------------------------------------------------------------
  "closure-partnership": {
    description:
      "The closure of a partnership firm involves completely terminating the business operations and severing the legal relationship between all partners. This process requires winding up operations, liquidating assets, paying off liabilities, and cancelling all regulatory registrations.",
    whoCanApply:
      "The right to dissolve a partnership firm depends on how the closure is triggered. Mutual closure requires the agreement of all partners, whereas a partnership-at-will allows any single partner to initiate dissolution via written notice. Additionally, any partner can seek a court-ordered closure due to severe disputes or incapacity, while the legal representatives or receivers of a deceased or insolvent partner may also step in to wind up accounts.",
    actsRules: bullets("The Indian Partnership Act, 1932"),
    documents: [
      "Original Partnership Deed",
      "Dissolution Deed",
      "Partners' KYC Records",
      "Final Statement of Accounts",
      "Asset and Liability Statement",
      "No-Objection Certificates (NOC)",
      "Registrar Filing Forms",
      "GST Cancellation (Form REG-16)",
      "PAN & TAN Surrender",
      "Other Business Licenses",
      "Bank Account Closure Request",
      "Surrender Items",
    ],
  },

  // -------------------------------------------------------------------------
  // Trust — KAVYA.docx "Trust Dissolution: Public Trusts / Private Trusts".
  // The base row becomes the type picker. Neither source prices trust
  // dissolution, so the two types start with no fee for the admin to set.
  // -------------------------------------------------------------------------
  "closure-trust": {
    // The HTML's own subtitle for the trust card.
    description: "Dissolution of Public Trust or Private Trust",
    whoCanApply: "",
    actsRules: "",
    documents: [],
  },

  "closure-trust-public": {
    parent: "closure-trust",
    name: "Public Trust",
    shortTitle: "Public Trust",
    // The docx has an "About" heading for the public trust with nothing under it.
    description: "",
    whoCanApply: bullets(
      "The Board of Trustees",
      "The Charity Commissioner or Court",
      "Persons Having an Interest / Beneficiaries",
    ),
    actsRules: bullets(
      "The Registration Act, 1908",
      "The Code of Civil Procedure (CPC), 1908",
      "State-Specific Legislation",
    ),
    documents: [
      "Original Trust Deed and any modification/amendment deeds",
      "Board Resolution: A signed, formal resolution documenting the trustees' unanimous or majority decision to close the trust and proposing a recipient entity for the remaining assets",
      "Financial and Asset Statements: Audited balance sheets, income/expenditure statements up to the current date, and an itemized inventory of all movable and immovable properties",
      "Creditor No-Objection Certificates (NOC): Written clearances from vendors, lenders, or utility providers confirming all outside liabilities have been fully paid",
      "Formal Petition / Application: Filed with the state Charity Commissioner or District Court seeking judicial or regulatory sanction for asset transfer",
      "Tax Deregistration Papers: Applications to cancel 12A/80G and FCRA registrations, alongside the final income tax return (ITR-7)",
    ],
  },

  "closure-trust-private": {
    parent: "closure-trust",
    name: "Private Trust",
    shortTitle: "Private Trust",
    description:
      "The dissolution or termination of a private trust (established for specific individuals, family members, or designated beneficiaries) is governed primarily by whether the trust is structured as revocable or irrevocable.",
    whoCanApply: bullets(
      "The Settlor / Author of the Trust",
      "All Competent Beneficiaries",
      "The Managing Trustees",
      "Civil Court",
    ),
    actsRules: bullets(
      "The Indian Trusts Act, 1882",
      "The Indian Registration Act, 1908",
      "The Indian Stamp Act, 1899",
      "The Income Tax Act, 1961",
    ),
    documents: [
      "Original Private Trust Deed and any modification or amendment deeds",
      "Revocation Deed / Termination Agreement",
      "Trustee Resolution",
      "Asset and Financial Statements",
      "No-Objection Certificates (NOC)",
      "Tax Surrender Documentation",
    ],
  },

  // -------------------------------------------------------------------------
  // Society — KAVYA.docx "Society".
  // -------------------------------------------------------------------------
  "closure-society": {
    description:
      "The dissolution of a society (registered under the Societies Registration Act or state-level equivalents) involves winding up its activities, liquidating assets, paying off liabilities, and formally cancelling its legal registration. Unlike commercial firms, society assets cannot be distributed among members or office bearers; remaining properties must be transferred to another society or charitable institution sharing similar objects.",
    whoCanApply: bullets(
      "General Body of Members",
      "Governing Body / Managing Committee",
      "Registrar of Societies or Court",
    ),
    actsRules: bullets(
      "The Societies Registration Act, 1860 (Central Act)",
      "State Societies Registration Acts",
      "The Income Tax Act, 1961",
    ),
    documents: [
      "Original Memorandum of Association (MoA) and Rules & Regulations (By-laws)",
      "General Body Meeting Minutes",
      "Final balance sheets, income/expenditure accounts, and a comprehensive inventory of assets and liabilities",
      "No-Objection Certificates (NOC)",
      "Asset Distribution Plan",
      "Surrender Applications",
    ],
  },

  // -------------------------------------------------------------------------
  // Nidhi Company — KAVYA.docx "Closure of Nidhi company". The docx has no
  // About section for Nidhi.
  // -------------------------------------------------------------------------
  "closure-nidhi": {
    description: "",
    whoCanApply: bullets(
      "The Board of Directors",
      "The Shareholders (Members)",
      "Appointed Company Liquidator / Insolvency Professional",
      "The Registrar of Companies (ROC)",
    ),
    actsRules: bullets(
      "The Companies Act, 2013",
      "Nidhi Rules, 2014 (and subsequent amendments up to 2022)",
      "The Income Tax Act, 1961 & GST Act",
    ),
    documents: [
      "Corporate Records",
      "Board & Shareholder Resolutions",
      "Financial Clearance Proofs",
      "Statutory Declarations & Indemnity",
      "Indemnity Bond (duly notarized) given by all directors indemnifying against any future claims",
      "Affidavit signed by all directors confirming solvency and zero liabilities",
      "Statement of Assets and Liabilities certified by a Chartered Accountant",
      "MCA Regulatory Forms: Filed applications including Form MGT-14, Form INC-28, or Form STK-2 along with fee challans",
      "Banking & Tax Surrender Papers",
    ],
  },
};
