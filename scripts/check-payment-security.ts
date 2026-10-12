// The checks that matter most in this codebase.
//
// A bug here does not make the site look wrong, it lets somebody book a
// seat without paying. Run after any change to lib/hmac.ts,
// lib/razorpay-signature.ts or either payment route:
//
//     npm run check:payment-security

import crypto from "node:crypto";

import {
  checkoutSignaturePayload,
  computeHmacHex,
  signaturesMatch,
  verifyHmacSignature,
} from "../lib/hmac";

let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label}  actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`,
  );
}

const KEY_SECRET = "test_key_secret_abc123";
const WEBHOOK_SECRET = "test_webhook_secret_xyz789";

// --- 1. A known vector, computed independently -----------------------
// If this ever changes, the algorithm changed, and every real payment
// is about to be rejected.
const knownPayload = "order_ABC123|pay_XYZ789";
const independentlyComputed = crypto
  .createHmac("sha256", KEY_SECRET)
  .update(knownPayload)
  .digest("hex");
check(
  "hmac matches an independently computed value",
  computeHmacHex(KEY_SECRET, knownPayload),
  independentlyComputed,
);
check("signature is 64 hex characters", independentlyComputed.length, 64);

// --- 2. The checkout payload format ----------------------------------
// Razorpay signs exactly `order_id|payment_id`. Reversing them or using
// a different separator rejects every genuine payment.
check(
  "checkout payload is orderId pipe paymentId",
  checkoutSignaturePayload("order_ABC123", "pay_XYZ789"),
  "order_ABC123|pay_XYZ789",
);

// --- 3. A genuine signature is accepted ------------------------------
const genuine = computeHmacHex(KEY_SECRET, knownPayload);
check(
  "a genuine signature verifies",
  verifyHmacSignature({ secret: KEY_SECRET, payload: knownPayload, signature: genuine }),
  true,
);

// --- 4. Forgeries are rejected ---------------------------------------
check(
  "a signature made with the wrong secret is rejected",
  verifyHmacSignature({
    secret: KEY_SECRET,
    payload: knownPayload,
    signature: computeHmacHex(WEBHOOK_SECRET, knownPayload),
  }),
  false,
);

check(
  "a tampered payload is rejected",
  verifyHmacSignature({
    secret: KEY_SECRET,
    payload: "order_ABC123|pay_SOMEONE_ELSE",
    signature: genuine,
  }),
  false,
);

check(
  "one flipped character in the signature is rejected",
  verifyHmacSignature({
    secret: KEY_SECRET,
    payload: knownPayload,
    signature: (genuine[0] === "a" ? "b" : "a") + genuine.slice(1),
  }),
  false,
);

check(
  "an empty signature is rejected",
  verifyHmacSignature({ secret: KEY_SECRET, payload: knownPayload, signature: "" }),
  false,
);

check(
  "an empty payload is rejected",
  verifyHmacSignature({ secret: KEY_SECRET, payload: "", signature: genuine }),
  false,
);

check(
  "a short signature is rejected rather than throwing",
  verifyHmacSignature({ secret: KEY_SECRET, payload: knownPayload, signature: "abc" }),
  false,
);

check(
  "a very long signature is rejected rather than throwing",
  verifyHmacSignature({
    secret: KEY_SECRET,
    payload: knownPayload,
    signature: "a".repeat(5000),
  }),
  false,
);

// --- 5. Length mismatch must not throw -------------------------------
// crypto.timingSafeEqual throws on unequal lengths. If that ever reaches
// the route it becomes a 500, and a 500 makes Razorpay retry forever.
let threw = false;
try {
  signaturesMatch("short", "a much longer string entirely");
} catch {
  threw = true;
}
check("comparing different lengths does not throw", threw, false);

// --- 6. The webhook signs the RAW body, not re-serialised JSON -------
// This is rule 2 and the single easiest thing to get wrong. Razorpay
// sends bytes; JSON.parse then JSON.stringify gives different bytes.
const rawWebhookBody =
  '{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_1","amount":250000}}}}';
const webhookSignature = computeHmacHex(WEBHOOK_SECRET, rawWebhookBody);

check(
  "the raw body verifies",
  verifyHmacSignature({
    secret: WEBHOOK_SECRET,
    payload: rawWebhookBody,
    signature: webhookSignature,
  }),
  true,
);

// A round trip through JSON.parse and JSON.stringify happens to produce
// identical bytes for this compact example, which is exactly why the
// mistake is easy to make and survives a casual test. The two checks
// below use the cases where it does not: added whitespace, and reordered
// keys. Both are things a real sender or proxy can introduce.
const prettyBody = JSON.stringify(JSON.parse(rawWebhookBody), null, 2);
check(
  "a reformatted body fails against the raw-body signature",
  verifyHmacSignature({
    secret: WEBHOOK_SECRET,
    payload: prettyBody,
    signature: webhookSignature,
  }),
  false,
);

check(
  "key order changes break the signature",
  verifyHmacSignature({
    secret: WEBHOOK_SECRET,
    payload: '{"payload":{"payment":{"entity":{"id":"pay_1","amount":250000}}},"event":"payment.captured"}',
    signature: webhookSignature,
  }),
  false,
);

// --- 7. The two secrets are not interchangeable ----------------------
check(
  "a webhook signature does not verify as a checkout signature",
  verifyHmacSignature({
    secret: KEY_SECRET,
    payload: rawWebhookBody,
    signature: webhookSignature,
  }),
  false,
);

console.log(
  failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`,
);
process.exit(failures === 0 ? 0 : 1);
