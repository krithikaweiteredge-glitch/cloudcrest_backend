/**
 * AUTHORITATIVE statutory (government) fee engine — the single source of truth.
 *
 * The frontend does NOT compute fees itself; it calls `POST /api/fees/estimate`
 * (feesController), which uses this module, and the fee shown to the customer is
 * recomputed here again at submission time so a tampered client can't file a
 * request with the wrong amount.
 *
 * Ports the two client fee calculators into code so the wizard shows a real,
 * itemised government-fee breakdown instead of a single flat "government fee":
 *
 *  - MCA Company Incorporation (SPICe+): MoA Registration Fee, AoA Registration
 *    Fee, PAN/TAN Fee and the state Stamp Duty on MoA / AoA / SPICe+ Part B,
 *    per the Companies (Registration Offices and Fees) Rules, 2014 and the
 *    state-wise stamp-duty dataset.
 *  - LLP Incorporation (FiLLiP): the contribution-slab filing fee plus the
 *    ₹200 name reservation and the ₹143 PAN/TAN fee.
 *
 * GST is applied on top by the caller at a flat 18% of the whole pre-GST total
 * (professional + all statutory fees) — see `withProfessionalAndGst`.
 *
 * Every figure here is a budgeting estimate. State stamp-duty rates in
 * particular are researched approximations (only Telangana is exact) and change
 * with limited notice — always cross-check the live MCA SPICe+ calculator before
 * filing. This mirrors the assumptions documented in the source workbooks.
 */

export type StatutoryLine = { label: string; amount: number };

export const GST_RATE = 18;

/* ------------------------------------------------------------------ *
 * State stamp-duty lookup table (2026 dataset).
 *
 * Five categories, matching the source workbook:
 *   [0] Small / OPC company
 *   [1] Share Capital & Section-8
 *   [2] Share Capital & Non Section-8
 *   [3] Members-based & Section-8   (company without share capital)
 *   [4] Members-based & Non Section-8
 *
 * `moa` / SPICe+ Part B are flat amounts; `aoa` is either a flat amount or a
 * function of the authorised capital where the state rate is capital-linked.
 * ------------------------------------------------------------------ */
type StampCat = { moa: number; aoa: number | ((c: number) => number) };
type StampRow = { spiceB: number; cats: [StampCat, StampCat, StampCat, StampCat, StampCat] };

