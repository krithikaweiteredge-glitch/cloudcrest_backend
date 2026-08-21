-- Local MCA company registry index, used by the home-page name-availability
-- check (POST /api/mca/name-check) in place of the external RocketReach lookup.
-- Populated from the year-wise MCA incorporation datasets by
-- src/scripts/seed-mca-companies.mjs (which also creates this table if run first).
CREATE TABLE IF NOT EXISTS "mca_companies" (
  "id" bigserial PRIMARY KEY,
  "identifier" varchar(40),
  "name" text NOT NULL,
  "kind" varchar(10) NOT NULL,
  "klass" varchar(60),
  "company_type" varchar(80),
  "reg_date" varchar(40),
  "core_norm" varchar(255) NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mca_companies_core_norm_idx" ON "mca_companies" ("core_norm");
