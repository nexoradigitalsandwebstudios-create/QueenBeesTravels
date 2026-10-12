"use server";

// Server actions for trip and departure editing.
//
// Every one of these calls requireAdmin() first. A server action is a
// POST endpoint with a generated url, reachable by anyone who finds it,
// so "only an admin screen calls this" is not a guard.
//
// They validate with zod for the same reason every API route does: the
// form data arrives from a browser and a browser can be scripted.

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export type ActionResult = { ok: true } | { ok: false; error: string };

const tripSchema = z.object({
  id: z.string().optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and hyphens only"),
  title: z.string().trim().min(2).max(160),
  destination: z.string().trim().min(2).max(160),
  description: z.string().trim().min(10),
  durationDays: z.coerce.number().int().min(1).max(60),
  tripType: z.enum(["ladies_only", "mixed", "mother_and_kids"]),
  minAge: z.union([z.coerce.number().int().min(0).max(99), z.literal("")]),
  departurePoint: z.string().trim().min(2),
  departureTime: z.string().trim().min(2),
  returnPoint: z.string().trim().min(2),
  returnTime: z.string().trim().min(2),
  knowBeforeYouGo: z.string().trim().max(2000).optional(),
  isActive: z.coerce.boolean(),
});

// Textareas where one line is one item. Blank lines are dropped so a
// stray newline does not become an empty bullet on the public page.
function linesToArray(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") return [];
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export async function saveTrip(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();

    const parsed = tripSchema.safeParse({
      id: formData.get("id") || undefined,
      slug: formData.get("slug"),
      title: formData.get("title"),
      destination: formData.get("destination"),
      description: formData.get("description"),
      durationDays: formData.get("durationDays"),
      tripType: formData.get("tripType"),
      minAge: formData.get("minAge") === "" ? "" : formData.get("minAge"),
      departurePoint: formData.get("departurePoint"),
      departureTime: formData.get("departureTime"),
      returnPoint: formData.get("returnPoint"),
      returnTime: formData.get("returnTime"),
      knowBeforeYouGo: formData.get("knowBeforeYouGo") || undefined,
      isActive: formData.get("isActive") === "on",
    });

    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return {
        ok: false,
        error: `${first.path.join(".")}: ${first.message}`,
      };
    }

    const input = parsed.data;
    const categorySlugs = formData.getAll("categories").map(String);

    const data = {
      slug: input.slug,
      title: input.title,
      destination: input.destination,
      description: input.description,
      durationDays: input.durationDays,
      tripType: input.tripType,
      minAge: input.minAge === "" ? null : input.minAge,
      departurePoint: input.departurePoint,
      departureTime: input.departureTime,
      returnPoint: input.returnPoint,
      returnTime: input.returnTime,
      knowBeforeYouGo: input.knowBeforeYouGo ?? null,
      isActive: input.isActive,
      inclusions: linesToArray(formData.get("inclusions")),
      exclusions: linesToArray(formData.get("exclusions")),
      images: linesToArray(formData.get("images")),
    };

    if (input.id) {
      await prisma.trip.update({
        where: { id: input.id },
        data: {
          ...data,
          // set replaces the whole list, which is what unticking a
          // checkbox should do.
          categories: { set: categorySlugs.map((slug) => ({ slug })) },
        },
      });
      console.log(`[admin] updated trip ${input.slug}`);
    } else {
      await prisma.trip.create({
        data: {
          ...data,
          categories: { connect: categorySlugs.map((slug) => ({ slug })) },
        },
      });
      console.log(`[admin] created trip ${input.slug}`);
    }

    revalidatePath("/admin/trips");
    revalidatePath("/trips");
    return { ok: true };
  } catch (error) {
    console.error("[admin] saveTrip failed:", error);
    // A duplicate slug is the one failure worth naming, because it is
    // the one the client will actually hit.
    const message =
      error instanceof Error && error.message.includes("Unique constraint")
        ? "A trip with that web address already exists. Choose a different one."
        : "We could not save that trip.";
    return { ok: false, error: message };
  }
}

// Trips are deactivated, never deleted. A trip has departures, and
// departures have bookings with money attached; the schema refuses the
// delete and the resulting error helps nobody.
export async function setTripActive(
  tripId: string,
  isActive: boolean,
): Promise<ActionResult> {
  try {
    await requireAdmin();

    await prisma.trip.update({ where: { id: tripId }, data: { isActive } });
    console.log(`[admin] trip ${tripId} set ${isActive ? "live" : "hidden"}`);

    revalidatePath("/admin/trips");
    revalidatePath("/trips");
    return { ok: true };
  } catch (error) {
    console.error("[admin] setTripActive failed:", error);
    return { ok: false, error: "We could not change that trip." };
  }
}
