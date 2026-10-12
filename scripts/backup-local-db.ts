// A complete copy of the LOCAL development database, in one JSON file.
//
//     npm run db:backup
//
// The local Prisma dev server dies every few days, and the only cure
// that works is to throw the instance away. Until this script existed
// that also threw away every trip, departure and test booking entered
// since the last seed. Now the cure is free: snapshot, reset, load it
// back.
//
// JSON rather than pg_dump, because pg_dump does not ship with
// `prisma dev` and is not on this machine. A JSON file also has the
// property that matters at 2am: you can open it and read it.
//
// It refuses any host that is not local. A snapshot of production would
// put real customers' names and phone numbers in a plain file on a
// laptop, which is exactly the thing the rest of this project is
// careful not to do.

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

import { prisma } from "../lib/prisma";

const BACKUP_DIR = "db-backups";

function refuseIfNotLocal() {
  const url = process.env.DATABASE_URL ?? "";
  let host = "";

  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error("DATABASE_URL is missing or invalid. Refusing to run.");
  }

  if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
    throw new Error(
      `DATABASE_URL points at ${host}, which is not local. This script writes every row to a plain file, so it only ever runs against the local database.`,
    );
  }

  console.log(`backing up the local database at ${host}`);
}

// local-2026-10-10-1432.json. Zero padded so the names sort as text,
// which is what lets the restore script find the newest one without
// reading any of them.
function backupFileName(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");

  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}`;

  return `local-${date}-${time}.json`;
}

// Prisma separates "this column is SQL NULL" from "this column holds
// the JSON value null", and refuses a plain null when inserting into a
// Json column. A payment with no payload should be SQL NULL, so the key
// is left out of the file entirely rather than written as null.
function withoutNullPayload(payment: { rawPayload: unknown }) {
  if (payment.rawPayload !== null) {
    return payment;
  }

  const copy: Record<string, unknown> = { ...payment };
  delete copy.rawPayload;
  return copy;
}

async function main() {
  refuseIfNotLocal();

  // Trip and Category are a many-to-many, and Prisma builds that join
  // table implicitly: there is no prisma.tripCategory to read. Reading
  // the ids off each trip gives the same pairs.
  const tripsWithCategories = await prisma.trip.findMany({
    select: { id: true, categories: { select: { id: true } } },
  });

  const tripCategories = tripsWithCategories.flatMap(function pairsForTrip(trip) {
    return trip.categories.map((category) => ({
      tripId: trip.id,
      categoryId: category.id,
    }));
  });

  const snapshot = {
    takenAt: new Date().toISOString(),
    categories: await prisma.category.findMany(),
    trips: await prisma.trip.findMany(),
    tripCategories,
    itineraryDays: await prisma.itineraryDay.findMany(),
    departures: await prisma.departure.findMany(),
    bookings: await prisma.booking.findMany(),
    payments: (await prisma.payment.findMany()).map(withoutNullPayload),
    waitlistEntries: await prisma.waitlistEntry.findMany(),
    enquiries: await prisma.enquiry.findMany(),
    reviews: await prisma.review.findMany(),
    faqs: await prisma.faq.findMany(),
    siteSettings: await prisma.siteSetting.findMany(),
    adminUsers: await prisma.adminUser.findMany(),
  };

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const file = path.join(BACKUP_DIR, backupFileName());
  fs.writeFileSync(file, JSON.stringify(snapshot, null, 2), "utf8");

  console.log(`\nwrote ${file}\n`);

  for (const [table, rows] of Object.entries(snapshot)) {
    if (Array.isArray(rows)) {
      console.log(`  ${String(rows.length).padStart(4)}  ${table}`);
    }
  }

  await prisma.$disconnect();
  console.log("\nRestore it with: npm run db:restore");
}

main().catch(async (error) => {
  console.error("backup failed:", error instanceof Error ? error.message : error);
  await prisma.$disconnect();
  process.exit(1);
});
