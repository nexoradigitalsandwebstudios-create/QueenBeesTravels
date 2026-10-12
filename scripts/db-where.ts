// Shows LOCAL and PRODUCTION side by side, so there is never any doubt
// about which database is which.
//
//     npm run db:where
//
// Read only. It connects to each database, counts rows, and prints a
// comparison. It writes nothing and needs no arguments.

import dotenv from "dotenv";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

type Snapshot = {
  label: string;
  host: string;
  reachable: boolean;
  note: string;
  trips: number;
  departures: number;
  bookings: number;
  admins: number;
};

function readUrl(file: string, variable: string): string | undefined {
  const parsed = dotenv.config({ path: file, processEnv: {} });
  return parsed.parsed?.[variable];
}

async function snapshot(
  label: string,
  connectionString: string | undefined,
): Promise<Snapshot> {
  const empty = {
    label,
    host: "-",
    reachable: false,
    note: "",
    trips: 0,
    departures: 0,
    bookings: 0,
    admins: 0,
  };

  if (!connectionString) {
    return { ...empty, note: "no connection string configured" };
  }

  let host = "";
  try {
    host = new URL(connectionString).hostname;
  } catch {
    return { ...empty, note: "connection string is not a valid url" };
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const [trips, departures, bookings, admins] = await Promise.all([
      prisma.trip.count(),
      prisma.departure.count(),
      prisma.booking.count(),
      prisma.adminUser.count(),
    ]);
    return { label, host, reachable: true, note: "", trips, departures, bookings, admins };
  } catch (error) {
    const message = error instanceof Error ? error.message.split("\n")[0] : String(error);
    return { ...empty, host, note: message.slice(0, 70) };
  } finally {
    await prisma.$disconnect();
  }
}

function printRow(label: string, local: string, production: string) {
  console.log(`${label.padEnd(14)}${local.padEnd(34)}${production}`);
}

async function main() {
  // processEnv: {} keeps these out of the real environment, so reading
  // the production url here cannot change what anything else connects to.
  const localUrl = readUrl(".env", "DATABASE_URL");
  const productionUrl = readUrl(".env.neon", "DIRECT_DATABASE_URL");

  const [local, production] = await Promise.all([
    snapshot("LOCAL", localUrl),
    snapshot("PRODUCTION", productionUrl),
  ]);

  console.log("");
  printRow("", "LOCAL", "PRODUCTION");
  printRow("", "-".repeat(32), "-".repeat(50));
  printRow("host", local.host.slice(0, 32), production.host);
  printRow(
    "reachable",
    local.reachable ? "yes" : `no: ${local.note}`,
    production.reachable ? "yes" : `no: ${production.note}`,
  );

  if (local.reachable && production.reachable) {
    printRow("trips", String(local.trips), String(production.trips));
    printRow("departures", String(local.departures), String(production.departures));
    printRow("bookings", String(local.bookings), String(production.bookings));
    printRow("admins", String(local.admins), String(production.admins));
  }

  console.log("");
  console.log("Commands that touch LOCAL (the default, always safe):");
  console.log("  npx prisma@7 db push");
  console.log("  npx prisma@7 studio");
  console.log("  npx prisma@7 db seed");
  console.log("");
  console.log("Commands that touch PRODUCTION (must name the config):");
  console.log("  npx prisma@7 db push --config prisma-prod.config.ts");
  console.log("  npx prisma@7 studio --config prisma-prod.config.ts");
  console.log("");
}

main().catch((error) => {
  console.error("failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
