// Sample trip content for local development.
//
// These are real Queen Bees destinations with the client's own
// photographs, so the site can be developed against something that
// looks like the finished thing rather than one lorem-ipsum row.
//
// THE PRICES AND DATES ARE INVENTED. Nothing here has been confirmed by
// the client. The seed refuses to run against any database that is not
// local (see refuseToSeedRemoteDatabase in seed.ts), so this content
// cannot reach production by accident. The client enters the real
// trips, dates and pricing through the admin dashboard in Phase 5.

export type SeedTrip = {
  slug: string;
  title: string;
  destination: string;
  description: string;
  durationDays: number;
  tripType: "ladies_only" | "mixed" | "mother_and_kids";
  minAge: number | null;
  departureTime: string;
  returnTime: string;
  image: string;
  categorySlugs: string[];
  inclusions: string[];
  exclusions: string[];
  knowBeforeYouGo: string;
  // Days from today for the first departure, so the seeded trips are
  // always in the future no matter when the seed is run.
  departures: {
    startsInDays: number;
    lengthDays: number;
    pricePerPerson: number;
    advanceAmount: number;
    totalSeats: number;
    seatsConfirmed: number;
  }[];
};

const STANDARD_INCLUSIONS = [
  "Air conditioned coach from and back to Trivandrum",
  "All entry tickets and permits",
  "A trip captain travelling with the group",
];

const STANDARD_EXCLUSIONS = [
  "Personal shopping",
  "Anything not listed under inclusions",
];

