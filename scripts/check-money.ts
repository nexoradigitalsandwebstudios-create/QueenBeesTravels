import "dotenv/config";
import { paiseToRupees, rupeesToPaise } from "../lib/money";

// Money bugs are the expensive kind, so the conversion at the Razorpay
// boundary gets its own check.

let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label}  actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`,
  );
}

function checkThrows(label: string, run: () => unknown) {
  try {
    run();
    failures += 1;
    console.log(`FAIL  ${label}  (expected it to throw, it did not)`);
  } catch {
    console.log(`PASS  ${label}  (threw as expected)`);
  }
}

check("2500 rupees becomes 250000 paise", rupeesToPaise(2500), 250000);
check("0 rupees becomes 0 paise", rupeesToPaise(0), 0);
check("8500 rupees becomes 850000 paise", rupeesToPaise(8500), 850000);

check("250000 paise becomes 2500 rupees", paiseToRupees(250000), 2500);
check("0 paise becomes 0 rupees", paiseToRupees(0), 0);

// A fractional rupee amount means the value came from somewhere it
// should not have, so it must not be silently rounded into a charge.
checkThrows("fractional rupees is rejected", () => rupeesToPaise(2500.5));
checkThrows("paise that is not whole rupees is rejected", () =>
  paiseToRupees(250050),
);

// A round trip must never change the number.
const roundTripped = paiseToRupees(rupeesToPaise(9500));
check("9500 survives a round trip", roundTripped, 9500);

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
