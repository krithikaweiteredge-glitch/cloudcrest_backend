-- MCA struck-off companies + LLPs index, used by the name-availability check
-- (POST /api/mca/name-check) to flag names that belong to a struck-off entity as
-- unavailable (restorable within 20 years, so still restricted). Populated by
-- src/scripts/seed-struck-off.mjs.
CREATE TABLE IF NOT EXISTS "mca_struck_off" (
  "id" bigserial PRIMARY KEY,
  "identifier" varchar(40),
  "name" text NOT NULL,
  "kind" varchar(10) NOT NULL,
  "month" varchar(30),
  "core_norm" varchar(255) NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mca_struck_off_core_norm_idx" ON "mca_struck_off" ("core_norm");
