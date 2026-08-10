/**
 * Exact service names as written in the client's "New registration additions"
 * document, keyed by service slug. Applied to BOTH `services.name` and
 * `services.short_title` so the detail page, home grid and sidebar all read
 * exactly as the document.
 *
 * NOTE: the strings below reproduce the document verbatim, including its original
 * spellings and spacing (e.g. "Foregin", "Clearence", "Investment Investment",
 * "Form 104 ( old form 10A)"). Correct any of these here if the document had typos.
 *
 * Used in two places:
 *   - seed-catalog.ts (upsert) so re-seeding keeps these names.
 *   - the one-off name-sync script that writes them to the live catalog.
 */
export const EXACT_NAMES: Record<string, string> = {
  // Entity Registrations
  company: "Company",
  llp: "LLP",
  partnership: "Partnership",
  trust: "Trust",
  society: "Society",
  huf: "HUF",
  "sole-proprietorship": "Sole Proprietorship",

  // Business Conversions
  "conversion-pvt-to-public": "Pvt to Public Ltd Company",
  "conversion-llp-to-pvt": "LLP to Pvt Ltd Company",
  "conversion-opc-to-pvt": "OPC to Pvt Ltd Company",
  "conversion-proprietorship-to-pvt": "Proprietorship to Pvt Ltd Company",
  "conversion-partnership-to-pvt": "Partnership to Pvt Ltd Company",
  "conversion-pvt-to-opc": "Pvt Ltd to OPC Company",
  "conversion-partnership-to-llp": "Partnership to LLP Company",
  "conversion-public-to-pvt": "Public to Pvt Ltd Company",

  // Business Closures
  "closure-pvt": "Closure of Pvt Ltd Company",
  "closure-llp": "Closure of LLP",
  "closure-opc": "Closure of OPC",
  "closure-proprietorship": "Closure of Sole Proprietorship",
  "closure-partnership": "Closure of Partnership Firm",
  "closure-nidhi": "Closure of Nidhi Company",
  "closure-sec8": "Closure of Section 8 Company",
  "closure-public": "Closure of Public Limited Company",
  "closure-trust": "Dissolution of Trust",
  "closure-society": "Dissolution of Society",

  // Tax Registrations
  gst: "GST",
  lut: "LUT",
  "pan-tan": "TAN/PAN",
  dpiit: "DPIIT",
  "lower-tax-deduction": "Lower Tax Deduction",
  "80iac": "80IAC",
  "12a": "12A",
  "80g": "80G",
  icegate: "ICE GATE",
  "form-10a": "Form 104 ( old form 10A)",
  "non-deduction-declaration": "Declaration for non-deduction of tax",
  rcmc: "RCMC",

  // Other Business Registrations
  msme: "MSME",
  iec: "IEC",
  din: "Director Identification Number(DIN)",
  lei: "LEIC",
  "ngo-darpan": "NPO DARPAN",
  rera: "RERA",
  dsc: "Digital Signature Certificate",
  iso: "ISO Certification",

  // Labour & Municipal License
  "labour-licence": "Labour license",
  epf: "EPF",
  esi: "ESI",
  "professional-tax": "Professional Tax",
  "trade-licence": "Trade Licenses",

  // Intellectual Property
  trademark: "Trade Mark",
  patent: "Patent",
  copyright: "Copyright",
  design: "Design",
  "layout-design": "Lay out design",

  // Industry Specific Registrations — licences
  fssai: "FSSAI",
  "factory-licence": "Factory license",
  "drug-licence": "Drug license",

  // Industry Specific Registrations — department sub-heads
  "ind-multi-state-coop": "Registration of Multi-State Co-operative Society",
  "ind-fertiliser-dealer": "Registration for sale of fertilisers as an Industrial Dealer",
  "ind-dta-sale": "Application for DTA sale / advance DTA sale permission",
  "ind-eou-exit": "Application for exit from EOU SCHEME (ANF-6D)",
  "ind-eou-lop-extension": "Application for Extension of Letter of Permission (LOP) for EOU",
  "ind-eou-setup": "Application for setting up of new Export Oriented Unit (EOU)",
  "ind-eou-exit-undertaking": "Approval for legal undertaking for exit of one of the units from EOU",
  "ind-eou-export-house": "Export house certificate - EOU",
  "ind-eou-apr": "Filing of Annual Progress Report (APR) for the working EOU units",
  "ind-eou-qpr": "Filing of Quarterly Progress Report (QPR) for the working EOU Units",
  "ind-eou-qpr-implementation":
    "Filing of Quarterly Progress Report for the EOU/ Units which are under implementation",
  "ind-restricted-import-export": "Import / Export of Restricted items",
  "ind-idr-eou": "Industrial License – IDR Act_EOU",
  "ind-idr-sez": "Industrial License – IDR Act_SEZ",
  "ind-eou-legal-agreement": "Legal agreement for EOU/EHTP/STP/BTP",
  "ind-eou-lop": "Letter of permission - EOU",
  "ind-investment-advisor": "Registration as Investment advisor",
  "ind-investment-funds": "Registration of Investment Investment funds",
  "ind-sez-unit": "Setting up of SEZ unit",
  "ind-sez-codeveloper": "Setting up SEZ (i.e. SEZ Co-developer)",
  "ind-sez-developer": "Setting up SEZ (i.e. SEZ Developer)",
  "ind-sez-clearance": "SEZ Clearence",
  "ind-ifldp-vision-doc":
    "Vision document component under step sub-scheme of IFLDP during 2021-26",
  "ind-fdi": "Foregin Direct Investment(FDI)",
  "ind-nbfc": "Registration to carry on business as Non-banking financial company",
  "ind-food-license": "License for food business",
  "ind-food-import-license":
    "License for importing food items including food ingredients and additives for commercial use",
  "ind-petty-food": "Registration of Petty Food Business",
  "ind-cbse-affiliation": "CBSE Affiliation",
  "ind-iem-part-a": "Issue of Industrial Entrepreneur Memorandum (Part-A)",
  "ind-iem-part-b": "Issue of Industrial Entrepreneur Memorandum (Part-B)",
  "ind-nidhi-plus-fbo": "Food Business Operator Registration on NIDHI+",
};
