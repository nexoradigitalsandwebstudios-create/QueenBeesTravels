// Seeds the LOCAL database with enough to develop against.
//
// Safe to run repeatedly: everything here is an upsert.
//
//     npx prisma@7 db seed
//
// The trip content lives in prisma/seed-trips.ts. Its prices and dates
// are invented, which is why refuseToSeedRemoteDatabase below blocks any
// database that is not local.
//
// This import must stay first. `prisma db seed` runs this file in its
// own process, so nothing has loaded .env yet and DATABASE_URL would be
// undefined by the time lib/prisma.ts is imported below.
import "dotenv/config";

import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { SEED_TRIPS } from "./seed-trips";
import {
  SEED_FAQS,
  SEED_INSTAGRAM_IMAGES,
  SEED_REVIEWS,
  SEED_SITE_SETTINGS,
} from "./seed-content";

// Local development only. Override with SEED_ADMIN_EMAIL and
// SEED_ADMIN_PASSWORD for anything that is not a throwaway database.
const DEV_ADMIN_EMAIL = "admin@queenbees.local";
const DEV_ADMIN_PASSWORD = "queenbees-dev-only";

const BCRYPT_ROUNDS = 12;

// The category vocabulary the client manages from the admin area, based
// on the trips Queen Bees actually runs. She can rename, reorder,
// deactivate or add to these.
const STARTER_CATEGORIES = [
  { slug: "weekend-getaway", name: "Weekend Getaway", sortOrder: 1 },
  { slug: "hill-station", name: "Hill Station", sortOrder: 2 },
  { slug: "trek", name: "Trek", sortOrder: 3 },
  { slug: "backwaters", name: "Backwaters", sortOrder: 4 },
  { slug: "beach", name: "Beach", sortOrder: 5 },
  { slug: "heritage", name: "Heritage and Temples", sortOrder: 6 },
  { slug: "all-india", name: "All India", sortOrder: 7 },
  { slug: "international", name: "International", sortOrder: 8 },
];

// The seed writes an admin password published in this file and trip
// pricing nobody has approved. Neither belongs in a database holding
// real customer bookings.
//
// NODE_ENV is not a reliable guard on its own: it is usually unset when
// running a script by hand, which is exactly when someone points this at
// the wrong database. So check where the connection actually goes.
function refuseToSeedRemoteDatabase() {
  const connectionString = process.env.DATABASE_URL ?? "";

  let host = "";
  try {
    host = new URL(connectionString).hostname;
  } catch {
    throw new Error(
      "DATABASE_URL is missing or not a valid url, so the seed cannot tell which database it would write to. Refusing to run.",
    );
  }

  if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
    return;
  }

  if (process.env.SEED_ALLOW_REMOTE === "yes-i-mean-it") {
    console.warn(`[seed] WARNING: seeding the REMOTE database at ${host}`);
    return;
  }

  throw new Error(
    `Refusing to seed: DATABASE_URL points at ${host}, which is not a local database. This seed writes a development admin password and unapproved trip pricing, so it must never touch production. If this really is a throwaway database, set SEED_ALLOW_REMOTE=yes-i-mean-it and run it again.`,
  );
}

async function seedCategories() {
  for (const category of STARTER_CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, sortOrder: category.sortOrder },
      create: category,
    });
  }
  console.log(`[seed] categories: ${STARTER_CATEGORIES.length}`);
}

async function seedAdminUser() {
  const email = process.env.SEED_ADMIN_EMAIL ?? DEV_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD ?? DEV_ADMIN_PASSWORD;

  if (process.env.NODE_ENV === "production" && password === DEV_ADMIN_PASSWORD) {
    throw new Error(
      "Refusing to seed the development admin password into a production database. Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD first.",
    );
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });

  console.log(`[seed] admin: ${email} (password is in prisma/seed.ts)`);
}

// Midnight UTC a given number of days from today, so seeded departures
// are always in the future however long after writing this it is run.
function departureDate(daysFromToday: number): Date {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + daysFromToday);
  return date;
}

// Seeded departures are placed relative to TODAY, so running the seed on
// a second day produces a different set of dates and the upsert below
// creates them alongside the old ones rather than replacing them. Run it
// across a week and the listing shows seven times the dates it should.
//
// So anything previously seeded is cleared first. Departures that have
// bookings are left alone: those are somebody's seats, and a seed script
// has no business deleting them even locally.
async function clearPreviouslySeededDepartures() {
  const seededSlugs = SEED_TRIPS.map((trip) => trip.slug);

  const removed = await prisma.departure.deleteMany({
    where: {
      trip: { slug: { in: seededSlugs } },
      bookings: { none: {} },
    },
  });

  if (removed.count > 0) {
    console.log(`[seed] cleared ${removed.count} previously seeded departure(s)`);
  }
}

