/**
 * Government-fee rules for the Business Closure services — source: the client's
 * "Fee and changes required in closures" document.
 *
 * A closure's fee stack is:
 *
 *   1. its catalog fee lines, exactly as the admin authored them (Professional
 *      Fee, GST — the document states it as a fixed amount — and the flat form
 *      fees: STK-2 ₹10,000, LLP Form 24 ₹3,000);
 *   2. the government fee computed below from what the applicant entered.
 *
 * The only computed fee is MGT-14, charged on the authorised-capital filing slab
 * (₹200 … ₹600) for the company closures that file it. Every other closure is
 * priced by its catalog row alone.
 */
import { aoaBand, type ClosureFeeContext, type StatutoryLine } from "./statutoryFees.js";

/** Closures that file MGT-14 and so are charged its authorised-capital slab. */
export const CLOSURE_MGT14_SLUGS = new Set(["closure-pvt", "closure-public", "closure-opc", "closure-nidhi"]);

/** The computed government-fee lines for a closure. */
export function closureStatutoryFees(ctx: ClosureFeeContext): StatutoryLine[] {
  // No capital entered yet → no slab to quote; the catalog lines still show.
  if (!CLOSURE_MGT14_SLUGS.has(ctx.slug) || ctx.capital <= 0) return [];
  return [{ label: "Form MGT-14 – Government Fee (on authorised capital)", amount: aoaBand(ctx.capital) }];
}
