/**
 * Catalog content for the Trade Licence — source: the client's "Trade License"
 * document.
 *
 * Registered state-wise like the Labour Licence: the applicant picks Telangana,
 * Andhra Pradesh or Karnataka, and each state is its own inactive
 * `trade-licence-<state>` row nested under `trade-licence` in Admin → Services.
 * `scripts/backfill-trade-licence.ts` creates those rows and writes what is
 * below; the admin edits them from then on.
 *
 * Fees: the document's Professional Fee and GST are the row's fee lines. Its
 * Govt Fee is the premises area times a per-sq.ft. rate set by the road width
 * the premises fronts. Those rates are admin content too — stored on the state
 * row's `wizard_rules` as `{ roadWidthRates: { single, double, multiple, star } }`
 * and edited in Admin → Services — so the backend reads them per application
 * (see config/tradeLicenceFees). `TRADE_LICENCE_DEFAULT_RATES` is the
 * document's table, used when a row has none saved.
 */

export type RoadWidthKey = "single" | "double" | "multiple" | "star";

/** The road-width options, in the document's order. Mirrored in the frontend wizard. */
export const ROAD_WIDTHS: { key: RoadWidthKey; label: string }[] = [
  { key: "single", label: "Single Lane (upto 20 ft)" },
  { key: "double", label: "Double Lane (upto 30 ft)" },
  { key: "multiple", label: "Multiple Lane (>30 ft)" },
  { key: "star", label: "Star Hotels / Corporate Hospitals (>30 ft)" },
];

/** ₹ per sq.ft. by road width, from the document. */
export const TRADE_LICENCE_DEFAULT_RATES: Record<RoadWidthKey, number> = {
  single: 3,
  double: 4,
  multiple: 5,
  star: 6,
};

/** The row's saved rates, falling back per road width to the document's table. */
export function parseRoadWidthRates(wizardRules: string | null | undefined): Record<RoadWidthKey, number> {
  const rates = { ...TRADE_LICENCE_DEFAULT_RATES };
  try {
    const saved = wizardRules ? JSON.parse(wizardRules)?.roadWidthRates : null;
    if (saved && typeof saved === "object") {
      for (const { key } of ROAD_WIDTHS) {
        const n = Number(saved[key]);
        if (saved[key] !== undefined && saved[key] !== "" && Number.isFinite(n) && n >= 0) rates[key] = n;
      }
    }
  } catch {
    /* malformed — defaults */
  }
  return rates;
}

export type TradeLicenceStateEntry = {
  state: string;
  feeLines: { label: string; amount: number }[];
  documents: string[];
  description: string;
  whoCanApply: string;
};

const FEE_LINES = [
  { label: "Professional Fee", amount: 2499 },
  { label: "GST @ 18%", amount: 450 },
];

const DOCUMENTS = [
  "Identity Proof (Aadhaar for individuals / PAN or Incorporation Certificate for businesses)",
  "Lease Deed / Legal Occupancy Proof (Owner — Property Tax Receipt; Tenant — Owner Occupancy Certificate)",
];

const DESCRIPTION =
  "A Trade Licence is issued by the local municipal body and permits a business to carry on a specific trade or activity at its premises. " +
  "The municipal fee is charged on the area of the premises, at a per-square-foot rate set by the width of the road the premises fronts.";

const WHO_CAN_APPLY =
  "• Proprietors, partnership firms, LLPs and companies running a shop, office, establishment or other trade from premises within municipal limits.\n" +
  "• Owners and tenants of the premises alike — a tenant shows the owner's occupancy certificate.";

export const TRADE_LICENCE_BASE_SLUG = "trade-licence";

const entry = (state: string): TradeLicenceStateEntry => ({
  state,
  feeLines: FEE_LINES,
  documents: DOCUMENTS,
  description: DESCRIPTION,
  whoCanApply: WHO_CAN_APPLY,
});

export const TRADE_LICENCE_CATALOG: Record<string, TradeLicenceStateEntry> = {
  "trade-licence-telangana": entry("Telangana"),
  "trade-licence-andhra-pradesh": entry("Andhra Pradesh"),
  "trade-licence-karnataka": entry("Karnataka"),
};