async function seedTrips() {
  let departureCount = 0;

  await clearPreviouslySeededDepartures();

  for (const seedTrip of SEED_TRIPS) {
    const trip = await prisma.trip.upsert({
      where: { slug: seedTrip.slug },
      update: {
        title: seedTrip.title,
        description: seedTrip.description,
        images: [seedTrip.image],
      },
      create: {
        slug: seedTrip.slug,
        title: seedTrip.title,
        destination: seedTrip.destination,
        description: seedTrip.description,
        durationDays: seedTrip.durationDays,
        tripType: seedTrip.tripType,
        minAge: seedTrip.minAge,
        departurePoint: "East Fort, Trivandrum",
        departureTime: seedTrip.departureTime,
        returnPoint: "East Fort, Trivandrum",
        returnTime: seedTrip.returnTime,
        inclusions: seedTrip.inclusions,
        exclusions: seedTrip.exclusions,
        knowBeforeYouGo: seedTrip.knowBeforeYouGo,
        images: [seedTrip.image],
        categories: {
          connect: seedTrip.categorySlugs.map((slug) => ({ slug })),
        },
      },
    });

    for (const seedDeparture of seedTrip.departures) {
      const startDate = departureDate(seedDeparture.startsInDays);
      const endDate = departureDate(
        seedDeparture.startsInDays + seedDeparture.lengthDays - 1,
      );

      await prisma.departure.upsert({
        where: { tripId_startDate: { tripId: trip.id, startDate } },
        update: {
          totalSeats: seedDeparture.totalSeats,
          seatsConfirmed: seedDeparture.seatsConfirmed,
          pricePerPerson: seedDeparture.pricePerPerson,
          advanceAmount: seedDeparture.advanceAmount,
        },
        create: {
          tripId: trip.id,
          startDate,
          endDate,
          pricePerPerson: seedDeparture.pricePerPerson,
          advanceAmount: seedDeparture.advanceAmount,
          totalSeats: seedDeparture.totalSeats,
          seatsConfirmed: seedDeparture.seatsConfirmed,
          status: "open",
        },
      });
      departureCount += 1;
    }
  }

  console.log(`[seed] trips: ${SEED_TRIPS.length}, departures: ${departureCount}`);
}

// Reviews are seeded already published so the section has something to
// show locally. In production the client publishes each one herself.
async function seedReviewsAndFaqs() {
  for (const review of SEED_REVIEWS) {
    const existing = await prisma.review.findFirst({
      where: { authorName: review.authorName },
    });
    if (existing) {
      await prisma.review.update({
        where: { id: existing.id },
        data: { ...review, isPublished: true },
      });
    } else {
      await prisma.review.create({ data: { ...review, isPublished: true } });
    }
  }

  for (const faq of SEED_FAQS) {
    const existing = await prisma.faq.findFirst({
      where: { question: faq.question },
    });
    if (existing) {
      await prisma.faq.update({ where: { id: existing.id }, data: faq });
    } else {
      await prisma.faq.create({ data: faq });
    }
  }

  console.log(
    `[seed] reviews: ${SEED_REVIEWS.length}, faqs: ${SEED_FAQS.length}`,
  );
}

async function seedSiteSettings() {
  for (const setting of SEED_SITE_SETTINGS) {
    await prisma.siteSetting.upsert({
      where: { key: setting.key },
      update: { label: setting.label },
      create: setting,
    });
  }

  // The Instagram strip is stored as one setting holding a list, because
  // six image paths do not justify their own table.
  await prisma.siteSetting.upsert({
    where: { key: "instagram_images" },
    update: {},
    create: {
      key: "instagram_images",
      value: SEED_INSTAGRAM_IMAGES.join(","),
      label: "Instagram strip photos, comma separated paths under /images.",
    },
  });

  console.log(`[seed] site settings: ${SEED_SITE_SETTINGS.length + 1}`);
}

async function main() {
  refuseToSeedRemoteDatabase();
  await seedCategories();
  await seedAdminUser();
  await seedTrips();
  await seedReviewsAndFaqs();
  await seedSiteSettings();
  console.log("[seed] done. Trip prices and dates are SAMPLE DATA, not approved by the client.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("[seed] failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
