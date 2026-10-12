// Money conversion and display.
//
// Every amount in this codebase is a whole number of rupees, stored in
// an Int column. Paise exist in exactly one place: the Razorpay API.
//
// This file holds no secrets and talks to nothing, so it can be imported
// anywhere, including a client component that needs to show a price.
// lib/razorpay.ts is server-only and cannot be, which is why the
// conversion lives here rather than next to the Razorpay client.

import { PAISE_PER_RUPEE } from "@/lib/constants";

// Call this at the Razorpay boundary and nowhere else.
export function rupeesToPaise(rupees: number): number {
  if (!Number.isInteger(rupees)) {
    throw new Error(
      `Refusing to convert a non-integer rupee amount to paise: ${rupees}. Money is stored as whole rupees, so this value came from the wrong place. Check whether it was computed from a Departure or taken from a request body.`,
    );
  }
  if (rupees < 0) {
    throw new Error(
      `Refusing to convert a negative rupee amount to paise: ${rupees}.`,
    );
  }
  return rupees * PAISE_PER_RUPEE;
}

// Call this on amounts coming back from Razorpay.
export function paiseToRupees(paise: number): number {
  if (!Number.isInteger(paise)) {
    throw new Error(`Razorpay returned a non-integer paise amount: ${paise}.`);
  }
  if (paise % PAISE_PER_RUPEE !== 0) {
    throw new Error(
      `Razorpay returned ${paise} paise, which is not a whole number of rupees. Check whether this amount was created by this application.`,
    );
  }
  return paise / PAISE_PER_RUPEE;
}

// One formatter for the whole site, so a price never appears as 8500 on
// one page and 8,500.00 on another. Produces the Indian digit grouping:
// 1,50,000 rather than 150,000.
export function formatRupees(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}
