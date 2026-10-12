import "dotenv/config";
import { prisma } from "../lib/prisma";
import { getAvailabilityForDepartures } from "../lib/availability";

async function main() {
  const trip = await prisma.trip.findFirstOrThrow({
    include: {
      departures: { orderBy: { startDate: "asc" } },
      categories: true,
      itinerary: true,
    },
  });

  console.log(`trip: ${trip.slug}`);
  console.log(`  type: ${trip.tripType}`);
  console.log(`  categories: ${trip.categories.map((c) => c.slug).join(", ")}`);
  console.log(`  itinerary days: ${trip.itinerary.length}`);

  const availability = await getAvailabilityForDepartures(
    trip.departures.map((d) => d.id),
  );

  for (const departure of trip.departures) {
    const seats = availability.get(departure.id);
    console.log(
      `departure ${departure.startDate.toISOString().slice(0, 10)}` +
        ` | confirmed ${seats?.seatsConfirmed}/${seats?.totalSeats}` +
        ` | available ${seats?.availableSeats}` +
        ` | soldOut ${seats?.isSoldOut}`,
    );
  }

  console.log(`bookings: ${await prisma.booking.count()}`);
  console.log(`admins: ${await prisma.adminUser.count()}`);
  console.log(`categories: ${await prisma.category.count()}`);

  await prisma.$disconnect();
}

main();
