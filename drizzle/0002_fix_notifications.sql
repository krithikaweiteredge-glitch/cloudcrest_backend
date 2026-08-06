-- Align the notifications table with the canonical model
-- (src/models/schema/notifications.ts) that the app actually queries.
-- The 0000 baseline built the old utility.ts shape (is_read boolean, user_id
-- NOT NULL, no type/link_url/created_at), which made GET /api/notifications 500.
ALTER TABLE "notifications" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "type" varchar(50) DEFAULT 'broadcast' NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "link_url" varchar(550);--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "is_read" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "is_read" SET DATA TYPE varchar(10) USING (CASE WHEN "is_read" THEN 'true' ELSE 'false' END);--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "is_read" SET DEFAULT 'false';
