// Signing an admin in. There is no signup route, by design: admins are
// created by the seed or by hand in the database.

import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyAdminCredentials } from "@/lib/admin-auth";
import { getAdminSession } from "@/lib/session";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export async function POST(request: Request) {
  try {
    const parsed = loginSchema.safeParse(await request.json());

    if (!parsed.success) {
      // Deliberately vague even in development. A login form is the one
      // place where telling somebody exactly what was wrong with their
      // input helps an attacker more than it helps a user.
      return NextResponse.json(
        { error: "Enter your email and password." },
        { status: 400 },
      );
    }

    const admin = await verifyAdminCredentials(
      parsed.data.email,
      parsed.data.password,
    );

    if (!admin) {
      // One message for an unknown email and a wrong password, so this
      // cannot be used to discover which addresses exist.
      console.warn(
        `[admin] failed login attempt for ${parsed.data.email.slice(0, 40)}`,
      );
      return NextResponse.json(
        { error: "That email and password do not match." },
        { status: 401 },
      );
    }

    const session = await getAdminSession();
    session.adminUserId = admin.adminUserId;
    session.email = admin.email;
    session.isLoggedIn = true;
    await session.save();

    console.log(`[admin] ${admin.email} signed in`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin] login failed:", error);
    return NextResponse.json(
      { error: "We could not sign you in. Please try again." },
      { status: 500 },
    );
  }
}
