import { AdminSettingsForm } from "@/components/admin-settings-form";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  await requireAdmin();

  const settings = await prisma.siteSetting.findMany({
    orderBy: { key: "asc" },
    select: { key: true, value: true, label: true },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl">Settings</h1>
      <p className="mt-1 max-w-2xl text-sm text-text-muted">
        The numbers shown on the home page. These are claims about the
        business, so keep them accurate: the rating and review count should
        match what the Google listing actually says today.
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <AdminSettingsForm settings={settings} />
      </div>
    </div>
  );
}
