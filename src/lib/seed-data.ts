import { addDays, addMonths } from "./dates";
import type { Bench, DateString, PublicAdoption } from "./types";
import { ANONYMOUS_NAME } from "./validation";

// Deterministic demo data: 520 benches across real areas of Van Cortlandt Park,
// with adoptions in every state the UI has to handle. Dates are generated
// relative to `today` so the demo always has active, expiring and past terms.

export type AdoptionRecord = PublicAdoption & {
  donorName: string;
  donorEmail: string;
  status: "active" | "cancelled";
  createdAt: string;
};

export const BENCH_COUNT = 520;

const AREAS: { name: string; lat: number; lng: number; weight: number }[] = [
  { name: "Parade Ground", lat: 40.8928, lng: -73.8962, weight: 5 },
  { name: "Van Cortlandt Lake", lat: 40.8903, lng: -73.8903, weight: 5 },
  { name: "Van Cortlandt House Museum", lat: 40.8911, lng: -73.8948, weight: 2 },
  { name: "Putnam Trail", lat: 40.8992, lng: -73.8893, weight: 4 },
  { name: "Tibbetts Brook", lat: 40.8958, lng: -73.8908, weight: 3 },
  { name: "John Kieran Nature Trail", lat: 40.8936, lng: -73.8894, weight: 3 },
  { name: "Vault Hill", lat: 40.8978, lng: -73.8937, weight: 2 },
  { name: "Northwest Forest", lat: 40.9052, lng: -73.8952, weight: 3 },
  { name: "Old Croton Aqueduct Trail", lat: 40.9003, lng: -73.8832, weight: 4 },
  { name: "Stadium and Pool", lat: 40.8879, lng: -73.8975, weight: 3 },
  { name: "Southwest Playground", lat: 40.8866, lng: -73.8958, weight: 2 },
  { name: "Allen Shandler Recreation Area", lat: 40.8932, lng: -73.8795, weight: 3 },
  { name: "Indian Field", lat: 40.8988, lng: -73.8758, weight: 3 },
  { name: "Woodlawn Playground", lat: 40.8962, lng: -73.8740, weight: 2 },
  { name: "Sachkerah Woods Playground", lat: 40.8857, lng: -73.8837, weight: 2 },
];

const DESCRIPTIONS = [
  "Beside the main path, shaded by oak trees",
  "Facing the water",
  "Near the entrance, next to the drinking fountain",
  "On the rise, with a view across the field",
  "Tucked under a maple, off the main path",
  "At the trail junction",
  "Beside the playground fence",
  "Facing the morning sun",
  "Next to the trail map",
  "On the quiet side of the path, near the stone wall",
  "Along the fence line, facing the field",
  "At the top of the steps",
];

const FIRST_NAMES = [
  "Maria", "James", "Aisha", "David", "Mei", "Carlos", "Ruth", "Samuel", "Priya", "Thomas",
  "Elena", "Kwame", "Hannah", "Luis", "Grace", "Omar", "Nora", "Victor", "Ines", "Daniel",
];

const LAST_NAMES = [
  "Rivera", "O'Connor", "Khan", "Goldberg", "Chen", "Mendoza", "Klein", "Okafor", "Patel", "Murphy",
  "Rossi", "Mensah", "Schwartz", "Ortiz", "Kim", "Haddad", "Walsh", "Petrov", "Santos", "Levy",
];

const DEDICATIONS = [
  "In loving memory of Grandpa Joe, who walked here every morning",
  "For everyone who needs a moment to rest",
  "Celebrating 40 years in the Bronx",
  "In memory of Ruth, who loved this view",
  "Sit a while. The park will wait.",
  "For Max, the best dog in Van Cortlandt",
  "To the cross-country runners of the class of '98",
  "With gratitude to the people who care for this park",
  "Happy 50th anniversary, Mom and Dad",
  "In memory of Coach Williams",
];

const TERMS = [6, 12, 12, 12, 24, 24, 36, 60];

// mulberry32: small, fast, and gives every environment the same data
function createRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateSeed(today: DateString): { benches: Bench[]; adoptions: AdoptionRecord[] } {
  const random = createRandom(1888); // the year the park was established
  const pick = <T,>(items: T[]): T => items[Math.floor(random() * items.length)];
  const between = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));

  const weightedAreas = AREAS.flatMap((area) => Array<typeof area>(area.weight).fill(area));
  const benches: Bench[] = [];
  const adoptions: AdoptionRecord[] = [];

  const addAdoption = (benchId: number, startDate: DateString, termMonths: number) => {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const style = random();
    const displayName =
      style < 0.12 ? ANONYMOUS_NAME : style < 0.4 ? `The ${lastName} Family` : `${firstName} ${lastName}`;
    const adoption: AdoptionRecord = {
      id: adoptions.length + 1,
      benchId,
      displayName,
      dedication: random() < 0.45 ? pick(DEDICATIONS) : null,
      startDate,
      endDate: addMonths(startDate, termMonths),
      termMonths,
      donorName: `${firstName} ${lastName}`,
      donorEmail: `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z.]/g, "") + "@example.com",
      status: "active",
      createdAt: `${startDate}T12:00:00.000Z`,
    };
    adoptions.push(adoption);
    return adoption;
  };

  for (let id = 1; id <= BENCH_COUNT; id++) {
    const area = pick(weightedAreas);
    benches.push({
      id,
      code: `VCP-${String(id).padStart(4, "0")}`,
      area: area.name,
      description: pick(DESCRIPTIONS),
      lat: Number((area.lat + (random() - 0.5) * 0.004).toFixed(6)),
      lng: Number((area.lng + (random() - 0.5) * 0.005).toFixed(6)),
      retired: id % 173 === 0,
    });
    if (id % 173 === 0) continue;

    const roll = random();
    const term = pick(TERMS);

    if (roll < 0.4) {
      // Adopted, somewhere in the middle of the term
      const start = addDays(addMonths(today, -between(0, term - 1)), -between(0, 27));
      const current = addAdoption(id, start, term);
      if (random() < 0.25) {
        // an earlier adopter, back-to-back with the current one
        const pastTerm = pick(TERMS);
        addAdoption(id, addMonths(current.startDate, -pastTerm), pastTerm);
      }
      if (random() < 0.08) addAdoption(id, current.endDate, pick(TERMS)); // already renewed
    } else if (roll < 0.47) {
      // Adopted, and ending within the next two months
      const targetEnd = addDays(today, between(3, 55));
      addAdoption(id, addMonths(targetEnd, -term), term);
    } else if (roll < 0.65) {
      // Available now, with history
      const end = addDays(today, -between(10, 700));
      addAdoption(id, addMonths(end, -term), term);
    } else if (roll < 0.68) {
      // Available now, but reserved for a term that starts soon
      addAdoption(id, addDays(today, between(20, 90)), term);
    }
    // otherwise: never adopted
  }

  return { benches, adoptions };
}
