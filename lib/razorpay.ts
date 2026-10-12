// The Razorpay client and the rupee/paise conversion.
//
// This file deliberately does NOT contain signature verification. That
// is written by hand in Phase 4, by the project owner. See the note at
// the bottom of this file for which secret verifies which signature,
// because getting those two crossed is the easiest way to accept a
// forged payment.

// Fails the build if this module is ever imported from a "use client"
// file. RAZORPAY_KEY_SECRET must never reach the browser, and this is
// the cheapest way to make that a compile error instead of a leak.
import "server-only";

import Razorpay from "razorpay";

// The rupee/paise conversion lives in lib/money.ts, not here. This file
// is server-only, and that makes it unimportable from a client component
// and unrunnable from a plain node script. The conversion needs to be
// usable in both, and it holds no secrets, so it is kept separate.

// ---------------------------------------------------------------------
// The client
// ---------------------------------------------------------------------

function readRazorpayCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  // Two separate checks so the log says which variable is missing
  // rather than just "Razorpay is not configured".
  if (!keyId) {
    throw new Error(
      "RAZORPAY_KEY_ID is not set. Copy it from the Razorpay dashboard under Settings then API Keys, and add it to .env.",
    );
  }
  if (!keySecret) {
    throw new Error(
      "RAZORPAY_KEY_SECRET is not set. Copy it from the Razorpay dashboard under Settings then API Keys, and add it to .env. Never prefix it NEXT_PUBLIC_.",
    );
  }

  return { keyId, keySecret };
}

// Built once per server process and reused. Creating it lazily inside a
// function means a missing key fails on the first payment attempt with
// the message above, rather than crashing the whole app at startup
// including the pages that do not need Razorpay at all.
let cachedRazorpay: Razorpay | undefined;

export function getRazorpay(): Razorpay {
  if (!cachedRazorpay) {
    const { keyId, keySecret } = readRazorpayCredentials();
    cachedRazorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return cachedRazorpay;
}

// The key id is public: the Razorpay checkout script needs it in the
// browser. This is the ONLY Razorpay value that may be sent to a client
// component, and it must be passed down as a prop from a server
// component, never imported there.
export function getRazorpayPublicKeyId(): string {
  const { keyId } = readRazorpayCredentials();
  return keyId;
}

// ---------------------------------------------------------------------
// Signature verification: notes for Phase 4
// ---------------------------------------------------------------------
// There are two different signatures and they use two different secrets.
// Mixing them up means either rejecting every real payment, or worse,
// accepting a forged one.
//
// 1. Checkout callback, sent by the browser after the payment sheet
//    closes. Verify with RAZORPAY_KEY_SECRET over the exact string
//    `${razorpay_order_id}|${razorpay_payment_id}`.
//
// 2. Webhook, sent server to server by Razorpay. Verify with
//    RAZORPAY_WEBHOOK_SECRET over the RAW request body, exactly as
//    received. Read it with `await request.text()` and verify that
//    string. Parsing to JSON and re-stringifying changes the bytes and
//    the signature will never match.
//
// Both are HMAC SHA256, hex encoded. Compare with
// `crypto.timingSafeEqual` on equal-length buffers, not `===`.
//
// A booking is only ever marked paid after the webhook verifies. The
// checkout callback is a hint that payment probably succeeded; the
// webhook is the authority.
