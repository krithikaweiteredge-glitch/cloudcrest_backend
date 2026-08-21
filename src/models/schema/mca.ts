import { pgTable, bigserial, varchar, text, index } from "drizzle-orm/pg-core";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";

/**
 * MCA COMPANY REGISTRY INDEX.
 *
 * A local, de-duplicated index of companies/LLPs/foreign companies registered
 * with India's Ministry of Corporate Affairs, built from the year-wise MCA
 * incorporation datasets (FY 2016-17 … 2026-27). It replaces the external
 * RocketReach lookup in the home-page name-availability check: the check now
 * answers "does a company with this name already exist?" from this table.
 *
 * `coreNorm` is the search key — the company name lowercased, stripped of its
 * legal suffix (Private Limited / LLP / Limited …) and reduced to alphanumerics.
 * Two proposed names collide when their `coreNorm` matches, which is how the MCA
 * treats same-brand-different-suffix names ("Acme Tech Pvt Ltd" vs "Acme Tech
 * LLP"). It is indexed for fast equality lookup.
 *
 * Kept intentionally lean (no address/email/activity) so the full ~1.9M-row
 * index fits within the managed Postgres storage cap.
 */
export const mcaCompanies = pgTable(
  "mca_companies",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    // CIN / LLPIN / FCIN as issued by the MCA (may be blank for a few rows).
    identifier: varchar("identifier", { length: 40 }),
    // Full legal name exactly as registered.
    name: text("name").notNull(),
    // 'indian' | 'llp' | 'foreign'.
    kind: varchar("kind", { length: 10 }).notNull(),
    // 'Private' | 'Public' | 'LLP' | 'Foreign' (best-effort from the source).
    klass: varchar("klass", { length: 60 }),
    // e.g. "Non-government company" (Indian companies only; blank otherwise).
    companyType: varchar("company_type", { length: 80 }),
    // Registration/incorporation date as printed in the source (formats vary).
    regDate: varchar("reg_date", { length: 40 }),
    // Search key: normalized brand name (lowercase alnum, legal suffix stripped).
    coreNorm: varchar("core_norm", { length: 255 }).notNull(),
  },
  (t) => ({
    coreNormIdx: index("mca_companies_core_norm_idx").on(t.coreNorm),
  }),
);

export type McaCompany = InferSelectModel<typeof mcaCompanies>;
export type NewMcaCompany = InferInsertModel<typeof mcaCompanies>;

/**
 * MCA STRUCK-OFF INDEX — companies/LLPs removed from the register (Master
 * Struck-Off dataset). A struck-off entity can be restored within 20 years
 * (Companies Act s.252), so its name stays restricted for reuse; the name check
 * reports a match here as unavailable with a "struck off" note. Same `coreNorm`
 * brand key + index as `mcaCompanies`.
 */
export const mcaStruckOff = pgTable(
  "mca_struck_off",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    identifier: varchar("identifier", { length: 40 }),
    name: text("name").notNull(),
    // 'company' | 'llp'.
    kind: varchar("kind", { length: 10 }).notNull(),
    // Month the strike-off was reported (as printed in the source).
    month: varchar("month", { length: 30 }),
    coreNorm: varchar("core_norm", { length: 255 }).notNull(),
  },
  (t) => ({
    coreNormIdx: index("mca_struck_off_core_norm_idx").on(t.coreNorm),
  }),
);

export type McaStruckOff = InferSelectModel<typeof mcaStruckOff>;
export type NewMcaStruckOff = InferInsertModel<typeof mcaStruckOff>;
