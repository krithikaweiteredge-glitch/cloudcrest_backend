import { Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { services } from "../models/schema.js";
import { AuthenticatedRequest } from "../middlewares/authMiddleware.js";
import {
  computeFees,
  parseFeeContext,
  type FeeContext,
  type ComputedFees,
  type ConversionFeeContext,
  type StatutoryLine,
} from "../config/statutoryFees.js";
import { conversionStatutoryFees } from "../config/conversionFees.js";

/** The catalog slugs to try, in priority order, for a fee context's professional fee. */
export function slugsForContext(ctx: FeeContext): string[] {
  if (ctx.kind === "conversion") return [ctx.slug];
  if (ctx.kind === "llp") {
    // Indian vs Foreign LLP carry different professional fees, priced on their own
    // rows; fall back to the base `llp` row if a per-type row isn't set up yet.
    const typeSlug = ctx.jurisdiction === "foreign" ? "llp-foreign" : "llp-indian";
    return [typeSlug, "llp"];
  }
  return [`company-${ctx.entity}`, "company"];
}

/**
 * Resolve the professional fee for a set of slugs from the catalog. The catalog
 * is the single source of truth — there is no hardcoded fallback, so an unpriced
 * service returns ₹0 (`fromCatalog: false`) rather than a stale figure that could
 * silently mask a misconfigured price.
 */
export async function professionalFeeForSlugs(
  slugs: string[],
): Promise<{ fee: number; customLines?: { label: string; amount: number }[]; fromCatalog: boolean }> {
  for (const slug of slugs) {
    if (!slug) continue;
    const [row] = await db
      .select({ professionalFee: services.professionalFee, feeLines: services.feeLines })
      .from(services)
      .where(eq(services.slug, slug))
      .limit(1);
    if (row && row.professionalFee != null) {
      const n = Number(row.professionalFee);
      if (Number.isFinite(n)) {
        let customLines: { label: string; amount: number }[] | undefined;
        if (row.feeLines) {
          try {
            const parsed = JSON.parse(row.feeLines);
            if (Array.isArray(parsed) && parsed.length > 0) {
              customLines = parsed
                .filter((l: any) => l.label && String(l.label).trim())
                .map((l: any) => ({ label: String(l.label).trim(), amount: Number(l.amount) || 0 }));
            }
          } catch {
            /* ignore */
          }
        }
        return { fee: n, customLines, fromCatalog: true };
      }
    }
  }
  return { fee: 0, fromCatalog: false };
}

/**
 * A conversion's fee stack: the catalog row's fee lines as authored (the admin
 * owns every amount on them, GST included), followed by the government fee the
 * backend computes from the application. A row with no fee lines falls back to
 * its professional / govt / GST% columns, as the catalog pricing does elsewhere.
 */
async function resolveConversionFees(
  ctx: ConversionFeeContext,
): Promise<ComputedFees & { fromCatalog: boolean }> {
  const [row] = await db
    .select({
      professionalFee: services.professionalFee,
      govtFee: services.govtFee,
      gstPercent: services.gstPercent,
      feeLines: services.feeLines,
    })
    .from(services)
    .where(eq(services.slug, ctx.slug))
    .limit(1);

  let catalogLines: StatutoryLine[] = [];
  let gst = 0;
  if (row) {
    let authored: StatutoryLine[] = [];
    try {
      const parsed = row.feeLines ? JSON.parse(row.feeLines) : [];
      if (Array.isArray(parsed)) {
        authored = parsed
          .filter((l: any) => l && l.label && String(l.label).trim())
          .map((l: any) => ({ label: String(l.label).trim(), amount: Number(l.amount) || 0 }));
      }
    } catch {
      /* malformed — fall back to the columns */
    }
    if (authored.length > 0) {
      catalogLines = authored;
      gst = authored.filter((l) => /\bgst\b/i.test(l.label)).reduce((s, l) => s + l.amount, 0);
    } else {
      const professional = Number(row.professionalFee) || 0;
      const govt = Number(row.govtFee) || 0;
      const gstPercent = Number(row.gstPercent) || 0;
      gst = Math.round((professional * gstPercent) / 100);
      catalogLines = [
        { label: "Professional Fee", amount: professional },
        { label: "Government Fee", amount: govt },
        { label: `GST @ ${gstPercent}% (on professional fee)`, amount: gst },
      ].filter((l) => l.amount > 0);
    }
  }

  const statutory = conversionStatutoryFees(ctx);
  const lines = [...catalogLines, ...statutory.lines];
  return {
    lines,
    total: lines.reduce((s, l) => s + l.amount, 0),
    gst,
    stateKnown: statutory.stateKnown,
    fromCatalog: catalogLines.length > 0,
  };
}

/**
 * Compute the authoritative fee breakdown for a fee context, resolving the
 * professional fee from the catalog. Shared by the estimate endpoint and the
 * submission handler so both produce identical figures.
 */
export async function resolveRequestFees(
  ctx: FeeContext,
): Promise<ComputedFees & { fromCatalog: boolean }> {
  if (ctx.kind === "conversion") return resolveConversionFees(ctx);
  const { fee, customLines, fromCatalog } = await professionalFeeForSlugs(slugsForContext(ctx));
  return { ...computeFees(ctx, fee, customLines), fromCatalog };
}

/**
 * POST /api/fees/estimate — live fee breakdown for the wizards. Auth-gated
 * because the response includes the professional fee, which is withheld from
 * signed-out visitors.
 */
export async function estimateFees(req: AuthenticatedRequest, res: Response) {
  try {
    const ctx = parseFeeContext(req.body);
    if (!ctx) return res.status(400).json({ error: "Invalid or missing fee context" });

    const result = await resolveRequestFees(ctx);
    return res.status(200).json({
      lines: result.lines,
      total: result.total,
      gst: result.gst,
      stateKnown: result.stateKnown,
      fromCatalog: result.fromCatalog,
      smallCompany: result.smallCompany,
    });
  } catch (error: any) {
    console.error("Estimate fees error:", error);
    return res.status(500).json({ error: "Failed to estimate fees" });
  }
}
