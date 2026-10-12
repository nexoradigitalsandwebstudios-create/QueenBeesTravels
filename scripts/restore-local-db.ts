// Loads a snapshot from `npm run db:backup` back into the LOCAL
// database.
//
//     npm run db:restore                      (the newest snapshot)
//     npm run db:restore -- db-backups/local-2026-10-10-1432.json
//
// This REPLACES everything in the local database with the contents of
// the file. It empties every table first, because a snapshot contains
// the same slugs and booking references as the rows already there and
// a half-merged database is worse than either state.
//
// It refuses any host that is not local, for the obvious reason.

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

import type { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";

const BACKUP_DIR = "db-backups";

// What a snapshot file holds. Spelling the Prisma input types out here
// means a schema change that the backup no longer matches is a type
// error rather than a confusing insert failure halfway through.
//
// Dates are ISO strings once they have been through JSON, which Prisma
// accepts for a DateTime field.
type Snapshot = {
  takenAt: string;
  categories: Prisma.CategoryCreateManyInput[];
  trips: Prisma.TripCreateManyInput[];
  tripCategories: { tripId: string; categoryId: string }[];
  itineraryDays: Prisma.ItineraryDayCreateManyInput[];
  departures: Prisma.DepartureCreateManyInput[];
  bookings: Prisma.BookingCreateManyInput[];
  payments: Prisma.PaymentCreateManyInput[];
  waitlistEntries: Prisma.WaitlistEntryCreateManyInput[];
  enquiries: Prisma.EnquiryCreateManyInput[];
  reviews: Prisma.ReviewCreateManyInput[];
  faqs: Prisma.FaqCreateManyInput[];
  siteSettings: Prisma.SiteSettingCreateManyInput[];
  adminUsers: Prisma.AdminUserCreateManyInput[];
};

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
      `DATABASE_URL points at ${host}, which is not local. This script empties every table before loading, so it only ever runs against the local database.`,
    );
  }

  console.log(`restoring into the local database at ${host}`);
}

function chooseFile(requested: string | undefined): string {
  if (requested) {
    if (!fs.existsSync(requested)) {
      throw new Error(`No such file: ${requested}`);
    }
    return requested;
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    throw new Error(
      `There is no ${BACKUP_DIR}/ directory yet. Take a snapshot first with: npm run db:backup`,
    );
  }

  // The file names are zero-padded timestamps, so the last one by name
  // is the newest one by time.
  const newest = fs
    .readdirSync(BACKUP_DIR)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .pop();

  if (!newest) {
    throw new Error(
      `${BACKUP_DIR}/ is empty. Take a snapshot first with: npm run db:backup`,
    );
  }

  return path.join(BACKUP_DIR, newest);
}

// Children before parents, or a foreign key refuses the delete.
async function emptyEveryTable() {
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.waitlistEntry.deleteMany();
  await prisma.departure.deleteMany();
  await prisma.itineraryDay.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.category.deleteMany();
  await prisma.enquiry.deleteMany();
  await prisma.review.deleteMany();
  await prisma.faq.deleteMany();
  await prisma.siteSetting.deleteMany();
  await prisma.adminUser.deleteMany();
}

// Parents before children, the reverse of the deletes above.
async function loadSnapshot(snapshot: Snapshot) {
  await prisma.category.createMany({ data: snapshot.categories });
  await prisma.trip.createMany({ data: snapshot.trips });

  // The Trip/Category join table is implicit, so there is no createMany
  // for it. One update per trip re-links the categories it had.
  const categoryIdsByTrip = new Map<string, string[]>();
  for (const pair of snapshot.tripCategories) {
    const existing = categoryIdsByTrip.get(pair.tripId) ?? [];
    existing.push(pair.categoryId);
    categoryIdsByTrip.set(pair.tripId, existing);
  }

  for (const [tripId, categoryIds] of categoryIdsByTrip) {
    await prisma.trip.update({
      where: { id: tripId },
      data: { categories: { connect: categoryIds.map((id) => ({ id })) } },
    });
  }

  await prisma.itineraryDay.createMany({ data: snapshot.itineraryDays });
  await prisma.departure.createMany({ data: snapshot.departures });
  await prisma.booking.createMany({ data: snapshot.bookings });
  await prisma.payment.createMany({ data: snapshot.payments });
  await prisma.waitlistEntry.createMany({ data: snapshot.waitlistEntries });
  await prisma.enquiry.createMany({ data: snapshot.enquiries });
  await prisma.review.createMany({ data: snapshot.reviews });
  await prisma.faq.createMany({ data: snapshot.faqs });
  await prisma.siteSetting.createMany({ data: snapshot.siteSettings });
  await prisma.adminUser.createMany({ data: snapshot.adminUsers });
}

// Counted out of the database, not out of the file. Printing the file's
// own numbers back would report success whatever actually happened,
// which is the kind of check that passes right up until the day it
// matters.
async function reportWhatLanded(snapshot: Snapshot) {
  const inDatabase: Record<string, number> = {
    categories: await prisma.category.count(),
    trips: await prisma.trip.count(),
    itineraryDays: await prisma.itineraryDay.count(),
    departures: await prisma.departure.count(),
    bookings: await prisma.booking.count(),
    payments: await prisma.payment.count(),
    waitlistEntries: await prisma.waitlistEntry.count(),
    enquiries: await prisma.enquiry.count(),
    reviews: await prisma.review.count(),
    faqs: await prisma.faq.count(),
    siteSettings: await prisma.siteSetting.count(),
    adminUsers: await prisma.adminUser.count(),
  };

  let mismatches = 0;
  console.log("\n  in file   in database   table");

  for (const [table, loaded] of Object.entries(inDatabase)) {
    const expected = (snapshot as unknown as Record<string, unknown[]>)[table].length;
    const agrees = expected === loaded;
    if (!agrees) mismatches += 1;
    console.log(
      `  ${String(expected).padStart(7)}   ${String(loaded).padStart(11)}   ${table}${agrees ? "" : "   <-- MISMATCH"}`,
    );
  }

  if (mismatches > 0) {
    throw new Error(
      `${mismatches} table(s) do not match the snapshot. The database is now in a half-loaded state: fix the cause and run the restore again.`,
    );
  }
}

async function main() {
  refuseIfNotLocal();

  const file = chooseFile(process.argv[2]);
  const snapshot = JSON.parse(fs.readFileSync(file, "utf8")) as Snapshot;

  console.log(`reading ${file}, taken ${snapshot.takenAt}`);

  await emptyEveryTable();
  await loadSnapshot(snapshot);
  await reportWhatLanded(snapshot);

  await prisma.$disconnect();
  console.log("\nRestored. Restart `npm run dev` if it is already running.");
}

main().catch(async (error) => {
  console.error("restore failed:", error instanceof Error ? error.message : error);
  await prisma.$disconnect();
  process.exit(1);
});
