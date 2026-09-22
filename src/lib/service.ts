import type { InValue, Row } from "@libsql/client";
import { addDays, addMonths, EXPIRING_SOON_DAYS, rangesOverlap } from "./dates";
import type { Db } from "./db";
import { ConflictError, InvalidInputError, NotFoundError } from "./errors";
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
  SideSummary,
  Stats,
} from "./types";
import { ANONYMOUS_NAME, type AdoptionInput } from "./validation";

// All reads and writes, against any libSQL client. Every function takes the
// database and "today" explicitly so tests run on an in-memory database with a
// fixed date. data.ts wraps these with the app's shared connection.
//
// Availability is never stored. A side is adopted on a given day if an active
// adoption covers that day; everything else is derived from the date ranges.
// At this scale (hundreds of benches, a few hundred live adoptions) the live
// set is loaded in two queries and filtered in code, which keeps the derivation
// in one place. At tens of thousands of benches it would move into SQL.

export const PAGE_SIZE = 25;

// The full adoption row. Only toPublic() output ever leaves the server for the public pages.
export type AdoptionRecord = PublicAdoption & {
  donorName: string;
  donorEmail: string;
  honoree: string | null;
  notes: string | null;
  status: "active" | "cancelled";
  createdAt: string;
};

export type AdminAdoption = AdoptionRecord & { benchCode: string; benchArea: string };

function rowToBench(row: Row): Bench {
  return {
    id: Number(row.id),
    code: String(row.code),
    area: String(row.area),
    description: row.description === null ? null : String(row.description),
    lat: Number(row.lat),
    lng: Number(row.lng),
    style: row.style as Bench["style"],
    lengthFt: Number(row.length_ft) as Bench["lengthFt"],
    sides: Number(row.sides) as Bench["sides"],
    retired: Number(row.retired) === 1,
  };
}

function rowToAdoption(row: Row): AdoptionRecord {
  return {
    id: Number(row.id),
    benchId: Number(row.bench_id),
    side: Number(row.side),
    displayName: String(row.display_name),
    dedication: row.dedication === null ? null : String(row.dedication),
    startDate: String(row.start_date),
    endDate: String(row.end_date),
    termMonths: Number(row.term_months),
    donorName: String(row.donor_name),
    donorEmail: String(row.donor_email),
    honoree: row.honoree === null ? null : String(row.honoree),
    notes: row.notes === null ? null : String(row.notes),
    status: row.status as AdoptionRecord["status"],
    createdAt: String(row.created_at),
  };
}

function toPublic(record: AdoptionRecord): PublicAdoption {
  const { id, benchId, side, displayName, dedication, startDate, endDate, termMonths } = record;
  return { id, benchId, side, displayName, dedication, startDate, endDate, termMonths };
}

// The first date from today onward that no adoption in the (sorted) list covers.
function nextAvailableDate(adoptions: PublicAdoption[], today: DateString): DateString {
  let cursor = today;
  for (const adoption of adoptions) {
    if (adoption.endDate <= cursor) continue;
    if (adoption.startDate > cursor) break;
    cursor = adoption.endDate;
  }
  return cursor;
}

function summarizeSide(side: number, adoptions: PublicAdoption[], today: DateString): SideSummary {
  const own = adoptions.filter((a) => a.side === side);
  const current = own.find((a) => a.startDate <= today && a.endDate > today) ?? null;
  return {
    side,
    current,
    expiringSoon: current !== null && current.endDate <= addDays(today, EXPIRING_SOON_DAYS),
    nextAvailableDate: nextAvailableDate(own, today),
    upcoming: own.filter((a) => a.startDate > today),
  };
}

type Summary = BenchListItem & { sideDetails: SideSummary[] };

