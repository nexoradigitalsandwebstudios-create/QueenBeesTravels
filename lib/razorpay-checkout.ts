// Opening the Razorpay checkout sheet in the browser.
//
// Client-safe by construction: the only Razorpay value here is the
// public key id, which is passed in from the server. The key SECRET is
// never referenced in this file and must never be.
//
// Separated from the form component so the form is about collecting
// details and this is about talking to Razorpay.

export type CheckoutResult = {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
};

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; contact: string; email?: string };
  notes: Record<string, string>;
  theme: { color: string };
  handler: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  modal: { ondismiss: () => void };
};

type RazorpayConstructor = new (options: RazorpayCheckoutOptions) => {
  open: () => void;
  on: (event: string, handler: (response: unknown) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

const CHECKOUT_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

// The script is loaded on demand rather than on every page, because most
// visitors never reach a payment and it is not a small file.
export function loadRazorpayCheckout(): Promise<RazorpayConstructor> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${CHECKOUT_SCRIPT_SRC}"]`,
    );

    function onLoaded() {
      if (window.Razorpay) {
        resolve(window.Razorpay);
      } else {
        reject(new Error("Razorpay checkout loaded but did not register."));
      }
    }

    if (existing) {
      existing.addEventListener("load", onLoaded, { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Razorpay checkout script failed to load.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = CHECKOUT_SCRIPT_SRC;
    script.async = true;
    script.addEventListener("load", onLoaded, { once: true });
    script.addEventListener("error", () =>
      reject(new Error("Razorpay checkout script failed to load.")),
    );
    document.body.appendChild(script);
  });
}

// Resolves with the three values the server needs to verify, or null if
// the customer closed the sheet without paying. Closing is a normal
// thing to do, not an error, so it is not thrown.
export function openRazorpayCheckout(params: {
  razorpayKeyId: string;
  razorpayOrderId: string;
  amountInPaise: number;
  tripTitle: string;
  bookingRef: string;
  customerName: string;
  phone: string;
  email?: string;
}): Promise<CheckoutResult | null> {
  return new Promise((resolve, reject) => {
    loadRazorpayCheckout()
      .then((Razorpay) => {
        let settled = false;

        const checkout = new Razorpay({
          key: params.razorpayKeyId,
          amount: params.amountInPaise,
          currency: "INR",
          name: "Queen Bees Travels",
          description: `${params.tripTitle} (${params.bookingRef})`,
          order_id: params.razorpayOrderId,
          prefill: {
            name: params.customerName,
            contact: params.phone,
            email: params.email,
          },
          notes: { bookingRef: params.bookingRef },
          // The brand magenta, so the sheet does not look like a
          // different company's.
          theme: { color: "#b8156a" },
          handler: (response) => {
            settled = true;
            resolve({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
          },
          modal: {
            ondismiss: () => {
              if (!settled) {
                resolve(null);
              }
            },
          },
        });

        checkout.on("payment.failed", () => {
          settled = true;
          reject(
            new Error(
              "The payment did not go through. Your seats are still held for a few minutes, so you can try again.",
            ),
          );
        });

        checkout.open();
      })
      .catch(reject);
  });
}
