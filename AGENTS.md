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
- Sync database schema: `npm run db:push`
- Seed initial roles: `npm run db:seed`
- Drizzle Studio database GUI: `npm run db:studio`

## Architectural Guidelines
- Database schema is defined in `src/schema.ts`.
- Database client and connection pool are defined in `src/db.ts`.
- Password hashing and JWT generation are defined in `src/auth.ts`.
- Server routes and authentication handlers are defined in `src/server.ts`.
