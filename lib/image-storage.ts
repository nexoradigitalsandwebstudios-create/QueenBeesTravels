// Where uploaded trip photographs go.
//
// THIS IS THE ONE FILE TO CHANGE when a real storage service is chosen.
// Nothing else in the codebase knows where an image lives: the upload
// route calls storeImage() and gets back a path, and that path is what
// goes into Trip.images.
//
// Today it writes into public/images/uploads, which works perfectly in
// development and NOT AT ALL on most hosts: Vercel and similar run from
// a read-only filesystem, and even where a write succeeds the file
// disappears on the next deploy. So the production path throws with an
// explanation rather than appearing to work and losing the client's
// photographs a week later.
//
// To fix it, replace the body of storeImage with an upload to Neon
// object storage, Cloudflare R2 or Vercel Blob, and return the public
// url that service gives back. The route, the form and the database all
// stay exactly as they are.

import "server-only";

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

// Only formats a browser can display, checked against the real bytes
// below rather than against the name or the declared type.
const ALLOWED = [
  { extension: "jpg", mime: "image/jpeg", magic: [0xff, 0xd8, 0xff] },
  { extension: "png", mime: "image/png", magic: [0x89, 0x50, 0x4e, 0x47] },
  {
    extension: "webp",
    mime: "image/webp",
    // "RIFF", then four size bytes, then "WEBP".
    magic: [0x52, 0x49, 0x46, 0x46],
  },
];

export const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

const UPLOAD_DIRECTORY = path.join(process.cwd(), "public", "images", "uploads");
const PUBLIC_PREFIX = "/images/uploads";

export type StoreImageResult =
  | { ok: true; path: string }
  | { ok: false; error: string };

// A file's declared type is whatever the browser was told to send, so
// the first bytes are checked instead. Without this, a script renamed
// to .jpg would be served back to visitors from our own domain.
function detectFormat(bytes: Uint8Array) {
  for (const format of ALLOWED) {
    const matches = format.magic.every(
      (byte, index) => bytes[index] === byte,
    );
    if (matches) {
      return format;
    }
  }
  return null;
}

export async function storeImage(file: File): Promise<StoreImageResult> {
  if (file.size === 0) {
    return { ok: false, error: "That file is empty." };
  }

  if (file.size > MAX_IMAGE_BYTES) {
    const limitMb = Math.round(MAX_IMAGE_BYTES / (1024 * 1024));
    return {
      ok: false,
      error: `That photo is larger than ${limitMb}MB. Please resize it and try again.`,
    };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const format = detectFormat(bytes);

  if (!format) {
    return {
      ok: false,
      error: "That does not look like a JPEG, PNG or WebP photo.",
    };
  }

  // The filename is generated, never taken from the upload. A name like
  // "../../../app/page.tsx" would otherwise decide where the file lands.
  const name = `${crypto.randomBytes(12).toString("hex")}.${format.extension}`;

  if (process.env.NODE_ENV === "production") {
    return {
      ok: false,
      error:
        "Image upload is not configured for production yet. It needs an object storage service; see lib/image-storage.ts.",
    };
  }

  try {
    await fs.mkdir(UPLOAD_DIRECTORY, { recursive: true });
    await fs.writeFile(path.join(UPLOAD_DIRECTORY, name), bytes);
  } catch (error) {
    console.error("[images] could not write the upload:", error);
    return { ok: false, error: "We could not save that photo." };
  }

  return { ok: true, path: `${PUBLIC_PREFIX}/${name}` };
}
