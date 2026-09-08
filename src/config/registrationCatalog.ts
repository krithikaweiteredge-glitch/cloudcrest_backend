/**
 * Catalog content for the four registrations the client priced and specified in
 * late 2025: DIN (DIN.docx), DGFT IEC ("IEC updated.html"), Global LEI
 * ("updated LEIC.html") and RERA ("Updated RERA.html").
 *
 * Until now all four sat in the catalog as bare `min()` rows — identity only, no
 * fee, no copy and no checklist. This module is the single source of truth for
 * what they should hold, and is consumed by two callers:
 *
 *   - `scripts/seed-catalog.ts`     — creates the rows on a fresh database
 *   - `scripts/backfill-registrations.ts` — fills them in on a database where
 *                                     the bare rows already exist
 *
 * Fees are `professional + GST`; none of the four carries a government fee that
 * we collect. The DGFT portal charge, the LEIL issuance charge and the state
 * RERA per-square-metre registration fee are all paid by the client directly to
 * the authority and are deliberately not bundled into these figures.
 */

export type RegistrationCatalogEntry = {
  /** Display name, used only when the row is created fresh. */
  name: string;
  shortTitle: string;
  authority: string;
  formNo: string;
  icon: string;
  professionalFee: number;
  govtFee: number;
  gstPercent: number;
  description: string;
  whoCanApply: string;
  documents: string[];
};