const STAMP_DUTY: Record<string, StampRow> = {
  "Andaman and Nicobar Islands": { spiceB: 20, cats: [{ moa: 0, aoa: 0 }, { moa: 0, aoa: 0 }, { moa: 200, aoa: 300 }, { moa: 0, aoa: 0 }, { moa: 200, aoa: 300 }] },
  "Andhra Pradesh": { spiceB: 20, cats: [{ moa: 500, aoa: (c: number) => Math.min(Math.max(c*0.0015,1000),500000) }, { moa: 500, aoa: (c: number) => Math.min(Math.max(c*0.0015,1000),500000) }, { moa: 500, aoa: (c: number) => Math.min(Math.max(c*0.0015,1000),500000) }, { moa: 500, aoa: 1000 }, { moa: 500, aoa: 1000 }] },
  "Arunachal Pradesh": { spiceB: 10, cats: [{ moa: 200, aoa: 500 }, { moa: 200, aoa: 500 }, { moa: 200, aoa: 500 }, { moa: 200, aoa: 500 }, { moa: 200, aoa: 500 }] },
  "Assam": { spiceB: 15, cats: [{ moa: 200, aoa: 310 }, { moa: 200, aoa: 310 }, { moa: 200, aoa: 310 }, { moa: 200, aoa: 310 }, { moa: 200, aoa: 310 }] },
  "Bihar": { spiceB: 20, cats: [{ moa: 0, aoa: 0 }, { moa: 0, aoa: 0 }, { moa: 500, aoa: (c: number) => Math.min(Math.max(c*0.0015,1000),500000) }, { moa: 0, aoa: 0 }, { moa: 500, aoa: 1000 }] },
  "Chandigarh": { spiceB: 3, cats: [{ moa: 0, aoa: 0 }, { moa: 0, aoa: 0 }, { moa: 500, aoa: 1000 }, { moa: 0, aoa: 0 }, { moa: 500, aoa: 1000 }] },
  "Chhattisgarh": { spiceB: 10, cats: [{ moa: 0, aoa: 0 }, { moa: 0, aoa: 0 }, { moa: 500, aoa: (c: number) => Math.min(Math.max(c*0.0015,1000),500000) }, { moa: 0, aoa: 0 }, { moa: 500, aoa: 1000 }] },
  "Dadra and Nagar Haveli": { spiceB: 1, cats: [{ moa: 0, aoa: 0 }, { moa: 0, aoa: 0 }, { moa: 15, aoa: 25 }, { moa: 0, aoa: 0 }, { moa: 150, aoa: 1000 }] },
  "Daman and Diu": { spiceB: 20, cats: [{ moa: 0, aoa: 0 }, { moa: 0, aoa: 0 }, { moa: 150, aoa: (c: number) => Math.ceil(c/500000)*1000 }, { moa: 0, aoa: 0 }, { moa: 150, aoa: 1000 }] },
  "Delhi": { spiceB: 10, cats: [{ moa: 0, aoa: 0 }, { moa: 0, aoa: 0 }, { moa: 200, aoa: (c: number) => Math.min(c*0.0015,2500000) }, { moa: 0, aoa: 0 }, { moa: 200, aoa: 200 }] },
  "Goa": { spiceB: 50, cats: [{ moa: 0, aoa: 0 }, { moa: 0, aoa: 0 }, { moa: 150, aoa: (c: number) => Math.ceil(c/500000)*1000 }, { moa: 0, aoa: 0 }, { moa: 150, aoa: 1000 }] },
  "Gujarat": { spiceB: 20, cats: [{ moa: 0, aoa: 0 }, { moa: 0, aoa: 0 }, { moa: 300, aoa: (c: number) => Math.min(c*0.005,500000) }, { moa: 0, aoa: 0 }, { moa: 300, aoa: 1000 }] },
  "Haryana": { spiceB: 15, cats: [{ moa: 0, aoa: 0 }, { moa: 0, aoa: 0 }, { moa: 60, aoa: 120 }, { moa: 0, aoa: 0 }, { moa: 60, aoa: 60 }] },
  "Himachal Pradesh": { spiceB: 3, cats: [{ moa: 0, aoa: 0 }, { moa: 0, aoa: 0 }, { moa: 60, aoa: 120 }, { moa: 0, aoa: 0 }, { moa: 60, aoa: 60 }] },
  "Jammu and Kashmir": { spiceB: 10, cats: [{ moa: 0, aoa: 0 }, { moa: 0, aoa: 0 }, { moa: 150, aoa: 300 }, { moa: 0, aoa: 0 }, { moa: 150, aoa: 150 }] },
  "Jharkhand": { spiceB: 5, cats: [{ moa: 0, aoa: 0 }, { moa: 0, aoa: 0 }, { moa: 63, aoa: 105 }, { moa: 0, aoa: 0 }, { moa: 63, aoa: 105 }] },
  "Karnataka": { spiceB: 20, cats: [{ moa: 0, aoa: 0 }, { moa: 0, aoa: 0 }, { moa: 5000, aoa: (c: number) => Math.min(Math.ceil(c/1000000)*5000,10000000) }, { moa: 0, aoa: 0 }, { moa: 5000, aoa: 5000 }] },
  "Kerala": { spiceB: 25, cats: [{ moa: 1000, aoa: (c: number) => c<=1000000?2000:(c<=2500000?5000:c*0.005) }, { moa: 1000, aoa: (c: number) => c<=1000000?2000:(c<=2500000?5000:c*0.005) }, { moa: 1000, aoa: (c: number) => c<=1000000?2000:(c<=2500000?5000:c*0.005) }, { moa: 1000, aoa: 2000 }, { moa: 1000, aoa: 2000 }] },
  "Ladakh": { spiceB: 0, cats: [{ moa: 0, aoa: 0 }, { moa: 0, aoa: 0 }, { moa: 0, aoa: 0 }, { moa: 0, aoa: 0 }, { moa: 0, aoa: 0 }] },
  "Lakshadweep": { spiceB: 25, cats: [{ moa: 500, aoa: 1000 }, { moa: 500, aoa: 1000 }, { moa: 500, aoa: 1000 }, { moa: 500, aoa: 1000 }, { moa: 500, aoa: 1000 }] },
  "Madhya Pradesh": { spiceB: 50, cats: [{ moa: 2500, aoa: 5000 }, { moa: 2500, aoa: 5000 }, { moa: 2500, aoa: 5000 }, { moa: 2500, aoa: 5000 }, { moa: 2500, aoa: 5000 }] },
  "Maharashtra": { spiceB: 100, cats: [{ moa: 0, aoa: 0 }, { moa: 0, aoa: 0 }, { moa: 200, aoa: (c: number) => Math.min(Math.ceil(c/500000)*1000,5000000) }, { moa: 0, aoa: 0 }, { moa: 0, aoa: 0 }] },
  "Manipur": { spiceB: 10, cats: [{ moa: 100, aoa: 150 }, { moa: 100, aoa: 150 }, { moa: 100, aoa: 150 }, { moa: 100, aoa: 150 }, { moa: 100, aoa: 150 }] },
  "Meghalaya": { spiceB: 10, cats: [{ moa: 100, aoa: 300 }, { moa: 100, aoa: 300 }, { moa: 100, aoa: 300 }, { moa: 100, aoa: 300 }, { moa: 100, aoa: 300 }] },
  "Mizoram": { spiceB: 10, cats: [{ moa: 100, aoa: 150 }, { moa: 100, aoa: 150 }, { moa: 100, aoa: 150 }, { moa: 100, aoa: 150 }, { moa: 100, aoa: 150 }] },
  "Nagaland": { spiceB: 10, cats: [{ moa: 100, aoa: 150 }, { moa: 100, aoa: 150 }, { moa: 100, aoa: 150 }, { moa: 100, aoa: 150 }, { moa: 100, aoa: 150 }] },
  "Odisha": { spiceB: 10, cats: [{ moa: 300, aoa: 300 }, { moa: 300, aoa: 300 }, { moa: 300, aoa: 300 }, { moa: 300, aoa: 300 }, { moa: 300, aoa: 300 }] },
  "Puducherry": { spiceB: 10, cats: [{ moa: 0, aoa: 0 }, { moa: 0, aoa: 0 }, { moa: 200, aoa: 300 }, { moa: 0, aoa: 0 }, { moa: 200, aoa: 300 }] },
  "Punjab": { spiceB: 25, cats: [{ moa: 0, aoa: 0 }, { moa: 0, aoa: 0 }, { moa: 5000, aoa: (c: number) => c<=100000?5000:10000 }, { moa: 0, aoa: 0 }, { moa: 5000, aoa: 5000 }] },
  "Rajasthan": { spiceB: 10, cats: [{ moa: 0, aoa: 0 }, { moa: 0, aoa: 0 }, { moa: 500, aoa: (c: number) => Math.min(Math.max(c*0.0015,5000),2500000) }, { moa: 0, aoa: 0 }, { moa: 500, aoa: 500 }] },
  "Sikkim": { spiceB: 0, cats: [{ moa: 0, aoa: 0 }, { moa: 0, aoa: 0 }, { moa: 0, aoa: 0 }, { moa: 0, aoa: 0 }, { moa: 0, aoa: 0 }] },
  "Tamil Nadu": { spiceB: 20, cats: [{ moa: 0, aoa: 0 }, { moa: 0, aoa: 0 }, { moa: 200, aoa: (c: number) => Math.min(Math.ceil(c/1000000)*500,500000) }, { moa: 0, aoa: 0 }, { moa: 200, aoa: 500 }] },
  "Telangana": { spiceB: 20, cats: [{ moa: 500, aoa: (c: number) => Math.min(Math.max(c*0.0015,1000),500000) }, { moa: 500, aoa: (c: number) => Math.min(Math.max(c*0.0015,1000),500000) }, { moa: 500, aoa: (c: number) => Math.min(Math.max(c*0.0015,1000),500000) }, { moa: 500, aoa: 1000 }, { moa: 500, aoa: 1000 }] },
  "Tripura": { spiceB: 10, cats: [{ moa: 100, aoa: 150 }, { moa: 100, aoa: 150 }, { moa: 100, aoa: 150 }, { moa: 100, aoa: 150 }, { moa: 100, aoa: 150 }] },
  "Uttar Pradesh": { spiceB: 10, cats: [{ moa: 500, aoa: 500 }, { moa: 500, aoa: 500 }, { moa: 500, aoa: 500 }, { moa: 0, aoa: 0 }, { moa: 500, aoa: 500 }] },
  "Uttarakhand": { spiceB: 10, cats: [{ moa: 500, aoa: 500 }, { moa: 500, aoa: 500 }, { moa: 500, aoa: 500 }, { moa: 0, aoa: 0 }, { moa: 500, aoa: 500 }] },
  "West Bengal": { spiceB: 10, cats: [{ moa: 0, aoa: 0 }, { moa: 0, aoa: 0 }, { moa: 60, aoa: 300 }, { moa: 60, aoa: 300 }, { moa: 60, aoa: 300 }] },
};

