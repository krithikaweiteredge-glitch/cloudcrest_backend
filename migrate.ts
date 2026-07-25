import { db } from "./src/config/db.js";
import { sql } from "drizzle-orm";

async function migrate() {
  // Create roles table if it doesn't exist
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "roles" (
      "id" BIGSERIAL PRIMARY KEY,
      "name" VARCHAR(255) NOT NULL,
      "description" TEXT
    );
  `);

  // Create users table if it doesn't exist
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "users" (
      "id" BIGSERIAL PRIMARY KEY,
      "role_id" BIGINT REFERENCES "roles"("id"),
      "first_name" VARCHAR(255) NOT NULL,
      "last_name" VARCHAR(255),
      "email" VARCHAR(255) NOT NULL UNIQUE,
      "phone" VARCHAR(50),
      "password_hash" VARCHAR(255) NOT NULL,
      "status" VARCHAR(50) DEFAULT 'active',
      "created_at" TIMESTAMP NOT NULL DEFAULT now()
    );
  `);

  console.log("✅ Migration complete – tables ensured.");
  process.exit(0);
}

migrate().catch((e) => {
  console.error("⚠️ Migration failed:", e);
  process.exit(1);
});
