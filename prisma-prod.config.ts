// Prisma CLI configuration for the PRODUCTION database (Neon).
//
// Nothing uses this file unless you name it explicitly:
//
//     npx prisma@7 db push --config prisma-prod.config.ts
//
// That is the whole point. The default config, prisma7.config.ts, can
// only ever reach the local database, so an ordinary `db push` cannot
// touch real customer bookings by accident. Reaching production has to
// be something you typed on purpose.
//
// It reads .env.neon, which is gitignored and must never be
// committed.

import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({ path: ".env.neon" });

function readProductionDirectUrl(): string {
  const url = process.env["DIRECT_DATABASE_URL"];

  if (!url) {
    throw new Error(
      "DIRECT_DATABASE_URL is not set. Create .env.neon and put Neon's DIRECT connection string in it, the one with the Connection pooling toggle switched OFF. See .env.example.",
    );
  }

  // Neon hands out two strings and they look almost identical. The
  // pooled one cannot run schema changes, and the failure it produces
  // is confusing, so catch it here where the fix is obvious.
  if (url.includes("-pooler.")) {
    throw new Error(
      "DIRECT_DATABASE_URL is Neon's POOLED connection string: its host contains '-pooler'. Schema changes need the DIRECT one. In the Neon dashboard, open Connect and switch the Connection pooling toggle OFF, then copy that string instead.",
    );
  }

  // If this ever points at localhost, someone has copied the wrong value
  // in and is about to think they updated production when they did not.
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error(
      "DIRECT_DATABASE_URL is not a valid url. Copy it again from the Neon dashboard.",
    );
  }

  if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
    throw new Error(
      `DIRECT_DATABASE_URL points at ${host}. This config is for production only. For the local database use the normal command, with no --config flag.`,
    );
  }

  console.log(`[prisma-prod] targeting production database at ${host}`);
  return url;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // No seed command here, deliberately. The seed writes a development
    // admin password and a placeholder trip, and must never run against
    // production.
  },
  datasource: {
    url: readProductionDirectUrl(),
  },
});