/** The wizard's state selector uses trimmed names and one merged UT; map them
 *  onto the dataset keys. Anything unmatched falls through to a nil lookup. */
const STATE_ALIASES: Record<string, string> = {
  // The two UTs were merged in 2020; the dataset keeps the pre-merger rows, so
  // fall back to the Daman & Diu figures for the combined selector option.
  "Dadra and Nagar Haveli and Daman and Diu": "Daman and Diu",
};

function stampRowFor(state: string): StampRow | undefined {
  const name = (state ?? "").trim();
  return STAMP_DUTY[name] ?? STAMP_DUTY[STATE_ALIASES[name]];
}

/* ------------------------------------------------------------------ *
 * National MCA registration fees (Companies (Registration Offices and
 * Fees) Rules, 2014). Same in every state.
 * ------------------------------------------------------------------ */

export type McaFeeInput = {
  /** False only for a company limited by guarantee without share capital. */
  hasCapital: boolean;
  authorisedCapital: number;
  /** Used only for the no-share-capital (members) fee path. */
  members: number;
  /** Number of directors — drives DIN application fee (₹500 each) and DSC (₹1,500 each). */
  directors?: number;
  /** OPC or Small Company — unlocks the concessional MoA fee slab. */
  opcSmall: boolean;
  section8: boolean;
  state: string;
};

