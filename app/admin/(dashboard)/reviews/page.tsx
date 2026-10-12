import { AdminReviewEditor } from "@/components/admin-review-editor";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "Reviews" };

export default async function AdminReviewsPage() {
  await requireAdmin();

  const reviews = await prisma.review.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true, authorName: true, quote: true, rating: true,
      tripName: true, sortOrder: true, isPublished: true,
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl">Reviews</h1>
      <p className="mt-1 max-w-2xl text-sm text-text-muted">
        These are real women with real names. Only tick &ldquo;Show on the
        website&rdquo; for a review you are happy to publish, and copy the
        words as they wrote them. Lower order numbers appear first.
      </p>

      <div className="mt-6">
        <AdminReviewEditor reviews={reviews} />
      </div>
    </div>
  );
}
