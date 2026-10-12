// Reading bookings for the admin dashboard.
//
// Everything here returns customer data: women's names, phone numbers
// and travel dates. Nothing in this file may be imported by a public
// page. The only callers are screens behind requireAdmin().

import "server-only";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

// The statuses worth filtering by, in the order they appear in a
// booking's life.
export const BOOKING_STATUS_FILTERS = [
  "pending",
  "confirmed",
  "cancelled",
  "expired",
  "refunded",
] as const;

export type AdminBookingFilters = {
  // Matches a booking reference, a customer name or a phone number.
  search: string | null;
  status: string | null;
  tripSlug: string | null;
};

export const EMPTY_BOOKING_FILTERS: AdminBookingFilters = {
  search: null,
  status: null,
  tripSlug: null,
};

function buildWhere(filters: AdminBookingFilters): Prisma.BookingWhereInput {
  const where: Prisma.BookingWhereInput = {};

  if (filters.status) {
    where.status = filters.status as Prisma.BookingWhereInput["status"];
  }

  if (filters.tripSlug) {
    where.departure = { trip: { slug: filters.tripSlug } };
  }

  if (filters.search) {
    const term = filters.search.trim();
    // A phone number is often typed with spaces or a +91 that is not in
    // the stored value, so digits are matched on their own too.
    const digitsOnly = term.replace(/\D/g, "");

    where.OR = [
      { bookingRef: { contains: term, mode: "insensitive" } },
      { customerName: { contains: term, mode: "insensitive" } },
      { phone: { contains: term } },
    ];

    if (digitsOnly.length >= 4 && digitsOnly !== term) {
      where.OR.push({ phone: { contains: digitsOnly } });
    }
  }

  return where;
}

export async function getAdminBookings(
  filters: AdminBookingFilters = EMPTY_BOOKING_FILTERS,
) {
  return prisma.booking.findMany({
    where: buildWhere(filters),
    // Newest first: the client is nearly always looking for something
    // that happened today.
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      bookingRef: true,
      customerName: true,
      phone: true,
      email: true,
      travellerCount: true,
      travellerNames: true,
      specialRequests: true,
      totalAmount: true,
      amountPaid: true,
      status: true,
      createdAt: true,
      confirmedAt: true,
      adminNotes: true,
      departure: {
        select: {
          startDate: true,
          endDate: true,
          pricePerPerson: true,
          trip: { select: { title: true, slug: true } },
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        select: {
          status: true,
          amount: true,
          razorpayPaymentId: true,
          razorpayRefundId: true,
        },
      },
    },
  });
}

export type AdminBooking = Awaited<ReturnType<typeof getAdminBookings>>[number];

// Counts for the summary row at the top of the dashboard.
export async function getBookingStatusCounts() {
  const grouped = await prisma.booking.groupBy({
    by: ["status"],
    _count: true,
  });

  const counts: Record<string, number> = {};
  for (const row of grouped) {
    counts[row.status] = row._count;
  }
  return counts;
}

// The trips offered in the dashboard filter. Only trips that actually
// have a booking, so the dropdown does not list fifty trips nobody has
// booked.
export async function getTripsWithBookings() {
  const trips = await prisma.trip.findMany({
    where: { departures: { some: { bookings: { some: {} } } } },
    orderBy: { title: "asc" },
    select: { slug: true, title: true },
  });
  return trips;
}
