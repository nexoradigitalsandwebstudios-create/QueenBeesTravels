// The one Prisma Client for the whole application.
//
// Import this everywhere. Never call `new PrismaClient()` anywhere else:
// each instance opens its own connection pool, and a handful of them
// will exhaust the database's connection limit.

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 needs a driver adapter; there is no built-in engine any more.
// PrismaPg speaks ordinary Postgres over TCP, which works for both the
// local `prisma dev` server and a Prisma Postgres cloud database. The
// HTTP (prisma+postgres://) url does NOT work here: the local dev server
// rejects it outright with Prisma Client 7.10.
// Turns a connection string into something safe to print: the hostname
// plus whether it is the local database or a real remote one.
function describeTarget(connectionString: string): string {
  let host = "";
  try {
    host = new URL(connectionString).hostname;
  } catch {
    return "an unparseable DATABASE_URL";
  }

  if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
    return `${host} (LOCAL database)`;
  }

  return `${host} (REMOTE database, this is real customer data)`;
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  // Failing here with a clear message beats a confusing connection error
  // on the first database call in a request.
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env, then start the local database with: npx prisma@7 dev --detach",
    );
  }

  // Printed once when the server starts. The single most useful line in
  // the log when something looks wrong: it says which database this
  // process is actually talking to, before any query runs.
  //
  // Only the hostname is logged. The connection string contains the
  // password and must never reach a log file.
  console.log(`[prisma] connecting to ${describeTarget(connectionString)}`);

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    // Warnings and errors always go to the server log. Add "query" to
    // this list temporarily when you need to see the SQL Prisma is
    // actually running.
    log: ["warn", "error"],
  });
}

// `next dev` reloads this module on every edit. Without somewhere to
// keep the client between reloads, each edit would leak another
// connection pool until Postgres refuses new connections. Stashing it on
// globalThis is the standard fix and is only needed in development.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