export const SEED_TRIPS: SeedTrip[] = [
  {
    slug: "vagamon-weekend",
    title: "Vagamon Weekend",
    destination: "Vagamon, Idukki",
    description:
      "Meadows, pine forest and a long quiet walk along the ridge. Vagamon is the easiest of our hill trips, with gentle walking and plenty of time to simply sit and look at the view.",
    durationDays: 2,
    tripType: "ladies_only",
    minAge: 12,
    departureTime: "10:00 PM, Friday",
    returnTime: "8:00 AM, Sunday",
    image: "/images/vagamon.jpg",
    categorySlugs: ["weekend-getaway", "hill-station"],
    inclusions: [
      ...STANDARD_INCLUSIONS,
      "One night shared accommodation",
      "Breakfast and dinner",
    ],
    exclusions: [...STANDARD_EXCLUSIONS, "Lunch"],
    knowBeforeYouGo:
      "Carry a light jacket for the early morning and shoes you can walk on grass in.",
    departures: [
      { startsInDays: 24, lengthDays: 2, pricePerPerson: 5200, advanceAmount: 1500, totalSeats: 18, seatsConfirmed: 11 },
      { startsInDays: 59, lengthDays: 2, pricePerPerson: 5200, advanceAmount: 1500, totalSeats: 18, seatsConfirmed: 4 },
    ],
  },
  {
    slug: "munnar-hills",
    title: "Munnar Tea Hills",
    destination: "Munnar, Idukki",
    description:
      "Three days among the tea estates, with a morning at the top station viewpoint and an afternoon walking the plantation paths. The coolest trip we run.",
    durationDays: 3,
    tripType: "ladies_only",
    minAge: 10,
    departureTime: "9:00 PM, Thursday",
    returnTime: "7:00 AM, Monday",
    image: "/images/munnar.jpg",
    categorySlugs: ["hill-station", "weekend-getaway"],
    inclusions: [
      ...STANDARD_INCLUSIONS,
      "Two nights shared accommodation",
      "Breakfast and dinner on both days",
    ],
    exclusions: [...STANDARD_EXCLUSIONS, "Lunch on all days"],
    knowBeforeYouGo:
      "Munnar gets genuinely cold at night. Bring something warmer than you think you need.",
    departures: [
      { startsInDays: 38, lengthDays: 3, pricePerPerson: 9400, advanceAmount: 3000, totalSeats: 15, seatsConfirmed: 12 },
      { startsInDays: 73, lengthDays: 3, pricePerPerson: 9800, advanceAmount: 3000, totalSeats: 15, seatsConfirmed: 15 },
    ],
  },
  {
    slug: "chimminy-trek",
    title: "Chimminy Trek",
    destination: "Chimminy Wildlife Sanctuary, Thrissur",
    description:
      "A single long day on the trail. Forest, a stream crossing and a climb that earns the view at the top. Our most popular one-day trip.",
    durationDays: 1,
    tripType: "ladies_only",
    minAge: 16,
    departureTime: "4:00 AM, Saturday",
    returnTime: "11:00 PM, Saturday",
    image: "/images/chimminy.jpg",
    categorySlugs: ["trek"],
    inclusions: [...STANDARD_INCLUSIONS, "Breakfast and lunch", "Forest guide"],
    exclusions: [...STANDARD_EXCLUSIONS, "Dinner"],
    knowBeforeYouGo:
      "This is a real trek. Proper shoes, two litres of water and a reasonable level of fitness.",
    departures: [
      { startsInDays: 17, lengthDays: 1, pricePerPerson: 1850, advanceAmount: 800, totalSeats: 20, seatsConfirmed: 18 },
      { startsInDays: 45, lengthDays: 1, pricePerPerson: 1850, advanceAmount: 800, totalSeats: 20, seatsConfirmed: 6 },
    ],
  },
  {
    slug: "ponnumthuruthu-island",
    title: "Ponnumthuruthu Golden Island",
    destination: "Ponnumthuruthu, Varkala",
    description:
      "A slow boat across the backwater to a small island temple surrounded by water on every side. An easy, unhurried day and a good first trip.",
    durationDays: 1,
    tripType: "mother_and_kids",
    minAge: null,
    departureTime: "7:00 AM, Sunday",
    returnTime: "7:00 PM, Sunday",
    image: "/images/ponnumthuruthu.jpg",
    categorySlugs: ["backwaters", "weekend-getaway"],
    inclusions: [...STANDARD_INCLUSIONS, "Boat crossing", "Lunch"],
    exclusions: [...STANDARD_EXCLUSIONS],
    knowBeforeYouGo:
      "Children are welcome on this one. The boat crossing is short and calm.",
    departures: [
      { startsInDays: 12, lengthDays: 1, pricePerPerson: 1400, advanceAmount: 600, totalSeats: 24, seatsConfirmed: 9 },
      { startsInDays: 40, lengthDays: 1, pricePerPerson: 1400, advanceAmount: 600, totalSeats: 24, seatsConfirmed: 2 },
    ],
  },
  {
    slug: "chinnar-wildlife",
    title: "Chinnar Wildlife Sanctuary",
    destination: "Chinnar, Idukki",
    description:
      "Dry forest on the rain shadow side of the hills, which makes it look like nowhere else in Kerala. Early morning wildlife walk with a sanctuary guide.",
    durationDays: 2,
    tripType: "ladies_only",
    minAge: 14,
    departureTime: "9:30 PM, Friday",
    returnTime: "9:00 AM, Sunday",
    image: "/images/chinnar.jpg",
    categorySlugs: ["trek", "hill-station"],
    inclusions: [
      ...STANDARD_INCLUSIONS,
      "One night shared accommodation",
      "Breakfast and dinner",
      "Guided sanctuary walk",
    ],
    exclusions: [...STANDARD_EXCLUSIONS, "Lunch"],
    knowBeforeYouGo:
      "Full sleeves and closed shoes for the forest walk. It is hotter here than Munnar.",
    departures: [
      { startsInDays: 31, lengthDays: 2, pricePerPerson: 6300, advanceAmount: 2000, totalSeats: 16, seatsConfirmed: 7 },
    ],
  },
  {
    slug: "arippa-day-trip",
    title: "Arippa Day Trip",
    destination: "Arippa, Kollam",
    description:
      "Forest, river and a few hours of doing nothing much beside the water. Close enough to Trivandrum that you are home before dark.",
    durationDays: 1,
    tripType: "ladies_only",
    minAge: null,
    departureTime: "6:30 AM, Sunday",
    returnTime: "6:30 PM, Sunday",
    image: "/images/arippa.jpg",
    categorySlugs: ["weekend-getaway"],
    inclusions: [...STANDARD_INCLUSIONS, "Breakfast and lunch"],
    exclusions: [...STANDARD_EXCLUSIONS],
    knowBeforeYouGo: "Bring a change of clothes if you plan to get into the water.",
    departures: [
      { startsInDays: 9, lengthDays: 1, pricePerPerson: 1250, advanceAmount: 500, totalSeats: 22, seatsConfirmed: 20 },
      { startsInDays: 37, lengthDays: 1, pricePerPerson: 1250, advanceAmount: 500, totalSeats: 22, seatsConfirmed: 5 },
    ],
  },
  {
    slug: "attappadi-valley",
    title: "Attappadi Valley",
    destination: "Attappadi, Palakkad",
    description:
      "A quiet valley on the edge of the Nilgiris, with tribal hamlets, open grassland and some of the clearest night skies in Kerala.",
    durationDays: 2,
    tripType: "ladies_only",
    minAge: 14,
    departureTime: "9:00 PM, Friday",
    returnTime: "8:00 AM, Sunday",
    image: "/images/attappadi.jpg",
    categorySlugs: ["hill-station", "weekend-getaway"],
    inclusions: [
      ...STANDARD_INCLUSIONS,
      "One night shared accommodation",
      "Breakfast and dinner",
    ],
    exclusions: [...STANDARD_EXCLUSIONS, "Lunch"],
    knowBeforeYouGo: "Phone signal is patchy in the valley. Tell someone at home.",
    departures: [
      { startsInDays: 52, lengthDays: 2, pricePerPerson: 5900, advanceAmount: 2000, totalSeats: 18, seatsConfirmed: 3 },
    ],
  },
  {
    slug: "konni-adavi",
    title: "Konni Adavi",
    destination: "Konni, Pathanamthitta",
    description:
      "Bamboo rafting on still green water, with the forest coming right down to the bank on both sides. One of the calmest days we run.",
    durationDays: 1,
    tripType: "ladies_only",
    minAge: 12,
    departureTime: "5:30 AM, Saturday",
    returnTime: "9:00 PM, Saturday",
    image: "/images/konni-adavi.jpg",
    categorySlugs: ["backwaters", "weekend-getaway"],
    inclusions: [...STANDARD_INCLUSIONS, "Rafting", "Breakfast and lunch"],
    exclusions: [...STANDARD_EXCLUSIONS, "Dinner"],
    knowBeforeYouGo:
      "You will get wet. Bring a dry set of clothes and a bag for the wet ones.",
    departures: [
      { startsInDays: 19, lengthDays: 1, pricePerPerson: 2100, advanceAmount: 800, totalSeats: 20, seatsConfirmed: 14 },
    ],
  },
];
