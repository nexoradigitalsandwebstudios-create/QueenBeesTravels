"use server";

// Server actions for the content the client edits as words rather than
// inventory: reviews, questions and the site numbers.
//
// Every one calls requireAdmin() first, for the same reason the trip
// actions do: a server action is a POST endpoint, not a private
// function.

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import type { ActionResult } from "@/lib/admin-trip-actions";

const reviewSchema = z.object({
  id: z.string().optional(),
  authorName: z.string().trim().min(2).max(120),
  quote: z.string().trim().min(10).max(2000),
  rating: z.coerce.number().int().min(1).max(5),
  tripName: z.string().trim().max(160).optional(),
  sortOrder: z.coerce.number().int().min(0).max(999),
  isPublished: z.coerce.boolean(),
});

export async function saveReview(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();

    const parsed = reviewSchema.safeParse({
      id: formData.get("id") || undefined,
      authorName: formData.get("authorName"),
      quote: formData.get("quote"),
      rating: formData.get("rating"),
      tripName: formData.get("tripName") || undefined,
      sortOrder: formData.get("sortOrder") || 0,
      isPublished: formData.get("isPublished") === "on",
    });

    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message };
    }

    const { id, ...data } = parsed.data;
    const row = { ...data, tripName: data.tripName ?? null };

    if (id) {
      await prisma.review.update({ where: { id }, data: row });
    } else {
      await prisma.review.create({ data: row });
    }

    revalidatePath("/admin/reviews");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    console.error("[admin] saveReview failed:", error);
    return { ok: false, error: "We could not save that review." };
  }
}

export async function deleteReview(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.review.delete({ where: { id } });
    revalidatePath("/admin/reviews");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    console.error("[admin] deleteReview failed:", error);
    return { ok: false, error: "We could not delete that review." };
  }
}

const faqSchema = z.object({
  id: z.string().optional(),
  question: z.string().trim().min(5).max(300),
  answer: z.string().trim().min(5).max(3000),
  sortOrder: z.coerce.number().int().min(0).max(999),
  isPublished: z.coerce.boolean(),
});

export async function saveFaq(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();

    const parsed = faqSchema.safeParse({
      id: formData.get("id") || undefined,
      question: formData.get("question"),
      answer: formData.get("answer"),
      sortOrder: formData.get("sortOrder") || 0,
      isPublished: formData.get("isPublished") === "on",
    });

    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message };
    }

    const { id, ...data } = parsed.data;

    if (id) {
      await prisma.faq.update({ where: { id }, data });
    } else {
      await prisma.faq.create({ data });
    }

    revalidatePath("/admin/faqs");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    console.error("[admin] saveFaq failed:", error);
    return { ok: false, error: "We could not save that question." };
  }
}

export async function deleteFaq(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.faq.delete({ where: { id } });
    revalidatePath("/admin/faqs");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    console.error("[admin] deleteFaq failed:", error);
    return { ok: false, error: "We could not delete that question." };
  }
}

// Only these keys do anything; lib/site-content.ts reads exactly this
// list. Anything else saved here would sit in the table unread, so the
// form offers these and nothing more.
const SETTABLE_KEYS = [
  "google_rating",
  "google_review_count",
  "instagram_followers",
  "instagram_images",
];

export async function saveSiteSettings(
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdmin();

    for (const key of SETTABLE_KEYS) {
      const value = formData.get(key);
      if (typeof value !== "string") continue;

      await prisma.siteSetting.update({
        where: { key },
        data: { value: value.trim() },
      });
    }

    console.log("[admin] site settings updated");
    revalidatePath("/admin/settings");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    console.error("[admin] saveSiteSettings failed:", error);
    return { ok: false, error: "We could not save those settings." };
  }
}