/** MoA Registration Fee — precedence: no-capital (members) > ≤₹15L waiver >
 *  OPC/Small concessional slab > standard tiered slab. */
function moaRegistrationFee(i: McaFeeInput): number {
  const cap = i.authorisedCapital;

  if (!i.hasCapital) {
    // Table I(II): members-based, capped at ₹10,000.
    if (i.members < 21) return 0;
    if (i.members <= 200) return 5000;
    return Math.min(5000 + (i.members - 200) * 10, 10000);
  }

  // Companies with authorised capital up to ₹15 lakh pay no MoA registration fee.
  if (cap <= 1500000) return 0;

  if (i.opcSmall) {
    // Concessional: ₹2,000 base + ₹200 per ₹10,000 above ₹10 lakh.
    return cap <= 1000000 ? 0 : 2000 + Math.round(((cap - 1000000) * 200) / 10000);
  }

  // Standard tiered slab: ₹5,000 base + banded additional, capped at ₹2.5 crore.
  const t1 = Math.ceil(Math.max(Math.min(cap, 500000) - 100000, 0) / 10000) * 400;
  const t2 = Math.ceil(Math.max(Math.min(cap, 5000000) - 500000, 0) / 10000) * 300;
  const t3 = Math.ceil(Math.max(Math.min(cap, 10000000) - 5000000, 0) / 10000) * 100;
  const t4 = Math.ceil(Math.max(cap - 10000000, 0) / 10000) * 75;
  const additional = Math.min(t1 + t2 + t3 + t4, 25000000);
  return 5000 + additional;
}

