// Deletes the old placeholder trip so the richer sample set is clean.
// LOCAL ONLY: it refuses any host that is not local.
import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  const host = new URL(process.env.DATABASE_URL ?? "").hostname;
  if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
    throw new Error(`Refusing to delete content on ${host}. This script is local only.`);
  }
  const slug = "placeholder-wayanad-weekend";
  const trip = await prisma.trip.findUnique({ where: { slug } });
  if (!trip) {
    console.log("nothing to remove");
  } else {
    await prisma.departure.deleteMany({ where: { tripId: trip.id } });
    await prisma.itineraryDay.deleteMany({ where: { tripId: trip.id } });
    await prisma.trip.delete({ where: { id: trip.id } });
    console.log(`removed ${slug} and its departures`);
  }
  await prisma.$disconnect();
}
main();