// `adoptions`: this bench's active adoptions that have not ended, sorted by start date.
function summarize(bench: Bench, adoptions: PublicAdoption[], today: DateString): Summary {
  const sideDetails = Array.from({ length: bench.sides }, (_, i) => summarizeSide(i + 1, adoptions, today));
  const current = sideDetails.flatMap((s) => (s.current ? [s.current] : []));
  return {
    ...bench,
    status: current.length < bench.sides ? "available" : "adopted",
    current,
    expiringSoon: sideDetails.some((s) => s.expiringSoon),
    nextAvailableDate: sideDetails.map((s) => s.nextAvailableDate).sort()[0],
    sideDetails,
  };
}

// Every bench still in the program, with its live adoptions attached.
async function liveBenches(db: Db, today: DateString): Promise<Summary[]> {
  const [benches, adoptions] = await Promise.all([
    db.execute("SELECT * FROM benches WHERE retired = 0 ORDER BY id"),
    db.execute({
      sql: "SELECT * FROM adoptions WHERE status = 'active' AND end_date > ? ORDER BY start_date",
      args: [today],
    }),
  ]);
  const byBench = new Map<number, PublicAdoption[]>();
  for (const row of adoptions.rows) {
    const adoption = toPublic(rowToAdoption(row));
    byBench.set(adoption.benchId, [...(byBench.get(adoption.benchId) ?? []), adoption]);
  }
  return benches.rows.map((row) => {
    const bench = rowToBench(row);
    return summarize(bench, byBench.get(bench.id) ?? [], today);
  });
}

export async function listAreas(db: Db): Promise<string[]> {
  const result = await db.execute("SELECT DISTINCT area FROM benches ORDER BY area");
  return result.rows.map((row) => String(row.area));
}

export async function getStats(db: Db, today: DateString): Promise<Stats> {
  const benches = await liveBenches(db, today);
  const adopted = benches.filter((b) => b.status === "adopted").length;
  return {
    total: benches.length,
    adopted,
    available: benches.length - adopted,
    expiringSoon: benches.filter((b) => b.expiringSoon).length,
  };
}

export async function listBenches(db: Db, query: BenchQuery, today: DateString): Promise<BenchPage> {
  const needle = query.q.toLowerCase();
  const matches = (await liveBenches(db, today)).filter((b) => {
    if (query.area && b.area !== query.area) return false;
    if (query.status === "available" && b.status !== "available") return false;
    if (query.status === "adopted" && b.status !== "adopted") return false;
    if (query.status === "expiring" && !b.expiringSoon) return false;
    if (!needle) return true;
    return (
      b.code.toLowerCase().includes(needle) ||
      b.area.toLowerCase().includes(needle) ||
      b.current.some((a) => a.displayName.toLowerCase().includes(needle))
    );
  });

  const pageCount = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const page = Math.min(query.page, pageCount);
  const items: BenchListItem[] = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return { items, total: matches.length, page, pageSize: PAGE_SIZE, pageCount };
}

export async function listBenchPins(db: Db, today: DateString): Promise<BenchPin[]> {
  return (await liveBenches(db, today)).map((b) => ({
    id: b.id,
    code: b.code,
    area: b.area,
    lat: b.lat,
    lng: b.lng,
    status: b.status,
    expiringSoon: b.expiringSoon,
    adopter: b.current.length > 0 ? b.current.map((a) => a.displayName).join(" and ") : null,
    endDate: b.current.length > 0 ? b.current.map((a) => a.endDate).sort()[0] : null,
  }));
}

export async function getBench(db: Db, id: number, today: DateString): Promise<BenchDetail | null> {
  const [benches, adoptions] = await Promise.all([
    db.execute({ sql: "SELECT * FROM benches WHERE id = ?", args: [id] }),
    db.execute({
      sql: "SELECT * FROM adoptions WHERE bench_id = ? AND status = 'active' ORDER BY start_date",
      args: [id],
    }),
  ]);
  if (benches.rows.length === 0) return null;

  const bench = rowToBench(benches.rows[0]);
  const all = adoptions.rows.map((row) => toPublic(rowToAdoption(row)));
  return {
    ...summarize(
      bench,
      all.filter((a) => a.endDate > today),
      today,
    ),
    past: all.filter((a) => a.endDate <= today).reverse(),
  };
}

