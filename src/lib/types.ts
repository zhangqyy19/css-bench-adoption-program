// Dates are calendar dates in park-local time, formatted YYYY-MM-DD.
// Adoption ranges are half-open: startDate is inclusive, endDate is exclusive.
export type DateString = string;

export type BenchStyle = "worlds-fair" | "concrete";

export type Bench = {
  id: number;
  code: string;
  area: string;
  description: string | null;
  lat: number;
  lng: number;
  style: BenchStyle;
  lengthFt: 4 | 8;
  // an 8 ft bench has a plaque position on each side, adopted separately
  sides: 1 | 2;
  retired: boolean;
};

// The only adoption fields the public may see. Donor name and email never
// appear in this type, so a public page cannot leak them by accident.
export type PublicAdoption = {
  id: number;
  benchId: number;
  side: number; // 1 or 2
  displayName: string;
  dedication: string | null;
  startDate: DateString;
  endDate: DateString;
  termMonths: number;
};

export type BenchStatus = "available" | "adopted";

// One plaque position on a bench and what is booked on it.
export type SideSummary = {
  side: number;
  current: PublicAdoption | null;
  expiringSoon: boolean;
  nextAvailableDate: DateString;
  upcoming: PublicAdoption[];
};

// "available" means at least one side is free today.
export type BenchListItem = Bench & {
  status: BenchStatus;
  current: PublicAdoption[];
  expiringSoon: boolean;
  nextAvailableDate: DateString;
};

// The slim shape the map needs for every bench at once.
export type BenchPin = {
  id: number;
  code: string;
  area: string;
  lat: number;
  lng: number;
  status: BenchStatus;
  expiringSoon: boolean;
  adopter: string | null;
  endDate: DateString | null;
};

export type BenchDetail = BenchListItem & {
  sideDetails: SideSummary[];
  past: PublicAdoption[];
};

export type Stats = {
  total: number;
  adopted: number;
  available: number;
  expiringSoon: number;
};

export type StatusFilter = "all" | "available" | "adopted" | "expiring";

export type BenchQuery = {
  status: StatusFilter;
  area: string;
  q: string;
  page: number;
};

export type BenchPage = {
  items: BenchListItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type AdoptionReceipt = PublicAdoption & {
  reference: string;
  benchCode: string;
};