/** Generic MCA document-filing fee band by authorised capital. */
function aoaBand(cap: number): number {
  if (cap < 100000) return 200;
  if (cap < 500000) return 300;
  if (cap < 2500000) return 400;
  if (cap < 10000000) return 500;
  return 600;
}

/** AoA Registration Fee — same for OPC and non-OPC; ≤₹15L is waived. */
function aoaRegistrationFee(i: McaFeeInput): number {
  const cap = i.authorisedCapital;
  if (!i.hasCapital) return i.members < 21 ? 0 : 200;
  if (cap <= 1500000) return 0;
  return aoaBand(cap);
}

/** 1-based stamp-duty category, matching the source workbook. */
function stampCategoryIndex(i: McaFeeInput): number {
  if (i.opcSmall) return 0;
  if (i.hasCapital) return i.section8 ? 1 : 2;
  return i.section8 ? 3 : 4;
}

export type McaStatutoryResult = {
  lines: StatutoryLine[];
  total: number;
  /** False when the state isn't in the dataset — stamp duty shown as ₹0. */
  stateKnown: boolean;
};

const PAN_TAN_FEE = 143;

/** Full itemised MCA government-fee breakdown for a SPICe+ incorporation. */
export function computeMcaStatutoryFees(input: McaFeeInput): McaStatutoryResult {
  const row = stampRowFor(input.state);
  const cat = row?.cats[stampCategoryIndex(input)];
  const stampMoa = cat ? cat.moa : 0;
  const stampAoa = cat ? Math.round(typeof cat.aoa === "function" ? cat.aoa(input.authorisedCapital) : cat.aoa) : 0;
  const spiceB = row ? row.spiceB : 0;

  const numDir = Math.max(1, input.directors ?? 2);
  const dinFee = 500 * numDir; // ₹500 per director (DIN Application Fee)
  const dscFee = 1500 * numDir; // ₹1,500 per director (DSC, 2-yr validity)

  const lines: StatutoryLine[] = [
    { label: "MoA Registration Fee", amount: moaRegistrationFee(input) },
    { label: "AoA Registration Fee", amount: aoaRegistrationFee(input) },
    { label: "PAN & TAN Fee", amount: PAN_TAN_FEE },
    { label: "DIN Application Fee", amount: dinFee },
    { label: "Digital Signature Certificate (DSC)", amount: dscFee },
    { label: "Stamp Duty — MoA", amount: stampMoa },
    { label: "Stamp Duty — AoA", amount: stampAoa },
    { label: "Stamp Duty — SPICe+ Part B", amount: spiceB },
  ];
  return { lines, total: lines.reduce((s, l) => s + l.amount, 0), stateKnown: !!row };
}

/* ------------------------------------------------------------------ *
 * LLP incorporation (FiLLiP) statutory fees.
 * ------------------------------------------------------------------ */

/** FiLLiP filing fee by total partner contribution. */
export function fillipFee(contribution: number): number {
  if (contribution <= 100000) return 500;
  if (contribution <= 500000) return 2000;
  if (contribution <= 1000000) return 4000;
  if (contribution <= 2500000) return 5000;
  if (contribution <= 10000000) return 10000;
  return 25000;
}