function isOverlapAbort(error: unknown): boolean {
  return error instanceof Error && error.message.includes("adoption overlaps");
}

export async function createAdoption(
  db: Db,
  benchId: number,
  input: AdoptionInput,
  today: DateString,
): Promise<AdoptionReceipt> {
  if (input.startDate < today) {
    throw new InvalidInputError({ startDate: "The start date can't be in the past" });
  }
  const endDate = addMonths(input.startDate, input.termMonths);

  // A write transaction takes the database's write lock before the overlap
  // check, so two requests for the same side cannot both pass it.
  const tx = await db.transaction("write");
  try {
    const benches = await tx.execute({ sql: "SELECT * FROM benches WHERE id = ?", args: [benchId] });
    if (benches.rows.length === 0) throw new NotFoundError();
    const bench = rowToBench(benches.rows[0]);
    if (bench.retired) throw new NotFoundError();
    if (input.side > bench.sides) throw new InvalidInputError({ side: "This bench has only one side" });

    const existing = (
      await tx.execute({
        sql: "SELECT * FROM adoptions WHERE bench_id = ? AND side = ? AND status = 'active' ORDER BY start_date",
        args: [benchId, input.side],
      })
    ).rows.map((row) => toPublic(rowToAdoption(row)));

    if (existing.some((a) => rangesOverlap(input.startDate, endDate, a.startDate, a.endDate))) {
      throw new ConflictError(nextAvailableDate(existing, today));
    }

    const record: Omit<AdoptionRecord, "id"> = {
      benchId,
      side: input.side,
      displayName: input.anonymous ? ANONYMOUS_NAME : input.displayName,
      dedication: input.dedication || null,
      startDate: input.startDate,
      endDate,
      termMonths: input.termMonths,
      donorName: input.donorName,
      donorEmail: input.donorEmail,
      honoree: input.honoree || null,
      notes: input.notes || null,
      status: "active",
      createdAt: new Date().toISOString(),
    };
    const inserted = await tx.execute({
      sql: `INSERT INTO adoptions
              (bench_id, side, donor_name, donor_email, honoree, notes, display_name, dedication,
               start_date, end_date, term_months, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        record.benchId,
        record.side,
        record.donorName,
        record.donorEmail,
        record.honoree,
        record.notes,
        record.displayName,
        record.dedication,
        record.startDate,
        record.endDate,
        record.termMonths,
        record.status,
        record.createdAt,
      ] satisfies InValue[],
    });
    await tx.commit();

    const id = Number(inserted.lastInsertRowid);
    return {
      ...toPublic({ ...record, id }),
      benchCode: bench.code,
      reference: `${bench.code}-${id.toString(36).toUpperCase().padStart(3, "0")}`,
    };
  } catch (error) {
    // the trigger fired: something else got there first
    if (isOverlapAbort(error)) throw new ConflictError(today);
    throw error;
  } finally {
    tx.close();
  }
}

// Staff-only: every adoption with private fields, newest first.
export async function listAdoptionsForStaff(db: Db): Promise<AdminAdoption[]> {
  const result = await db.execute(`
    SELECT a.*, b.code AS bench_code, b.area AS bench_area
    FROM adoptions a JOIN benches b ON b.id = a.bench_id
    ORDER BY a.created_at DESC, a.id DESC
  `);
  return result.rows.map((row) => ({
    ...rowToAdoption(row),
    benchCode: String(row.bench_code),
    benchArea: String(row.bench_area),
  }));
}

export async function cancelAdoption(db: Db, id: number): Promise<void> {
  const result = await db.execute({
    sql: "UPDATE adoptions SET status = 'cancelled' WHERE id = ? AND status = 'active'",
    args: [id],
  });
  if (result.rowsAffected === 0) throw new NotFoundError("Adoption not found");
}
