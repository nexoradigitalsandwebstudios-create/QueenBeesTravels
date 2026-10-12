import { AdminFaqEditor } from "@/components/admin-faq-editor";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "Questions" };

export default async function AdminFaqsPage() {
  await requireAdmin();

  const faqs = await prisma.faq.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true, question: true, answer: true,
      sortOrder: true, isPublished: true,
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl">Questions</h1>
      <p className="mt-1 max-w-2xl text-sm text-text-muted">
        The questions women ask before booking, shown as a drop-down list near
        the bottom of the home page. Lower order numbers appear first.
      </p>

      <div className="mt-6">
        <AdminFaqEditor faqs={faqs} />
      </div>
    </div>
  );
}
