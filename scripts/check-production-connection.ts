// Read-only connectivity check against the PRODUCTION database.
//
//     npx tsx scripts/check-production-connection.ts
//
// Writes nothing. It confirms the credentials in .env.neon work
// and reports which tables exist, so you know whether the schema has
// been pushed yet.

import dotenv from "dotenv";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

dotenv.config({ path: ".env.neon" });

async function main() {
  const connectionString = process.env.DIRECT_DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DIRECT_DATABASE_URL is not set. Fill in .env.neon first.",
    );
  }

  const host = new URL(connectionString).hostname;
  console.log(`connecting to ${host} (read only)`);

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  const version = await prisma.$queryRaw<
    { server: string }[]
  >`SELECT current_setting('server_version') AS server`;
  console.log(`connected. postgres ${version[0].server}`);

  const tables = await prisma.$queryRaw<{ table_name: string }[]>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;

  if (tables.length === 0) {
    console.log("tables: none yet, the schema has not been pushed");
  } else {
    console.log(`tables (${tables.length}): ${tables.map((t) => t.table_name).join(", ")}`);
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
