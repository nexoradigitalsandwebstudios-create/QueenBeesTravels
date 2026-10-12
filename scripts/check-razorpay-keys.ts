// Are the Razorpay keys in .env actually working?
//
//     npm run check:razorpay
//
// Makes one harmless authenticated read against Razorpay and reports
// whether the id and secret are accepted. It creates nothing, charges
// nothing, and never prints either value.
//
// Worth running before wondering why the checkout sheet will not open:
// the sheet is only reached AFTER the server has created an order, and
// creating an order needs both halves of the key pair.

import "dotenv/config";

// Which methods the checkout sheet will actually offer. This is decided
// entirely by the Razorpay account, not by this codebase: the checkout
// options in lib/razorpay-checkout.ts set no `method` restriction, so
// anything enabled on the account shows up automatically.
//
// Worth checking because UPI is how most people in India pay, and a new
// Razorpay account often has it switched off while cards work fine,
// which looks like a bug in the site and is not one.
async function reportPaymentMethods(keyId: string) {
  let methods: Record<string, unknown>;
  try {
    const response = await fetch(
      `https://api.razorpay.com/v1/preferences?key_id=${encodeURIComponent(keyId)}`,
    );
    const body = (await response.json()) as { methods?: Record<string, unknown> };
    if (!body.methods) {
      console.log("\nCould not read the enabled payment methods.");
      return;
    }
    methods = body.methods;
  } catch {
    console.log("\nCould not read the enabled payment methods.");
    return;
  }

  // A method is "on" when it is true, or an object listing providers.
  function isEnabled(key: string): boolean {
    const value = methods[key];
    if (value === true) return true;
    if (value && typeof value === "object") {
      return Object.keys(value as object).length > 0;
    }
    return false;
  }

  console.log("\nPayment methods the checkout sheet will offer:");
  for (const key of ["upi", "card", "netbanking", "wallet", "emi", "paylater"]) {
    console.log(`  ${key.padEnd(12)}${isEnabled(key) ? "enabled" : "OFF"}`);
  }

  if (!isEnabled("upi")) {
    console.log(
      "\nUPI is OFF on this Razorpay account. Nothing in this codebase disables it.",
    );
    console.log(
      "Enable it in the Razorpay dashboard under Account & Settings, Payment Methods.",
    );
    console.log(
      "If the toggle is unavailable, the account activation or KYC is not finished yet; UPI is commonly withheld until then while cards still work.",
    );
    console.log(
      "For an Indian travel business this matters: most customers will expect to pay by UPI.",
    );
  }
}

async function main() {
  const keyId = process.env.RAZORPAY_KEY_ID ?? "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET ?? "";

  if (!keyId || !keySecret) {
    console.log("RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing from .env.");
    process.exit(1);
  }

  if (keyId.includes("REPLACE_ME") || keySecret.includes("REPLACE_ME")) {
    console.log(
      "Still the placeholders. Put your real test keys in .env, not in .env.example.",
    );
    process.exit(1);
  }

  const mode = keyId.startsWith("rzp_live_") ? "LIVE" : "test";
  console.log(`key id ${keyId.slice(0, 9)}... (${mode} mode), secret ${keySecret.length} characters`);

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  let response: Response;
  try {
    response = await fetch("https://api.razorpay.com/v1/orders?count=1", {
      headers: { Authorization: `Basic ${auth}` },
    });
  } catch (error) {
    console.log(
      `Could not reach Razorpay: ${error instanceof Error ? error.message : error}`,
    );
    process.exit(1);
  }

  if (response.ok) {
    console.log("\nAUTH OK. These keys work, so the checkout sheet will open.");
    if (mode === "LIVE") {
      console.log(
        "WARNING: these are LIVE keys. Real cards will be charged real money.",
      );
    }
    await reportPaymentMethods(keyId);
    process.exit(0);
  }

  const body = await response.text();
  let description = body.slice(0, 200);
  try {
    const parsed = JSON.parse(body);
    description = parsed?.error?.description ?? description;
  } catch {
    // keep the raw text
  }

  console.log(`\nAUTH FAILED (${response.status}): ${description}`);
  console.log(
    "\nThe id and secret almost certainly come from different key pairs. Razorpay reveals a key secret exactly once, when it is generated, so an older secret is dead the moment the key is regenerated.",
  );
  console.log(
    "Fix: Razorpay dashboard, Settings, API Keys, regenerate the test key, and copy BOTH halves in one go into .env.",
  );
  process.exit(1);
}

main();
