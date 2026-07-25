# Cloudcrest CA Platform Backend

This is the standalone backend repository for the Cloudcrest CA Platform.

## Technology Stack
- **Runtime**: Node.js / tsx
- **Framework**: Express.js
- **Database ORM**: Drizzle ORM
- **PostgreSQL Driver**: Node-Postgres (`pg`)

## Running Locally
- Run `npm install`
- Start dev server: `npm run dev`
- Generate a migration after schema changes: `npm run db:generate`
- Apply migrations: `npm run db:migrate`
- Quick sync for local dev (no migration file): `npm run db:push`
- Seed initial roles / admin: `npm run db:seed`
- Seed the service catalog: `npm run db:seed:catalog`
- Drizzle Studio database GUI: `npm run db:studio`

## Architecture
- `src/server.ts` — Express app: helmet, CORS, JSON limit, routes, 404 + error handler.
- `src/config/env.ts` — the only place env is read; validates required vars at boot and fails fast.
- `src/config/db.ts` — Drizzle client and connection pool.
- `src/models/schema/*.ts` — the **authoritative** schema, split by domain and re-exported from `src/models/schema.ts`. The database is defined here and by the migrations in `drizzle/` — never by runtime `CREATE`/`ALTER TABLE` in a controller.
- `src/routes/*.ts` — one router per domain, mounted under `/api` in `src/routes/index.ts`.
- `src/controllers/*.ts` — request handlers.
- `src/middlewares/` — `authMiddleware`, `adminMiddleware`, `errorHandler`, `rateLimit`, `multer`.
- `src/utils/auth.ts` — password hashing and JWT session tokens.

## Conventions
- Auth/OTP endpoints are rate-limited (`middlewares/rateLimit.ts`).
- Handlers return `AppError` (or let the central `errorHandler` catch unexpected errors) — raw error messages are never sent to clients in production.
- Required env: `DATABASE_URL`, `JWT_SECRET`. Optional: `PORT`, `CORS_ORIGINS` (comma-separated; empty allows localhost only).
