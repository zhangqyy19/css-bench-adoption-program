import { addDays, addMonths, EXPIRING_SOON_DAYS, rangesOverlap, todayInPark } from "./dates";
import { ConflictError, InvalidInputError, NotFoundError } from "./errors";
import { generateSeed, type AdoptionRecord } from "./seed-data";
import type {
  AdoptionReceipt,
  Bench,
  BenchDetail,
  BenchListItem,
  BenchPage,
  BenchPin,
  BenchQuery,
  DateString,
  PublicAdoption,
  Stats,
} from "./types";
import { ANONYMOUS_NAME, type AdoptionInput } from "./validation";

// The data layer the pages and API routes talk to.
//
// TEMPORARY: backed by an in-memory store so the frontend can be built and
// clicked through before the database exists. The exported functions and their
// signatures are the contract; the backend work replaces the bodies with SQL
// and nothing above this file changes. Adoptions made here last until the
// server restarts.

export const PAGE_SIZE = 25;

type Store = { benches: Bench[]; adoptions: AdoptionRecord[] };

const globalStore = globalThis as typeof globalThis & { __benchStore?: Store };

function store(): Store {
  // cached on globalThis so dev hot-reload keeps the adoptions made so far
  globalStore.__benchStore ??= generateSeed(todayInPark());
  return globalStore.__benchStore;
}

function toPublic(record: AdoptionRecord): PublicAdoption {
  const { id, benchId, displayName, dedication, startDate, endDate, termMonths } = record;
  return { id, benchId, displayName, dedication, startDate, endDate, termMonths };
}

function activeAdoptions(benchId: number): AdoptionRecord[] {
  return store()
    .adoptions.filter((a) => a.benchId === benchId && a.status === "active")
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

// The first date from today onward that no adoption covers.
function nextAvailableDate(adoptions: AdoptionRecord[], today: DateString): DateString {
  let cursor = today;
  for (const adoption of adoptions) {
    if (adoption.endDate <= cursor) continue;
    if (adoption.startDate > cursor) break;
    cursor = adoption.endDate;
  }
  return cursor;
}

function summarize(bench: Bench, adoptions: AdoptionRecord[], today: DateString): BenchListItem {
  const current = adoptions.find((a) => a.startDate <= today && a.endDate > today) ?? null;
  const soon = addDays(today, EXPIRING_SOON_DAYS);
  return {
    ...bench,
    status: current ? "adopted" : "available",
    current: current ? toPublic(current) : null,
    expiringSoon: current !== null && current.endDate <= soon,
    nextAvailableDate: nextAvailableDate(adoptions, today),
  };
}

function describe(bench: Bench, today: DateString): BenchDetail {
  const adoptions = activeAdoptions(bench.id);
  return {
    ...summarize(bench, adoptions, today),
    upcoming: adoptions.filter((a) => a.startDate > today).map(toPublic),
    past: adoptions
      .filter((a) => a.endDate <= today)
      .reverse()
      .map(toPublic),
  };
}

export async function listAreas(): Promise<string[]> {
  return [...new Set(store().benches.map((b) => b.area))].sort();
}

export async function getStats(today: DateString = todayInPark()): Promise<Stats> {
  const benches = store()
    .benches.filter((b) => !b.retired)
    .map((b) => summarize(b, activeAdoptions(b.id), today));
  const adopted = benches.filter((b) => b.status === "adopted").length;
  return {
    total: benches.length,
    adopted,
    available: benches.length - adopted,
    expiringSoon: benches.filter((b) => b.expiringSoon).length,
  };
}

export async function listBenches(
  query: BenchQuery,
  today: DateString = todayInPark(),
): Promise<BenchPage> {
  const needle = query.q.toLowerCase();
  const matches = store()
    .benches.filter((b) => !b.retired)
    .map((b) => summarize(b, activeAdoptions(b.id), today))
    .filter((b) => {
      if (query.area && b.area !== query.area) return false;
      if (query.status === "available" && b.status !== "available") return false;
      if (query.status === "adopted" && b.status !== "adopted") return false;
      if (query.status === "expiring" && !b.expiringSoon) return false;
      if (!needle) return true;
      return (
        b.code.toLowerCase().includes(needle) ||
        b.area.toLowerCase().includes(needle) ||
        (b.current?.displayName.toLowerCase().includes(needle) ?? false)
      );
    });

  const pageCount = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const page = Math.min(query.page, pageCount);
  const items = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return { items, total: matches.length, page, pageSize: PAGE_SIZE, pageCount };
}

export async function listBenchPins(today: DateString = todayInPark()): Promise<BenchPin[]> {
  return store()
    .benches.filter((b) => !b.retired)
    .map((b) => {
      const { status, expiringSoon, current } = summarize(b, activeAdoptions(b.id), today);
      return {
        id: b.id,
        code: b.code,
        area: b.area,
        lat: b.lat,
        lng: b.lng,
        status,
        expiringSoon,
        adopter: current?.displayName ?? null,
        endDate: current?.endDate ?? null,
      };
    });
}

export async function getBench(
  id: number,
  today: DateString = todayInPark(),
): Promise<BenchDetail | null> {
  const bench = store().benches.find((b) => b.id === id);
  return bench ? describe(bench, today) : null;
}

export async function createAdoption(
  benchId: number,
  input: AdoptionInput,
  today: DateString = todayInPark(),
): Promise<AdoptionReceipt> {
  const bench = store().benches.find((b) => b.id === benchId);
  if (!bench || bench.retired) throw new NotFoundError();

  if (input.startDate < today) {
    throw new InvalidInputError({ startDate: "The start date can't be in the past" });
  }

  const endDate = addMonths(input.startDate, input.termMonths);
  const existing = activeAdoptions(benchId);
  const clash = existing.some((a) => rangesOverlap(input.startDate, endDate, a.startDate, a.endDate));
  if (clash) throw new ConflictError(nextAvailableDate(existing, today));

  const record: AdoptionRecord = {
    id: store().adoptions.length + 1,
    benchId,
    displayName: input.anonymous ? ANONYMOUS_NAME : input.displayName,
    dedication: input.dedication || null,
    startDate: input.startDate,
    endDate,
    termMonths: input.termMonths,
    donorName: input.donorName,
    donorEmail: input.donorEmail,
    status: "active",
    createdAt: new Date().toISOString(),
  };
  store().adoptions.push(record);

  return {
    ...toPublic(record),
    benchCode: bench.code,
    reference: `${bench.code}-${record.id.toString(36).toUpperCase().padStart(3, "0")}`,
  };
}
