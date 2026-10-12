// The signature maths, with no secrets of its own.
//
// Separated from lib/razorpay-signature.ts so it can be tested: that
// file is server-only, which makes it unimportable from a plain script,
// and the one piece of this codebase most worth testing is whether a
// forged signature is rejected.
//
// Nothing here reads an environment variable. The caller passes the
// secret in, which also means a test can use a known secret and compare
// against values computed independently.

import crypto from "node:crypto";

export function computeHmacHex(secret: string, payload: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

// Constant-time comparison. A plain === leaks, through how long it takes
// to fail, how many leading characters of a guess were correct, which is
// enough to reconstruct a signature one character at a time.
//
// timingSafeEqual throws when the two buffers differ in length, so the
// lengths are checked first. That check is not itself a secret: a
// Razorpay signature is always 64 hex characters, so a different length
// means a malformed request rather than a near miss.
export function signaturesMatch(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(received, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function verifyHmacSignature(params: {
  secret: string;
  payload: string;
  signature: string;
}): boolean {
  // An empty payload or signature is never valid. Without this, an
  // empty secret and an empty signature would agree with each other.
  if (!params.payload || !params.signature) {
    return false;
  }

  return signaturesMatch(
    computeHmacHex(params.secret, params.payload),
    params.signature,
  );
}

// The exact string Razorpay signs for a checkout callback. The
// separator is a literal pipe and the order matters.
export function checkoutSignaturePayload(
  razorpayOrderId: string,
  razorpayPaymentId: string,
): string {
  return `${razorpayOrderId}|${razorpayPaymentId}`;
}
