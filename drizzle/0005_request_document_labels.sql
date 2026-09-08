-- Persist the exact required-document heading each uploaded file was filed
-- against, so the "uploaded vs pending" checklist in the customer's
-- registration view and the admin registration view is matched by identity
-- instead of being guessed from the file name.
ALTER TABLE "request_documents" ADD COLUMN "doc_label" varchar(512);--> statement-breakpoint
-- Backfill from the historic "Label :: filename" naming convention.
UPDATE "request_documents"
   SET "doc_label" = btrim(split_part("name", ' :: ', 1))
 WHERE "doc_label" IS NULL
   AND "name" LIKE '% :: %';
