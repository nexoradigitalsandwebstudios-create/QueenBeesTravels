// Booking references.
//
// A reference is what a customer reads out on WhatsApp and what the
// client searches for in the admin. It is not a security token: knowing
// one must never grant access to anything.

import crypto from "node:crypto";

import { BOOKING_REF_PREFIX } from "@/lib/constants";

// No 0/O, 1/I/L, 5/S, 8/B. Those are the pairs people get wrong reading
// a reference aloud down a phone line, which is exactly how these get
// used here.
const UNAMBIGUOUS = "234679ACDEFGHJKMNPQRTUVWXYZ";

const REFERENCE_LENGTH = 6;

// crypto.randomInt rather than Math.random: not because a reference is
// secret, but because Math.random can repeat across processes started in
// the same millisecond, and a duplicate reference is a confusing support
// call. The caller still handles a collision.
export function generateBookingReference(): string {
  let code = "";
  for (let index = 0; index < REFERENCE_LENGTH; index += 1) {
    code += UNAMBIGUOUS[crypto.randomInt(0, UNAMBIGUOUS.length)];
  }
  return `${BOOKING_REF_PREFIX}-${code}`;
}