export function computeLlpStatutoryFees(
  contribution: number,
  partners: number = 2
): { lines: StatutoryLine[]; total: number } {
  const numPartners = Math.max(1, partners);
  const dscFee = 1500 * numPartners; // ₹1,500 per partner (DSC, 2-yr validity)

  const lines: StatutoryLine[] = [
    { label: "FiLLiP Filing Fee", amount: fillipFee(contribution) },
    { label: "Name Reservation (RUN-LLP)", amount: 200 },
    { label: "PAN & TAN Fee", amount: PAN_TAN_FEE },
    { label: "Digital Signature Certificate (DSC)", amount: dscFee },
  ];
  return { lines, total: lines.reduce((s, l) => s + l.amount, 0) };
}

/* ------------------------------------------------------------------ *
 * Combine professional + statutory fees and apply GST.
 * ------------------------------------------------------------------ */

export type CombinedFees = {
  lines: StatutoryLine[];
  total: number;
  /** GST is 18% of the professional fee (statutory fees are exempt from GST). */
  gst: number;
};

/**
 * Build the full fee stack: professional fee (if any), the itemised statutory
 * fees, and a single GST line at 18% of the professional fee only.
 */
export function withProfessionalAndGst(
  professional: number,
  statutory: StatutoryLine[],
  customLines?: StatutoryLine[],
): CombinedFees {
  const lines: StatutoryLine[] = [];
  let taxableProfessionalAmount = 0;

  if (customLines && customLines.length > 0) {
    const validCustom = customLines.filter((l) => l.label && l.amount > 0);
    lines.push(...validCustom);
    taxableProfessionalAmount = validCustom.reduce((s, l) => s + l.amount, 0);
  } else if (professional > 0) {
    lines.push({ label: "Professional Fee", amount: professional });
    taxableProfessionalAmount = professional;
  }

  lines.push(...statutory);

  const nonGstTotal = lines.reduce((s, l) => s + l.amount, 0);
  const gst = Math.round((taxableProfessionalAmount * GST_RATE) / 100);

  if (gst > 0) {
    lines.push({ label: `GST @ ${GST_RATE}%`, amount: gst });
  }

  return { lines, total: nonGstTotal + gst, gst };
}


/* ------------------------------------------------------------------ *
 * Fee context — the minimal, authoritative set of inputs the fee for a
 * request depends on. The estimate endpoint and the submission handler
 * both build one of these (never trusting a client-sent fee amount) and
 * run it through `computeFees`.
 * ------------------------------------------------------------------ */

export type CompanyFeeContext = {
  kind: "company";
  /** Short entity key (pvt, opc, sec8, …) — only `sec8` changes the fee here. */
  entity: string;
  entityClass?: "private" | "public" | null;
  /**
   * How the company's liability is limited. "guarantee" means a company limited
   * by guarantee WITHOUT share capital — the fee then follows the members-based
   * (Table I(II)) path instead of the authorised-capital slabs. Defaults to
   * "shares" (limited by shares) when absent.
   */
  liability?: "shares" | "guarantee" | null;
  capital: number;
  /** Paid-up capital — drives the automatic small-company determination. */
  paidCapital: number;
  /** Number of members — used only on the no-share-capital (guarantee) path. */
  members?: number;
  /** Number of directors — drives DIN application fee (₹500 each) and DSC (₹1,500 each). */
  directors?: number;
  state: string;
};

export type LlpFeeContext = {
  kind: "llp";
  contribution: number;
  /** Number of partners — drives DSC fee (₹1,500 each). */
  partners?: number;
  /** Indian LLP (FiLLiP) vs Foreign LLP (FC) — selects the per-type catalog row. */
  jurisdiction?: "indian" | "foreign";
};

export type FeeContext = CompanyFeeContext | LlpFeeContext;

export type ComputedFees = CombinedFees & {
  stateKnown: boolean;
  /** Company only: whether the concessional small-company MoA slab was applied. */
  smallCompany?: boolean;
};

/**
 * Automatic OPC / Small Company determination (Companies Act 2013 §2(85)):
 * an OPC always qualifies; public companies and Producer/Foreign companies never
 * do; Section 8 is excluded from the definition. Any other private company
 * qualifies while its paid-up capital stays within the ₹4 crore small-company
 * ceiling (turnover, the other limb of the test, is nil at incorporation). This
 * only changes the fee once authorised capital exceeds ₹15 lakh.
 */
