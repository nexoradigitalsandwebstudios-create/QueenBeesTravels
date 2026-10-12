// Proves that nothing behind /admin is reachable without signing in.
//
// Start the dev server first, then:
//
//     npm run check:admin-auth
//
// These screens hold women's names, phone numbers and travel dates. A
// missing guard here is the worst bug this project could ship, and it
// is invisible when you are already logged in, which is exactly how it
// would reach production.

import "dotenv/config";
import { prisma } from "../lib/prisma";

const BASE_URL = process.env.CHECK_BASE_URL ?? "http://localhost:3000";

// Matches the seed. Override if the local admin was changed.
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@queenbees.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "queenbees-dev-only";

const ADMIN_PAGES = [
  "/admin",
  "/admin/trips",
  "/admin/trips/new",
  "/admin/waitlist",
  "/admin/enquiries",
  "/admin/reviews",
  "/admin/faqs",
  "/admin/settings",
];

let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label}  actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`,
  );
}

// redirect: "manual" so a redirect to the login page is visible as a
// redirect rather than silently followed and reported as a 200.
async function fetchPage(path: string, cookie?: string) {
  const response = await fetch(`${BASE_URL}${path}`, {
    redirect: "manual",
    headers: cookie ? { cookie } : {},
  });
  return response;
}

function isBlocked(status: number): boolean {
  // A redirect to login, or an outright refusal. Next renders a
  // server-side redirect() as a 307 or 308.
  return status === 307 || status === 308 || status === 302 || status === 401;
}

async function main() {
  // A real customer name to hunt for in signed-out responses. If any
  // appears, something leaked.
  const sampleBooking = await prisma.booking.findFirst({
    select: { customerName: true, phone: true, bookingRef: true },
  });

  console.log("--- signed out ---");

  for (const page of ADMIN_PAGES) {
    const response = await fetchPage(page);
    check(`${page} is blocked`, isBlocked(response.status), true);
  }

  const exportResponse = await fetchPage("/api/admin/bookings/export");
  check("CSV export is blocked", isBlocked(exportResponse.status), true);

  const uploadResponse = await fetch(`${BASE_URL}/api/admin/images`, {
    method: "POST",
    redirect: "manual",
    body: new FormData(),
  });
  check(
    "image upload is blocked",
    isBlocked(uploadResponse.status) || uploadResponse.status >= 400,
    true,
  );

  // The login page itself must stay reachable, or nobody can ever get in.
  const loginPage = await fetchPage("/admin/login");
  check("the login page is reachable", loginPage.status, 200);

  // Nothing signed out may contain customer data.
  if (sampleBooking) {
    const bodies = await Promise.all(
      ADMIN_PAGES.map(async (page) => (await fetchPage(page)).text()),
    );
    const leaked = bodies.some(
      (body) =>
        body.includes(sampleBooking.customerName) ||
        body.includes(sampleBooking.phone) ||
        body.includes(sampleBooking.bookingRef),
    );
    check("no customer data appears while signed out", leaked, false);
  }

  console.log("\n--- wrong credentials ---");

  const badLogin = await fetch(`${BASE_URL}/api/admin/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: "not-the-password" }),
  });
  check("a wrong password is refused", badLogin.status, 401);

  const unknownEmail = await fetch(`${BASE_URL}/api/admin/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "nobody@example.com", password: "whatever" }),
  });
  check("an unknown email is refused", unknownEmail.status, 401);
  check(
    "both refusals give the SAME message, so emails cannot be discovered",
    (await badLogin.json()).error === (await unknownEmail.json()).error,
    true,
  );

  console.log("\n--- signed in ---");

  const goodLogin = await fetch(`${BASE_URL}/api/admin/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  check("the right password is accepted", goodLogin.status, 200);

  const setCookie = goodLogin.headers.get("set-cookie") ?? "";
  check("a session cookie was set", setCookie.includes("queenbees_admin"), true);
  check("the cookie is httpOnly", /httponly/i.test(setCookie), true);
  check("the cookie is sameSite lax", /samesite=lax/i.test(setCookie), true);

  const cookie = setCookie.split(";")[0];

  for (const page of ADMIN_PAGES) {
    const response = await fetchPage(page, cookie);
    check(`${page} loads when signed in`, response.status, 200);
  }

  const csv = await fetchPage("/api/admin/bookings/export", cookie);
  check("CSV export works when signed in", csv.status, 200);
  const csvBody = await csv.text();
  check(
    "the CSV has a header row",
    csvBody.includes("Booking reference"),
    true,
  );
  check(
    "the CSV is marked no-store so it is never cached",
    (csv.headers.get("cache-control") ?? "").includes("no-store"),
    true,
  );

  await prisma.$disconnect();
  console.log(
    failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (error) => {
  console.error("failed:", error instanceof Error ? error.message : error);
  await prisma.$disconnect();
  process.exit(1);
});
