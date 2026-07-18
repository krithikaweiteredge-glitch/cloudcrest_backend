import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("WARNING: DATABASE_URL is not set in environment variables. Database connections will fail.");
}

// Create connection pool
export const pool = new pg.Pool({
  connectionString,
  ssl: connectionString?.includes("localhost") || connectionString?.includes("127.0.0.1") || !connectionString
    ? false
    : { rejectUnauthorized: false }, // Enabled for Neon/Supabase, disabled for local postgres
});

export const db = drizzle(pool);
