/**
 * Govt Fee for the Trade Licence — source: the client's "Trade License"
 * document. The fee stack is:
 *
 *   1. the state row's catalog fee lines, as the admin authored them
 *      (Professional Fee ₹2,499, GST ₹450 — see config/tradeLicenceCatalog);
 *   2. the Govt Fee below: premises area × the row's per-sq.ft. rate for the
 *      road width.
 */
import type { StatutoryLine, TradeLicenceFeeContext } from "./statutoryFees.js";
import { ROAD_WIDTHS, type RoadWidthKey } from "./tradeLicenceCatalog.js";

/** The computed Govt Fee line — none until a road width and an area are given. */
export function tradeLicenceStatutoryFees(
  ctx: TradeLicenceFeeContext,
  rates: Record<RoadWidthKey, number>,
): { lines: StatutoryLine[]; stateKnown: boolean } {
  const width = ROAD_WIDTHS.find((w) => w.key === ctx.roadWidth);
  if (!width || ctx.area <= 0) return { lines: [], stateKnown: true };
  const rate = rates[width.key];
  return {
    lines: [
      {
        label: `Govt Fee — ${width.label} @ ₹${rate}/sq.ft. × ${ctx.area.toLocaleString("en-IN")} sq.ft.`,
        amount: Math.round(ctx.area * rate),
      },
    ],
    stateKnown: true,
  };
}
