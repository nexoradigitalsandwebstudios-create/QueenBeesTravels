"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

// Every screen the client needs, in the order she will use them. The
// bookings list is first because it is the one she opens daily.
const ADMIN_LINKS = [
  { href: "/admin", label: "Bookings" },
  { href: "/admin/trips", label: "Trips" },
  { href: "/admin/waitlist", label: "Waitlist" },
  { href: "/admin/enquiries", label: "Enquiries" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/faqs", label: "Questions" },
  { href: "/admin/settings", label: "Settings" },
];

// A client component because signing out is a POST and the active link
// depends on the current path. Nothing secret passes through it: the
// email shown is already in this admin's own session.
export function AdminNav({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  function isActive(href: string): boolean {
    // /admin would otherwise match every page beneath it.
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  }

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
        <Link href="/admin" className="flex items-center gap-2.5 no-underline">
          <Image
            src="/bee.png"
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
          />
          <span className="font-display text-lg font-semibold text-ink-900">
            Queen Bees admin
          </span>
        </Link>

        <div className="order-last flex w-full items-center gap-4 overflow-x-auto sm:order-none sm:w-auto">
          <nav aria-label="Admin">
            <ul className="flex items-center gap-1 text-sm font-semibold">
              {ADMIN_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={isActive(link.href) ? "page" : undefined}
                    className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-3 no-underline transition-colors ${
                      isActive(link.href)
                        ? "bg-magenta-50 text-magenta-700"
                        : "text-text-muted hover:text-magenta-600"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-xs text-text-muted sm:inline">
            {email}
          </span>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="inline-flex min-h-11 items-center rounded-full border border-ink-300 px-4 text-sm font-semibold text-text-strong transition-colors hover:border-magenta-300 disabled:opacity-60"
          >
            {signingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </div>
    </header>
  );
}
