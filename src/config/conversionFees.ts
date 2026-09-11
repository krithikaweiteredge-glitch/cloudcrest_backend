/**
 * Government-fee rules for the Business Conversion services — source: the
 * client's "Fee for conversions" document.
 *
 * The conversion's fee stack is:
 *
 *   1. its catalog fee lines, exactly as the admin authored them (Professional
 *      Fee, Newspaper Advertisement Cost, GST — the document fixes GST at ₹1,340,
 *      so it is an authored line, not computed here);
 *   2. the government fee computed below from what the applicant entered.
 *
 * Three bases, per the document:
 *
 *   - forms   — every listed ROC form is charged the authorised-capital filing
 *               slab (₹200 … ₹600), e.g. MGT-14 + INC-27 for Pvt → Public.
 *   - company — the new-company (SPICe+) registration fees, as the Company
 *               wizard charges them: MoA/AoA, PAN/TAN, DIN, DSC, stamp duty.
 *   - llp     — the new-LLP (FiLLiP) registration fees, as the LLP wizard
 *               charges them, DSC included.
 *
 * A conversion not listed here (Proprietorship → Pvt) has no computed
 * government fee — it is priced by its catalog row alone.
 */
import {
  aoaBand,
  companyStatutoryFees,
  computeLlpStatutoryFees,
  type ConversionFeeContext,
  type StatutoryLine,
} from "./statutoryFees.js";

export type ConversionGovtFee =
  | { basis: "forms"; forms: string[] }
  | { basis: "company" }
  | { basis: "llp" };

export const CONVERSION_GOVT_FEES: Record<string, ConversionGovtFee> = {
  "conversion-pvt-to-public": { basis: "forms", forms: ["MGT-14", "INC-27"] },
  "conversion-opc-to-pvt": { basis: "forms", forms: ["DIR-12", "PAS-3", "MGT-14", "SH-7"] },
  "conversion-pvt-to-opc": { basis: "forms", forms: ["DIR-12", "PAS-3", "MGT-14", "SH-4"] },
  "conversion-public-to-pvt": { basis: "forms", forms: ["MGT-14", "RD-1", "INC-28", "INC-27"] },
  "conversion-llp-to-pvt": { basis: "company" },
  "conversion-partnership-to-pvt": { basis: "company" },
  "conversion-partnership-to-llp": { basis: "llp" },
};

/** The computed government-fee lines for a conversion. */
export function conversionStatutoryFees(ctx: ConversionFeeContext): {
  lines: StatutoryLine[];
  stateKnown: boolean;
} {
  const rule = CONVERSION_GOVT_FEES[ctx.slug];
  if (!rule) return { lines: [], stateKnown: true };

  if (rule.basis === "forms") {
    // No capital entered yet → no slab to quote; the catalog lines still show.
    if (ctx.capital <= 0) return { lines: [], stateKnown: true };
    const fee = aoaBand(ctx.capital);
    return {
      lines: rule.forms.map((form) => ({ label: `Govt Fee — Form ${form}`, amount: fee })),
      stateKnown: true,
    };
  }

  if (rule.basis === "llp") {
    if (ctx.contribution <= 0) return { lines: [], stateKnown: true };
    return { lines: computeLlpStatutoryFees(ctx.contribution, ctx.partners).lines, stateKnown: true };
  }

  if (ctx.capital <= 0) return { lines: [], stateKnown: true };
  const s = companyStatutoryFees({
    kind: "company",
    entity: "pvt",
    entityClass: "private",
    capital: ctx.capital,
    paidCapital: Math.min(ctx.paidCapital, ctx.capital),
    directors: ctx.directors,
    state: ctx.state,
  });
  return { lines: s.lines, stateKnown: s.stateKnown };
}
