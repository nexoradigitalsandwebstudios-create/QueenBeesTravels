import Image from "next/image";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { AdminLoginForm } from "@/components/admin-login-form";
import { getSignedInAdmin } from "@/lib/admin-auth";
import { BUSINESS_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
  // Nothing under /admin should ever appear in a search result.
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  // Somebody already signed in should go straight to the dashboard
  // rather than be asked to sign in again.
  const admin = await getSignedInAdmin();
  if (admin) {
    redirect("/admin");
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-ink-100 px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/logo.png"
            alt=""
            width={80}
            height={80}
            priority
            className="h-20 w-20 rounded-full bg-white object-contain"
          />
          <h1 className="mt-5 text-3xl">{BUSINESS_NAME}</h1>
          <p className="mt-1 text-sm text-text-muted">Admin dashboard</p>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-surface p-6 shadow-card">
          <AdminLoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-text-muted">
          This area holds customer names, phone numbers and travel dates.
          Do not sign in on a shared computer.
        </p>
      </div>
    </div>
  );
}
