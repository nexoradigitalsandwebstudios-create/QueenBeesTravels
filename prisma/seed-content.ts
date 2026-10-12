// Reviews, questions and site numbers for local development.
//
// THE REVIEWS ARE REAL PEOPLE. They were taken from the Queen Bees demo
// site, which took them from the public Google listing. Before launch
// the client must confirm she is happy to republish each one, and that
// the names are spelled as those women would want.
//
// THE NUMBERS ARE UNVERIFIED. The rating, review count and follower
// count came from the demo and the Instagram profile on the day this was
// written. They go stale. The client edits them in the admin, and the
// site shows nothing at all if they are missing.
//
// THE ANSWERS ARE A FIRST DRAFT, written from what the business says
// publicly about itself. The client should read every one before launch.
//
// Like all seed content this is local only. See
// refuseToSeedRemoteDatabase in seed.ts.

export const SEED_REVIEWS = [
  {
    authorName: "Reshmi RR",
    quote:
      "I've been part of this ladies-only travel group for the past 2 years, and it has truly been a beautiful journey. Every trip feels safe, well-organized, and filled with warmth.",
    rating: 5,
    tripName: null,
    sortOrder: 1,
  },
  {
    authorName: "Arundhathy R Gopan",
    quote:
      "The entire trip was very well organized, safe, comfortable, and filled with fun moments. What made it even more special was meeting such warm and supportive women.",
    rating: 5,
    tripName: null,
    sortOrder: 2,
  },
  {
    authorName: "anugeetha b",
    quote:
      "Had a wonderful time exploring the beautiful Andaman Islands with this ladies travel group. I joined the trip with my friends and my tween and we all thoroughly enjoyed the experience.",
    rating: 5,
    tripName: "Andaman Islands",
    sortOrder: 3,
  },
  {
    authorName: "Amitha Baiju AE",
    quote:
      "I absolutely love traveling with Queen Bees. So far I have explored Vagamon and Uluppuni, then Chinnar Wildlife Sanctuary and Mottamoodu.",
    rating: 5,
    tripName: null,
    sortOrder: 4,
  },
  {
    authorName: "RASEENA A.R",
    quote:
      "I've gone on two trips with this team and both were really good experiences. The coordination was smooth, and the way they planned and covered the places was very well organized.",
    rating: 5,
    tripName: null,
    sortOrder: 5,
  },
  {
    authorName: "Sandhya",
    quote:
      "Their trips are well organised, which meant we could simply relax and enjoy the journey. What stood out most was the welcoming vibe.",
    rating: 5,
    tripName: null,
    sortOrder: 6,
  },
];

export const SEED_FAQS = [
  {
    question: "Is it really women only?",
    answer:
      "Yes. Every Queen Bees trip travels as a group of women, with a woman trip captain travelling alongside you from pickup to drop. The only exception is our mothers and children trips, where children of any gender are welcome.",
    sortOrder: 1,
  },
  {
    question: "Do I need to come with a friend?",
    answer:
      "No, and most women do not. Joining on your own is the normal way to travel with us. You will be among women who are genuinely glad you came, and by the second morning nobody remembers who arrived with whom.",
    sortOrder: 2,
  },
  {
    question: "Can I bring my children?",
    answer:
      "On our mothers and children trips, yes. Those are marked on the trip page. Some members have also brought their daughters along on other trips and to our workshops. Message us and we will tell you what suits.",
    sortOrder: 3,
  },
  {
    question: "Where do trips start?",
    answer:
      "Every trip starts and ends in Trivandrum, with pickup and drop at a known point. You never have to find your own way to the start or home at the end.",
    sortOrder: 4,
  },
  {
    question: "How do I book a seat?",
    answer:
      "Pick a departure date on the trip page and pay the advance to hold your seat. Your seat is held for fifteen minutes while you pay. If you would rather talk it through first, message us on WhatsApp and we will walk you through it.",
    sortOrder: 5,
  },
  {
    question: "What if a trip is full?",
    answer:
      "Join the waitlist on that trip's page. We contact waitlisted travellers first when a seat opens up or when we add another date for the same trip.",
    sortOrder: 6,
  },
];

// Keys are referenced by name in lib/site-settings.ts. Adding one here
// without adding it there does nothing, which is deliberate: a stray
// row should not be able to change the site.
export const SEED_SITE_SETTINGS = [
  {
    key: "google_rating",
    value: "4.9",
    label: "Google rating, e.g. 4.9. Leave empty to hide the rating.",
  },
  {
    key: "google_review_count",
    value: "112",
    label: "Number of Google reviews, e.g. 112.",
  },
  {
    key: "instagram_followers",
    value: "15.1K",
    label: "Instagram follower count as text, e.g. 15.1K.",
  },
];

// The six photographs in the Instagram strip. These live in the database
// rather than the component so the client can swap them, but they are
// seeded here to give the strip something to show in development.
export const SEED_INSTAGRAM_IMAGES = [
  "/images/insta-1.jpg",
  "/images/insta-2.jpg",
  "/images/insta-3.jpg",
  "/images/insta-4.jpg",
  "/images/insta-5.jpg",
  "/images/insta-6.jpg",
];
