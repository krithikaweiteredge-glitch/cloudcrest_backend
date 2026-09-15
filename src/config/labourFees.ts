/**
 * Government-fee slabs for the Labour Licence (Shops & Establishments
 * registration) — source: the client's "Labour license" document.
 *
 * A labour licence's fee stack is:
 *
 *   1. its state row's catalog fee lines, as the admin authored them
 *      (Professional Fee ₹2,499, GST ₹450 — see config/labourCatalog);
 *   2. the state's registration fee below, on the total persons employed.
 *
 * The document gives the third table without a state heading directly above it
 * (its "Karnataka" label follows the table); it is read as Karnataka's, being
 * the only state left.
 */
import type { LabourFeeContext, StatutoryLine } from "./statutoryFees.js";

/** `upTo` is the inclusive upper bound of employees for the slab; the last slab has none. */
type Slab = { upTo?: number; fee: number };

const TELANGANA: Slab[] = [
  { upTo: 0, fee: 100 },
  { upTo: 5, fee: 500 },
  { upTo: 10, fee: 1000 },
  { upTo: 20, fee: 2000 },
  { upTo: 50, fee: 5000 },
  { upTo: 100, fee: 10000 },
];

const ANDHRA_PRADESH: Slab[] = [
  { upTo: 0, fee: 30 },
  { upTo: 5, fee: 100 },
  { upTo: 10, fee: 200 },
  { upTo: 20, fee: 350 },
  { upTo: 50, fee: 1000 },
  { upTo: 100, fee: 2000 },
  { fee: 2500 },
];

const KARNATAKA: Slab[] = [
  { upTo: 0, fee: 405 },
  { upTo: 9, fee: 810 },
  { upTo: 19, fee: 5400 },
  { upTo: 49, fee: 13500 },
  { upTo: 99, fee: 27000 },
  { upTo: 250, fee: 54000 },
  { upTo: 500, fee: 67500 },
  { upTo: 1000, fee: 94500 },
  { fee: 101250 },
];

const fromSlabs = (slabs: Slab[], employees: number): number | null =>
  slabs.find((s) => s.upTo === undefined || employees <= s.upTo)?.fee ?? null;

/** The state's registration fee for a head count, or null for a state with no slabs on file. */
export function labourRegistrationFee(state: string, employees: number): number | null {
  const n = Math.max(0, Math.floor(employees));
  switch (state.trim().toLowerCase()) {
    case "telangana":
      // 101 and above: ₹10,000 + ₹5,000 for every additional 50 persons (or part).
      return n <= 100 ? fromSlabs(TELANGANA, n) : 10000 + Math.ceil((n - 100) / 50) * 5000;
    case "andhra pradesh":
      return fromSlabs(ANDHRA_PRADESH, n);
    case "karnataka":
      return fromSlabs(KARNATAKA, n);
    default:
      return null;
  }
}

/** The computed government-fee line for a labour licence application. */
export function labourStatutoryFees(ctx: LabourFeeContext): { lines: StatutoryLine[]; stateKnown: boolean } {
  const fee = labourRegistrationFee(ctx.state, ctx.employees);
  if (fee == null) return { lines: [], stateKnown: false };
  const persons = ctx.employees === 1 ? "1 person" : `${ctx.employees} persons`;
  return {
    lines: [{ label: `Govt Fee — ${ctx.state.trim()} Registration (${persons} employed)`, amount: fee }],
    stateKnown: true,
  };
}
