// What a booking costs.
//
// Pulled out of the booking route so it can be tested without a network
// call to Razorpay. This is rule 1 in one function: both inputs come
// from a Departure row that was read server-side, and there is no
// parameter here that a request body could reach.
//
// Everything is whole rupees. Paise appear only at the Razorpay call.

export type BookingCharge = {
  // What the whole trip costs for this party.
  totalAmount: number;
  // What they pay now to hold the seats.
  advanceDue: number;
};

export function computeBookingCharge(params: {
  pricePerPerson: number;
  advanceAmount: number;
  travellerCount: number;
}): BookingCharge {
  const { pricePerPerson, advanceAmount, travellerCount } = params;

  // These come from the database, so a failure here means a Departure
  // row is wrong, not that a customer sent something odd. Failing loudly
  // beats charging a number nobody meant.
  if (!Number.isInteger(pricePerPerson) || pricePerPerson < 0) {
    throw new Error(
      `Departure has an invalid pricePerPerson: ${pricePerPerson}. Money is stored as whole rupees.`,
    );
  }
  if (!Number.isInteger(advanceAmount) || advanceAmount < 0) {
    throw new Error(
      `Departure has an invalid advanceAmount: ${advanceAmount}. Money is stored as whole rupees.`,
    );
  }
  if (!Number.isInteger(travellerCount) || travellerCount < 1) {
    throw new Error(`Invalid travellerCount: ${travellerCount}.`);
  }
  if (advanceAmount > pricePerPerson) {
    throw new Error(
      `Departure advanceAmount (${advanceAmount}) is more than pricePerPerson (${pricePerPerson}). Refusing to charge an advance larger than the trip.`,
    );
  }

  return {
    totalAmount: pricePerPerson * travellerCount,
    advanceDue: advanceAmount * travellerCount,
  };
}
