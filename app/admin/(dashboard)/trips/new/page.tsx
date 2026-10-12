import Link from "next/link";

import { AdminTripForm } from "@/components/admin-trip-form";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { BUSINESS_CITY } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = { title: "Add a trip" };

export default async function NewTripPage() {
  await requireAdmin();

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { slug: true, name: true },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link
        href="/admin/trips"
        className="inline-flex min-h-11 items-center text-sm font-semibold text-magenta-600 no-underline hover:underline"
      >
        Back to trips
      </Link>

      <h1 className="mt-3 text-3xl">Add a trip</h1>
      <p className="mt-1 text-sm text-text-muted">
        Save the trip first, then add its dates and prices.
      </p>

      <div className="mt-8 rounded-2xl border border-border bg-surface p-6">
        <AdminTripForm
          categories={categories}
          trip={{
            slug: "",
            title: "",
            destination: "",
            description: "",
            durationDays: 2,
            tripType: "ladies_only",
            minAge: null,
            departurePoint: `East Fort, ${BUSINESS_CITY}`,
            departureTime: "",
            returnPoint: `East Fort, ${BUSINESS_CITY}`,
            returnTime: "",
            knowBeforeYouGo: null,
            // New trips start hidden, so a half-finished one never
            // appears on the public site while it is being written.
            isActive: false,
            inclusions: [],
            exclusions: [],
            images: [],
            categorySlugs: [],
          }}
        />
      </div>
    </div>
  );
}
