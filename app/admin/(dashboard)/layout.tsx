import type { Metadata } from "next";

import { AdminNav } from "@/components/admin-nav";
import { requireAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Queen Bees admin" },
  // Nothing under /admin should ever appear in a search result.
  robots: { index: false, follow: false },
};

// (dashboard) is a route group, so it adds nothing to the url: the page
// inside it is still /admin. It exists so the sign-in page at
// /admin/login can sit outside this layout and therefore outside both
// the navigation and the requireAdmin call below, which would otherwise
// redirect the login page to itself forever.
export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Belt as well as braces. Every page under here calls requireAdmin
  // itself, and so does this layout, so a page added later that forgets
  // the call is still not reachable without a session.
  const admin = await requireAdmin();

  return (
    <div className="flex min-h-dvh flex-col bg-ink-50">
      <AdminNav email={admin.email} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
