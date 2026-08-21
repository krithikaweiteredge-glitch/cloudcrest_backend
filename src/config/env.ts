import * as dotenv from "dotenv";

dotenv.config();

/**
 * Validated environment. Importing this module is the single place env is read;
 * anything missing or unsafe fails the process at boot rather than surfacing as
 * a confusing runtime error (or, worse, a silent insecure default) later.
 */

export const isProd =
  process.env.NODE_ENV === "production" || !!process.env.VERCEL;

function required(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(
      `Missing required environment variable: ${name}. Set it in your environment or .env file.`,
    );
  }
  return value;
}

// In production a strong JWT secret is mandatory. In development we still refuse
// to boot without one — but with a clear message — so the old hardcoded fallback
// can never ship.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || !JWT_SECRET.trim()) {
  throw new Error(
    "JWT_SECRET is not set. Generate one (e.g. `openssl rand -base64 48`) and add it to your .env.",
  );
}
if (isProd && JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET is too short for production; use at least 32 characters.");
}

export const env = {
  isProd,
  port: Number(process.env.PORT) || 5000,
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: JWT_SECRET,
  // Comma-separated allowlist of browser origins. Empty in dev means "reflect any
  // localhost origin"; in production it must be set explicitly. Trailing slashes
  // are stripped so `https://app.com/` still matches the browser's `https://app.com`.
  corsOrigins: (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean),
};