export const REGISTRATION_CATALOG: Record<string, RegistrationCatalogEntry> = {
  // -------------------------------------------------------------------------
  // DIN — source: DIN.docx. "Professional Fee : 999+gst".
  // -------------------------------------------------------------------------
  din: {
    name: "Director Identification Number (DIN)",
    shortTitle: "DIN",
    authority: "MCA",
    formNo: "DIR-3",
    icon: "IdCard",
    professionalFee: 999,
    govtFee: 0,
    gstPercent: 18,
    description:
      "A Director Identification Number (DIN) is a unique 8-digit number given by the Ministry of Corporate Affairs (MCA) to every person who wants to become a director in a company or LLP in India.\n\n" +
      "Once you get a DIN, it stays with you for life. You can use the same DIN even if you become a director in multiple companies. It helps the government keep track of all directors and prevents fraud.",
    whoCanApply:
      "You can apply for a DIN if you are:\n" +
      "• An individual (not a company or firm)\n" +
      "• 18 years of age or above\n" +
      "• Planning to become a director or designated partner in a company or LLP\n" +
      "• An Indian resident or a foreign national (foreign nationals can also apply)",
    // One flat list per service, so the two applicant types are labelled inline.
    // The wizard shows only the half that applies once you pick Indian or
    // foreign in step 1.
    documents: [
      "Indian nationals — Passport-size colour photograph",
      "Indian nationals — PAN card (mandatory)",
      "Indian nationals — Aadhaar card",
      "Indian nationals — Address proof (Aadhaar / Passport / Voter ID / Driving Licence / bank statement / utility bill, not older than 2 months)",
      "Foreign nationals — Passport (mandatory)",
      "Foreign nationals — Address proof of the residential address outside India",
      "Foreign nationals — Passport-size colour photograph",
      "Foreign nationals — Notarised and apostilled identity & address proofs, translated into English",
      "Digital Signature Certificate (DSC)",
    ],
  },

  // -------------------------------------------------------------------------
  // IEC — source: "IEC updated.html". Client price: 999 + 18% GST.
  // -------------------------------------------------------------------------
  iec: {
    name: "IEC Import-Export",
    shortTitle: "IEC",
    authority: "DGFT",
    formNo: "ANF-2A",
    icon: "Globe",
    professionalFee: 999,
    govtFee: 0,
    gstPercent: 18,
    description:
      "The Importer-Exporter Code (IEC) is a 10-digit code issued by the Directorate General of Foreign Trade (DGFT). No business can import into or export out of India without one.\n\n" +
      "An IEC is issued against the PAN of the firm, is valid for the lifetime of the business and needs no renewal — only an annual confirmation on the DGFT portal.",
    whoCanApply:
      "Any person or entity intending to import or export goods or services from India, including:\n" +
      "• Proprietorship and partnership firms\n" +
      "• LLPs, private limited and public limited companies\n" +
      "• Societies, trusts, HUFs and Section 8 companies\n" +
      "• Government undertakings\n\n" +
      "The firm must hold a PAN and an active current account before applying.",
    documents: [
      "Firm / entity PAN card (the proprietor's PAN for a proprietorship)",
      "Business address proof — utility bill / rent agreement / sale deed",
      "Registration certificate — COI / partnership deed / trust deed, as applicable to the firm type",
      "Cancelled cheque or first page of the bank statement",
      "Authorised signatory — Aadhaar card",
      "Authorised signatory — PAN card",
      "Authorised signatory — Government ID (Passport / Voter ID)",
    ],
  },

  // -------------------------------------------------------------------------
  // LEI — source: "updated LEIC.html". Client price: 999 + 18% GST.
  // -------------------------------------------------------------------------
  lei: {
    name: "Legal Entity Identifier (LEI)",
    shortTitle: "LEI",
    authority: "LEIL",
    formNo: "—",
    icon: "IdCard",
    professionalFee: 999,
    govtFee: 0,
    gstPercent: 18,
    description:
      "A Legal Entity Identifier (LEI) is a 20-character alphanumeric code that identifies a legal entity uniquely worldwide, issued under the Global Legal Entity Identifier Foundation (GLEIF) standard through Legal Entity Identifier India Ltd (LEIL).\n\n" +
      "The RBI requires an LEI for large-value transactions in the money, government-securities and forex markets, for borrowers above prescribed exposure limits, and for cross-border payments.",
    whoCanApply:
      "Any registered legal entity, including:\n" +
      "• Private limited, public limited and Section 8 companies\n" +
      "• LLPs, partnership firms and sole proprietorships\n" +
      "• Trusts, societies and government entities / PSUs\n" +
      "• Mutual funds and Alternative Investment Funds (AIFs)\n" +
      "• Foreign companies and branch offices\n\n" +
      "The entity must be able to name its direct accounting consolidating parent, or record one of GLEIF's four opt-out reasons for not having one.",
    documents: [
      "Registration certificate — Certificate of Incorporation / registered deed",
      "Entity PAN card",
      "Board resolution / letter of authority (required if the signatory is not a director or partner)",
      "Authorised person — Aadhaar card",
      "Authorised person — PAN card",
      "Authorised person — Government ID (Passport / Voter ID)",
    ],
  },

  // -------------------------------------------------------------------------
  // RERA — source: "Updated RERA.html". Client price: 5999 + 18% GST.
  // -------------------------------------------------------------------------
  rera: {
    name: "RERA Registration",
    shortTitle: "RERA",
    authority: "State RERA",
    formNo: "—",
    icon: "HomeIcon",
    professionalFee: 5999,
    govtFee: 0,
    gstPercent: 18,
    description:
      "Under the Real Estate (Regulation and Development) Act, 2016, a promoter cannot advertise, market, book or sell any plot or apartment in a real-estate project without first registering it with the state regulatory authority.\n\n" +
      "We handle project registration with TGRERA (Telangana), APRERA (Andhra Pradesh) and K-RERA (Karnataka) — including the dedicated 70% escrow account the Act requires before registration.",
    whoCanApply:
      "The promoter of a real-estate project in Telangana, Andhra Pradesh or Karnataka. Depending on the state, the promoter may be:\n" +
      "• An individual\n" +
      "• A company or partnership firm\n" +
      "• A society or trust\n" +
      "• A competent authority, local authority or development authority\n\n" +
      "The 70% RERA bank account must already be open, and the layout / building plan must already be approved.",
    documents: [
      "Promoter PAN card",
      "Promoter Aadhaar card (individual promoters only)",
      "Last 3 years audited financials (ITR, P&L)",
      "Approved layout / building plan",
      "Land ownership / title deed",
      "Encumbrance Certificate (EC)",
      "Declaration affidavit (Form B)",
      "Cancelled cheque or first page of the bank statement (70% RERA account)",
    ],
  },

  // -------------------------------------------------------------------------
  // DSC — source: "DSC.docx". Client price: 2000 (Normal) / 4000 (Combo) + 18% GST.
  // -------------------------------------------------------------------------
  dsc: {
    name: "Digital Signature Certificate",
    shortTitle: "DSC",
    authority: "Certifying Authority (CCA)",
    formNo: "Class 3 DSC",
    icon: "FileBadge2",
    professionalFee: 2000,
    govtFee: 0,
    gstPercent: 18,
    description:
      "A Digital Signature Certificate (DSC) is a secure electronic signature issued by a Certifying Authority (CA) licensed by the Controller of Certifying Authorities (CCA) under the Information Technology Act, 2000. It authenticates the identity of the holder and is legally equivalent to a physical handwritten signature.\n\n" +
      "DSC is mandatory for e-filing on the MCA portal (SPICe+, AGILE-PRO, etc.), Income Tax e-filing, GST filings, and other government portals. It ensures the security, authenticity, and integrity of electronic documents.",
    whoCanApply:
      "Any individual or organization requiring digital signing and authentication for statutory filings, including:\n" +
      "• Indian individuals (residents & NRIs)\n" +
      "• Directors / Designated Partners of companies and LLPs\n" +
      "• Proprietors, Partners, and Authorized Signatories of businesses\n" +
      "• Foreign nationals and foreign entities (with additional attestation requirements)\n" +
      "• Professionals (CAs, CSs, lawyers, etc.) requiring DSC for official filings",
    documents: [
      "PAN Card (mandatory)",
      "Aadhaar Card (for eKYC verification)",
      "Recent passport-size colour photograph",
      "GST Certificate (for Combo DSC)",
    ],
  },
  "dsc-normal": {
    name: "Normal DSC",
    shortTitle: "Normal DSC",
    authority: "Certifying Authority (CCA)",
    formNo: "Class 3 DSC",
    icon: "FileBadge2",
    professionalFee: 2000,
    govtFee: 0,
    gstPercent: 18,
    description:
      "A Digital Signature Certificate (DSC) is a secure electronic signature issued by a Certifying Authority (CA) licensed by the Controller of Certifying Authorities (CCA) under the Information Technology Act, 2000. It authenticates the identity of the holder and is legally equivalent to a physical handwritten signature.\n\nDSC is mandatory for e-filing on the MCA portal (SPICe+, AGILE-PRO, etc.), Income Tax e-filing, GST filings, and other government portals. It ensures the security, authenticity, and integrity of electronic documents.",
    whoCanApply:
      "• Indian individuals (residents & NRIs)\n" +
      "• Directors / Designated Partners of companies and LLPs\n" +
      "• Proprietors, Partners, and Authorized Signatories of businesses\n" +
      "• Foreign nationals and foreign entities (with additional attestation requirements)\n" +
      "• Professionals (CAs, CSs, lawyers, etc.) requiring DSC for official filings",
    documents: [
      "PAN Card (mandatory)",
      "Aadhaar Card (for eKYC verification)",
      "Recent passport-size colour photograph",
    ],
  },
  "dsc-combo": {
    name: "Combo DSC",
    shortTitle: "Combo DSC",
    authority: "Certifying Authority (CCA)",
    formNo: "Class 3 DSC",
    icon: "FileBadge2",
    professionalFee: 4000,
    govtFee: 0,
    gstPercent: 18,
    description:
      "A Digital Signature Certificate (DSC) is a secure electronic signature issued by a Certifying Authority (CA) licensed by the Controller of Certifying Authorities (CCA) under the Information Technology Act, 2000. It authenticates the identity of the holder and is legally equivalent to a physical handwritten signature.\n\nA Class 3 Combo DSC contains dual certificates: a Signing certificate for digital signatures and an Encryption certificate for secure data transmission. Required for government e-tendering portals, GST filings, and foreign trade authentication.",
    whoCanApply:
      "• Indian individuals (residents & NRIs)\n" +
      "• Directors / Designated Partners of companies and LLPs\n" +
      "• Proprietors, Partners, and Authorized Signatories of businesses\n" +
      "• Foreign nationals and foreign entities (with additional attestation requirements)\n" +
      "• Professionals (CAs, CSs, lawyers, etc.) requiring DSC for official filings",
    documents: [
      "PAN Card (mandatory)",
      "Aadhaar Card (for eKYC verification)",
      "Recent passport-size colour photograph",
      "GST Certificate (extra required for organisation combo DSC)",
    ],
  },
};
