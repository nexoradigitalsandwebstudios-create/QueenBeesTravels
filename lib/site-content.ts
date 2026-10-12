// Reviews, questions and the editable site numbers.
//
// Separate from lib/trips.ts because these are the parts of the page the
// client edits as copy, not as inventory.

import { prisma } from "@/lib/prisma";

// The categories offered in the trip listing filter. Only active ones,
// in the order the client arranged them.
export async function getFilterableCategories() {
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { slug: true, name: true },
  });
}

export async function getPublishedReviews() {
  return prisma.review.findMany({
    where: { isPublished: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      authorName: true,
      quote: true,
      rating: true,
      tripName: true,
    },
  });
}

export async function getPublishedFaqs() {
  return prisma.faq.findMany({
    where: { isPublished: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, question: true, answer: true },
  });
}

// Only these keys do anything. A row in the table with any other key is
// ignored, so a typo in the admin cannot quietly change the site, and
// the list of what is settable is readable in one place.
export type SiteSettings = {
  googleRating: string | null;
  googleReviewCount: string | null;
  instagramFollowers: string | null;
  instagramImages: string[];
};

export async function getSiteSettings(): Promise<SiteSettings> {
  const rows = await prisma.siteSetting.findMany({
    select: { key: true, value: true },
  });

  const byKey = new Map(rows.map((row) => [row.key, row.value.trim()]));

  // An empty string means the client cleared it, which should hide the
  // thing entirely rather than render a blank gap.
  function read(key: string): string | null {
    const value = byKey.get(key);
    if (!value) {
      return null;
    }
    return value;
  }

  const imagesRaw = read("instagram_images");
  let instagramImages: string[] = [];
  if (imagesRaw) {
    instagramImages = imagesRaw
      .split(",")
      .map((path) => path.trim())
      .filter((path) => path.length > 0);
  }

  return {
    googleRating: read("google_rating"),
    googleReviewCount: read("google_review_count"),
    instagramFollowers: read("instagram_followers"),
    instagramImages,
  };
}
