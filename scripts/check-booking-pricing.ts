// Rule 1 in isolation: the charge is a function of the Departure row
// and the traveller count, and nothing else can reach it.
//
// No network, no database. Run with: npm run check:booking-pricing

import { computeBookingCharge } from "../lib/booking-pricing";
import { rupeesToPaise } from "../lib/money";

let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}  actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`);
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

const departure = { pricePerPerson: 9400, advanceAmount: 3000 };

check("one traveller", computeBookingCharge({ ...departure, travellerCount: 1 }), { totalAmount: 9400, advanceDue: 3000 });
check("three travellers", computeBookingCharge({ ...departure, travellerCount: 3 }), { totalAmount: 28200, advanceDue: 9000 });

// The signature has no parameter a request body could use. Extra keys
// are simply not read, which is the structural form of rule 1.
const hostile = { ...departure, travellerCount: 2, amount: 1, totalAmount: 1, advanceDue: 1, pricePerPerson_: 1 };
check("extra keys on the input change nothing", computeBookingCharge(hostile), { totalAmount: 18800, advanceDue: 6000 });

checkThrows("fractional price rejected", () => computeBookingCharge({ pricePerPerson: 100.5, advanceAmount: 50, travellerCount: 1 }));
checkThrows("negative price rejected", () => computeBookingCharge({ pricePerPerson: -100, advanceAmount: 0, travellerCount: 1 }));
checkThrows("zero travellers rejected", () => computeBookingCharge({ ...departure, travellerCount: 0 }));
checkThrows("fractional traveller count rejected", () => computeBookingCharge({ ...departure, travellerCount: 1.5 }));
checkThrows("advance larger than the trip rejected", () => computeBookingCharge({ pricePerPerson: 1000, advanceAmount: 5000, travellerCount: 1 }));

// Rule 7: paise appear only at the boundary, and the conversion is exact.
const charge = computeBookingCharge({ ...departure, travellerCount: 2 });
check("advance converts to exact paise", rupeesToPaise(charge.advanceDue), 600000);
check("the stored figure stays in rupees", charge.advanceDue, 6000);

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
