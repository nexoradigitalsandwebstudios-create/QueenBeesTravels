// The admin session cookie.
//
// Only the admin area uses this. Public pages have no session at all,
// because no visitor ever logs in.

// SESSION_SECRET must never reach the browser. This makes importing this
// file from a "use client" component a build error.
import "server-only";

import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";

// What is stored inside the encrypted cookie. Keep it small: the whole
// thing travels on every request. The admin's email is here only so the
// dashboard can greet them without a database lookup.
export type AdminSessionData = {
  adminUserId?: string;
  email?: string;
  isLoggedIn?: boolean;
};

// The admin stays signed in for half a day. Short on purpose: this
// session opens customer names, phone numbers and travel dates, and the
// client may well be on a shared or family laptop. Raise it only if the
// client asks and understands that.
const SESSION_TTL_SECONDS = 60 * 60 * 12;

function readSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error(
      'SESSION_SECRET is not set. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))" and add it to .env',
    );
  }

  // iron-session refuses anything shorter, but its own error does not
  // say where to look, so check it here where the fix is obvious.
  if (secret.length < 32) {
    throw new Error(
      `SESSION_SECRET is only ${secret.length} characters. It must be at least 32. Generate a new one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`,
    );
  }

  return secret;
}

function buildSessionOptions(): SessionOptions {
  return {
    password: readSessionSecret(),
    cookieName: "queenbees_admin",
    ttl: SESSION_TTL_SECONDS,
    cookieOptions: {
      // Not readable by JavaScript, so a cross-site scripting bug on the
      // admin pages cannot steal the session.
      httpOnly: true,
      // Sent over plain HTTP in local development only. In production
      // this must be true or the cookie travels in the clear.
      secure: process.env.NODE_ENV === "production",
      // The admin area is reached by typing the address or following an
      // internal link, never from another site, so there is no reason to
      // send this cookie on cross-site requests.
      sameSite: "lax",
      path: "/",
    },
  };
}

// Reads the session for the current request. In Next.js 16 `cookies()`
// is async, so this must be awaited.
//
// The returned object has `.save()` and `.destroy()` on it: `.save()`
// after setting fields on login, `.destroy()` on logout.
export async function getAdminSession() {
  const cookieStore = await cookies();
  return getIronSession<AdminSessionData>(cookieStore, buildSessionOptions());
}
