// Rebuilds the LOCAL development database from the seed.
//
//     npm run db:reset
//
// Use this when you want a clean, known starting point: the seed
// content and the development admin, and nothing else.
//
// This is no longer a crash cure. The local database is the PostgreSQL
// 18 Windows service now, and it does not drop connections the way the
// old `prisma dev` server did. If something looks wrong, run
// `npm run db:where` first and find out what is actually broken before
// deleting anything.
//
// It takes a snapshot before it drops anything, so a reset you did not
// mean is undone with:
//
//     npm run db:restore
//
// It refuses to touch anything that is not localhost.

import "dotenv/config";
import { execFileSync } from "node:child_process";

import { prisma } from "../lib/prisma";

function run(args: string[]) {
  console.log(`\n> npx ${args.join(" ")}`);
  execFileSync("npx", args, { stdio: "inherit", shell: true });
}

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
      `DATABASE_URL points at ${host}, which is not local. This script drops every table in the database it is pointed at, so it refuses to run against anything else.`,
    );
  }

  console.log(`resetting the local database at ${host}`);
}

// A snapshot before anything is dropped, so a reset is never the thing
// that loses an afternoon of content entered through the admin area.
// If the database cannot be read there is nothing to lose, so a failure
// here is reported and stepped over rather than stopping the reset.
function backupFirst(): boolean {
  try {
    run(["tsx", "scripts/backup-local-db.ts"]);
    return true;
  } catch {
    console.log(
      "\n!! Could not back up: the database did not answer. Continuing.\n!! Anything newer than the last file in db-backups/ will be lost.\n",
    );
    return false;
  }
}

// Children before parents, or a foreign key refuses the delete. The
// same twelve lines appear in restore-local-db.ts. They are duplicated
// rather than shared because the order IS the logic here: reading it in
// the file that deletes is worth more than one fewer copy.
//
// Emptying the tables rather than dropping the schema, because
// `prisma db push --force-reset` refuses to run from a script without
// an explicit consent token, and burying that token in a committed file
// would disable the guard for every future run.
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
  await prisma.$disconnect();
}

async function main() {
  refuseIfNotLocal();

  const backedUp = backupFirst();

  await emptyEveryTable();

  // Harmless when the schema is already in sync, and it catches the
  // case where schema.prisma has moved on since the last push.
  run(["prisma@7", "db", "push"]);
  run(["prisma@7", "generate"]);
  run(["prisma@7", "db", "seed"]);

  console.log(
    "\nDone. If `npm run dev` was already running, restart it so it picks up a fresh client.",
  );

  if (backedUp) {
    console.log(
      "This database now holds the seed. To put your own content back instead:\n\n    npm run db:restore\n",
    );
  }
}

main().catch(async (error) => {
  console.error("reset failed:", error instanceof Error ? error.message : error);
  await prisma.$disconnect();
  process.exit(1);
});