export function deriveOpcSmall(ctx: CompanyFeeContext): boolean {
  if (ctx.entity === "opc") return true;
  // A company limited by guarantee (no share capital) follows the members-based
  // fee/stamp path and is never treated as an OPC/Small Company — mirrors the
  // workbook, where selecting "no authorised capital" forces OPC/Small = No.
  if (ctx.liability === "guarantee") return false;
  if (ctx.entity === "public" || ctx.entity === "producer" || ctx.entity === "foreign") return false;
  if (ctx.entityClass === "public") return false;
  if (ctx.entity === "sec8") return false;
  return ctx.paidCapital <= 40000000;
}

/** Compute the full customer-facing fee stack for a fee context. */
export function computeFees(
  ctx: FeeContext,
  professionalFee: number,
  customLines?: StatutoryLine[],
): ComputedFees {
  if (ctx.kind === "llp") {
    const s = computeLlpStatutoryFees(ctx.contribution, ctx.partners);
    return { ...withProfessionalAndGst(professionalFee, s.lines, customLines), stateKnown: true };
  }
  const opcSmall = deriveOpcSmall(ctx);
  // A company limited by guarantee has no share capital: the fee is driven by the
  // number of members (Table I(II)) and authorised capital is treated as nil.
  const hasCapital = ctx.liability !== "guarantee";
  const s = computeMcaStatutoryFees({
    hasCapital,
    authorisedCapital: hasCapital ? ctx.capital : 0,
    members: ctx.members ?? 0,
    directors: ctx.directors ?? (ctx.entity === "opc" ? 1 : 2),
    opcSmall,
    section8: ctx.entity === "sec8",
    state: ctx.state,
  });
  return {
    ...withProfessionalAndGst(professionalFee, s.lines, customLines),
    stateKnown: s.stateKnown,
    smallCompany: opcSmall,
  };
}

/** Validate + normalise an untrusted `{ kind, ... }` blob into a FeeContext. */
export function parseFeeContext(raw: any): FeeContext | null {
  if (!raw || typeof raw !== "object") return null;
  if (raw.kind === "llp") {
    const contribution = Number(raw.contribution);
    if (!Number.isFinite(contribution) || contribution < 0) return null;
    // Jurisdiction only selects the professional-fee row (Indian vs Foreign); the
    // statutory formula is the same for both. Default to Indian.
    const jurisdiction = raw.jurisdiction === "foreign" ? "foreign" : "indian";
    let partners = Number(raw.partners ?? raw.directors);
    if (!Number.isFinite(partners) || partners <= 0) partners = 2;
    return { kind: "llp", contribution, jurisdiction, partners: Math.floor(partners) };
  }
  if (raw.kind === "company") {
    const capital = Number(raw.capital);
    if (!Number.isFinite(capital) || capital < 0) return null;
    // Paid-up drives the small-company test; default to authorised capital when
    // the client didn't send it (paid-up can never exceed authorised).
    let paidCapital = Number(raw.paidCapital);
    if (!Number.isFinite(paidCapital) || paidCapital < 0) paidCapital = capital;
    const entityClass =
      raw.entityClass === "public" ? "public" : raw.entityClass === "private" ? "private" : null;
    const liability = raw.liability === "guarantee" ? "guarantee" : raw.liability === "shares" ? "shares" : null;
    let members = Number(raw.members);
    if (!Number.isFinite(members) || members < 0) members = 0;
    let directors = Number(raw.directors);
    if (!Number.isFinite(directors) || directors <= 0) {
      directors = raw.entity === "opc" ? 1 : raw.entity === "public" ? 3 : 2;
    }
    return {
      kind: "company",
      entity: typeof raw.entity === "string" ? raw.entity : "",
      entityClass,
      liability,
      capital,
      paidCapital,
      members: Math.floor(members),
      directors: Math.floor(directors),
      state: typeof raw.state === "string" ? raw.state : "",
    };
  }
  return null;
}
