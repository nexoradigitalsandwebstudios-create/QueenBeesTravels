// Uploading a trip photograph.
//
// Admin only: an open upload endpoint is somewhere to park anything at
// all on somebody else's domain.

import { NextResponse } from "next/server";

import { getApiAdmin } from "@/lib/admin-auth";
import { storeImage } from "@/lib/image-storage";

export async function POST(request: Request) {
  try {
    const admin = await getApiAdmin();
    if (!admin) {
      console.warn("[images] upload refused: not signed in");
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No file was sent." },
        { status: 400 },
      );
    }

    const result = await storeImage(file);

    if (!result.ok) {
      console.warn(`[images] upload rejected: ${result.error}`);
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    console.log(`[images] stored ${result.path}`);
    return NextResponse.json({ path: result.path });
  } catch (error) {
    console.error("[images] upload failed:", error);
    return NextResponse.json(
      { error: "We could not upload that photo." },
      { status: 500 },
    );
  }
}
