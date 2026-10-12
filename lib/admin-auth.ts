// The gate on every admin screen.
//
// Admin pages hold women's names, phone numbers and travel dates, so
// nothing behind /admin may render without a session. Each page calls
// requireAdmin() as its first line rather than relying on a proxy or
// middleware: a page that forgets the call is a visible missing line in
// that file, whereas a route that silently falls outside a matcher
// pattern is invisible until somebody finds it.

import "server-only";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";

export type SignedInAdmin = {
  adminUserId: string;
  email: string;
};

// Returns the signed-in admin, or sends the visitor to the login page.
// It never returns null, so a caller cannot accidentally carry on with
// no session.
export async function requireAdmin(): Promise<SignedInAdmin> {
  const session = await getAdminSession();

  if (!session.isLoggedIn || !session.adminUserId || !session.email) {
    redirect("/admin/login");
  }

  return { adminUserId: session.adminUserId, email: session.email };
}

// For ROUTE HANDLERS, which must not use requireAdmin().
//
// requireAdmin() calls redirect(), and redirect() works by throwing a
// control-flow error that Next catches further up. A route handler
// wraps its body in try/catch, so that throw lands in the catch and
// becomes a 500 instead of a redirect. The data stays safe either way,
// but the caller gets a misleading error.
//
// A redirect is also the wrong answer for an API: a fetch asking for a
// CSV cannot do anything useful with an HTML login page. 401 is the
// honest reply.
export async function getApiAdmin(): Promise<SignedInAdmin | null> {
  return getSignedInAdmin();
}

// For the login page itself, which must not bounce a signed-in admin
// back to a login form.
export async function getSignedInAdmin(): Promise<SignedInAdmin | null> {
  const session = await getAdminSession();

  if (!session.isLoggedIn || !session.adminUserId || !session.email) {
    return null;
  }

  return { adminUserId: session.adminUserId, email: session.email };
}

// Checks an email and password against the AdminUser table.
//
// Returns null for BOTH an unknown email and a wrong password, and
// compares against a dummy hash when the email is unknown. Without that
// dummy comparison an unknown email returns measurably faster than a
// known one, which tells an attacker which addresses are real.
//
// There is no public signup. Admins are created by the seed or by hand.
export async function verifyAdminCredentials(
  email: string,
  password: string,
): Promise<SignedInAdmin | null> {
  const admin = await prisma.adminUser.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, email: true, passwordHash: true },
  });

  if (!admin) {
    // A real bcrypt comparison against a throwaway hash, so the timing
    // of a wrong email matches the timing of a wrong password.
    await bcrypt.compare(
      password,
      "$2b$12$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ012",
    );
    return null;
  }

  const matches = await bcrypt.compare(password, admin.passwordHash);
  if (!matches) {
    return null;
  }

  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  return { adminUserId: admin.id, email: admin.email };
}
