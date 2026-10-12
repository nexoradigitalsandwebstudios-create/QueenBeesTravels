// CSV export of the bookings list.
//
// This route returns customer names, phone numbers and travel dates, so
// it is guarded exactly like an admin page. A download link is still a
// url somebody can share by accident, and without this check that url
// would hand out the whole customer list.

import { NextResponse } from "next/server";

import { getApiAdmin } from "@/lib/admin-auth";
import {
  BOOKING_STATUS_FILTERS,
  getAdminBookings,
} from "@/lib/admin-bookings";

// Excel interprets a leading =, +, - or @ as a formula, so a crafted
// name could run something when the file is opened. Prefixing with an
// apostrophe makes it text. This is the reason a CSV export is not just
// a join with commas.
function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }

  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }

  // Quote everything and double any quotes inside, so commas, newlines
  // and quotes in a name cannot break the column alignment.
  return `"${text.replace(/"/g, '""')}"`;
}

function formatDate(date: Date | null): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

export async function GET(request: Request) {
  try {
    const admin = await getApiAdmin();
    if (!admin) {
      console.warn("[admin] CSV export refused: not signed in");
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    }

    const url = new URL(request.url);
    const requestedStatus = url.searchParams.get("status");

    const bookings = await getAdminBookings({
      search: url.searchParams.get("search"),
      status: BOOKING_STATUS_FILTERS.includes(
        requestedStatus as (typeof BOOKING_STATUS_FILTERS)[number],
      )
        ? requestedStatus
        : null,
      tripSlug: url.searchParams.get("trip"),
    });

    const header = [
      "Booking reference",
      "Status",
      "Customer",
      "Phone",
      "Email",
      "Trip",
      "Departs",
      "Returns",
      "Travellers",
      "Traveller names",
      "Total (rupees)",
      "Paid (rupees)",
      "Balance (rupees)",
      "Booked on",
      "Confirmed on",
      "Special requests",
      "Admin notes",
    ];

    const rows = bookings.map((booking) =>
      [
        booking.bookingRef,
        booking.status,
        booking.customerName,
        booking.phone,
        booking.email,
        booking.departure.trip.title,
        formatDate(booking.departure.startDate),
        formatDate(booking.departure.endDate),
        booking.travellerCount,
        booking.travellerNames.join("; "),
        booking.totalAmount,
        booking.amountPaid,
        booking.totalAmount - booking.amountPaid,
        formatDate(booking.createdAt),
        formatDate(booking.confirmedAt),
        booking.specialRequests,
        booking.adminNotes,
      ]
        .map(escapeCell)
        .join(","),
    );

    // A BOM, so Excel on Windows reads it as UTF-8 and does not mangle
    // names with Malayalam characters or an accented letter.
    const csv = `﻿${[header.map(escapeCell).join(","), ...rows].join("\r\n")}\r\n`;

    const stamp = new Date().toISOString().slice(0, 10);
    console.log(`[admin] exported ${bookings.length} booking(s) to CSV`);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="queen-bees-bookings-${stamp}.csv"`,
        // Customer data must never sit in a shared cache.
        "cache-control": "no-store, private",
      },
    });
  } catch (error) {
    console.error("[admin] CSV export failed:", error);
    return NextResponse.json(
      { error: "We could not build that export." },
      { status: 500 },
    );
  }
}
