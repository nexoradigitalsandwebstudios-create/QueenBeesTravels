// Razorpay signature verification.
//
// There are TWO signatures and they use TWO different secrets. Mixing
// them up either rejects every real payment or, far worse, accepts a
// forged one. Both live here so the difference is visible at a glance.
//
//   Checkout callback: sent by the BROWSER after the payment sheet
//   closes. Signed with RAZORPAY_KEY_SECRET over `orderId|paymentId`.
//   A valid one means "payment probably succeeded", nothing more.
//
//   Webhook: sent SERVER TO SERVER by Razorpay. Signed with
//   RAZORPAY_WEBHOOK_SECRET over the RAW request body. This is the only
//   authority for marking a booking paid.
//
// The maths lives in lib/hmac.ts, which has no secrets and can be
// tested. This file only looks up which secret to use.

import "server-only";

import {
  checkoutSignaturePayload,
  verifyHmacSignature,
} from "@/lib/hmac";

function readSecret(name: "RAZORPAY_KEY_SECRET" | "RAZORPAY_WEBHOOK_SECRET") {
  const secret = process.env[name];
  if (!secret) {
    throw new Error(
      `${name} is not set, so no payment can be verified. Add it to .env from the Razorpay dashboard. Never prefix it NEXT_PUBLIC_.`,
    );
  }
  return secret;
}

export function verifyCheckoutSignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): boolean {
  if (!params.razorpayOrderId || !params.razorpayPaymentId) {
    return false;
  }

  return verifyHmacSignature({
    secret: readSecret("RAZORPAY_KEY_SECRET"),
    payload: checkoutSignaturePayload(
      params.razorpayOrderId,
      params.razorpayPaymentId,
    ),
    signature: params.razorpaySignature,
  });
}

// `rawBody` must be the exact bytes Razorpay sent, read with
// `await request.text()`. Parsing to JSON and re-stringifying changes
// key order and whitespace, and the signature will never match.
export function verifyWebhookSignature(params: {
  rawBody: string;
  signature: string;
}): boolean {
  return verifyHmacSignature({
    secret: readSecret("RAZORPAY_WEBHOOK_SECRET"),
    payload: params.rawBody,
    signature: params.signature,
  });
}
