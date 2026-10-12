// Signing out. POST rather than GET, so a stray link or a prefetch can
// never log somebody out.

import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/session";

export async function POST() {
  try {
    const session = await getAdminSession();
    const email = session.email ?? "unknown";
    session.destroy();

    console.log(`[admin] ${email} signed out`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin] logout failed:", error);
    return NextResponse.json(
      { error: "We could not sign you out." },
      { status: 500 },
    );
  }
}
