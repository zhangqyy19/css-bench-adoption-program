import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb, type Db } from "@/lib/db";
import { ConflictError, InvalidInputError, NotFoundError } from "@/lib/errors";
import {
  cancelAdoption,
  createAdoption,
  getBench,
  getStats,
  listAdoptionsForStaff,
  listBenches,
} from "@/lib/service";
import type { AdoptionInput } from "@/lib/validation";

const TODAY = "2026-09-22";

const input = (overrides: Partial<AdoptionInput> = {}): AdoptionInput => ({
  donorName: "Maria Rivera",
  donorEmail: "maria@example.com",
  anonymous: false,
  displayName: "The Rivera Family",
  honoree: "",
  dedication: "For everyone who needs a rest",
  side: 1,
  startDate: TODAY,
  termMonths: 12,
  acceptsTimeline: true,
  notes: "",
  ...overrides,
});

let db: Db;

beforeEach(async () => {
  db = await createDb(":memory:");
  await db.batch(
    [
      // id, code, area, lat, lng, style, length, sides, retired
      "INSERT INTO benches VALUES (1, 'VCP-0001', 'Parade Ground', NULL, 40.89, -73.89, 'worlds-fair', 4, 1, 0)",
      "INSERT INTO benches VALUES (2, 'VCP-0002', 'Van Cortlandt Lake', NULL, 40.89, -73.89, 'concrete', 8, 2, 0)",
      "INSERT INTO benches VALUES (3, 'VCP-0003', 'Vault Hill', NULL, 40.89, -73.89, 'worlds-fair', 4, 1, 1)",
    ],
    "write",
  );
});

afterEach(() => db.close());

describe("createAdoption", () => {
  it("records an adoption and derives the end date and reference", async () => {
    const receipt = await createAdoption(db, 1, input(), TODAY);
    expect(receipt).toMatchObject({
      benchId: 1,
      side: 1,
      displayName: "The Rivera Family",
      startDate: TODAY,
      endDate: "2027-09-22",
      termMonths: 12,
      benchCode: "VCP-0001",
    });
    expect(receipt.reference).toMatch(/^VCP-0001-[0-9A-Z]{3}$/);

    const bench = await getBench(db, 1, TODAY);
    expect(bench?.status).toBe("adopted");
    expect(bench?.current[0]?.displayName).toBe("The Rivera Family");
    expect(bench?.nextAvailableDate).toBe("2027-09-22");
  });

  it("rejects an overlapping adoption and reports the next free date", async () => {
    await createAdoption(db, 1, input(), TODAY);
    const error = await createAdoption(db, 1, input({ startDate: "2027-03-01", termMonths: 6 }), TODAY).catch(
      (e) => e,
    );
    expect(error).toBeInstanceOf(ConflictError);
    expect(error.nextAvailableDate).toBe("2027-09-22");
  });

  it("allows a term that starts the day the previous one ends", async () => {
    await createAdoption(db, 1, input(), TODAY);
    const next = await createAdoption(db, 1, input({ startDate: "2027-09-22", termMonths: 24 }), TODAY);
    expect(next.endDate).toBe("2029-09-22");

    const bench = await getBench(db, 1, TODAY);
    expect(bench?.sideDetails[0].upcoming).toHaveLength(1);
    expect(bench?.nextAvailableDate).toBe("2029-09-22");
  });

  it("finds a gap between a current term and a future reservation", async () => {
    await createAdoption(db, 1, input({ termMonths: 6 }), TODAY); // to 2027-03-22
    await createAdoption(db, 1, input({ startDate: "2028-01-01", termMonths: 12 }), TODAY);
    const bench = await getBench(db, 1, TODAY);
    expect(bench?.nextAvailableDate).toBe("2027-03-22");
  });

  it("treats the two sides of an 8 ft bench separately", async () => {
    await createAdoption(db, 2, input({ side: 1 }), TODAY);
    await expect(createAdoption(db, 2, input({ side: 1 }), TODAY)).rejects.toBeInstanceOf(ConflictError);
    await expect(createAdoption(db, 2, input({ side: 2 }), TODAY)).resolves.toBeTruthy();

    const bench = await getBench(db, 2, TODAY);
    expect(bench?.status).toBe("adopted");
    expect(bench?.current).toHaveLength(2);
  });

  it("is available while one side of an 8 ft bench is free", async () => {
    await createAdoption(db, 2, input({ side: 2 }), TODAY);
    const bench = await getBench(db, 2, TODAY);
    expect(bench?.status).toBe("available");
    expect(bench?.sideDetails[0].current).toBeNull();
    expect(bench?.sideDetails[1].current?.side).toBe(2);
  });

  it("rejects side 2 on a one-sided bench", async () => {
    const error = await createAdoption(db, 1, input({ side: 2 }), TODAY).catch((e) => e);
    expect(error).toBeInstanceOf(InvalidInputError);
    expect(error.fieldErrors.side).toBeDefined();
  });

  it("rejects a start date in the past", async () => {
    const error = await createAdoption(db, 1, input({ startDate: "2026-09-21" }), TODAY).catch((e) => e);
    expect(error).toBeInstanceOf(InvalidInputError);
    expect(error.fieldErrors.startDate).toBeDefined();
  });

  it("rejects unknown and retired benches", async () => {
    await expect(createAdoption(db, 99, input(), TODAY)).rejects.toBeInstanceOf(NotFoundError);
    await expect(createAdoption(db, 3, input(), TODAY)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("shows anonymous donors as Anonymous and keeps private fields off the public record", async () => {
    const receipt = await createAdoption(
      db,
      1,
      input({ anonymous: true, displayName: "", honoree: "Grandpa Joe", notes: "call me" }),
      TODAY,
    );
    expect(receipt.displayName).toBe("Anonymous");
    expect(receipt).not.toHaveProperty("donorEmail");
    expect(receipt).not.toHaveProperty("honoree");
    expect(receipt).not.toHaveProperty("notes");

    const [staffView] = await listAdoptionsForStaff(db);
    expect(staffView.donorEmail).toBe("maria@example.com");
    expect(staffView.honoree).toBe("Grandpa Joe");
    expect(staffView.notes).toBe("call me");
  });
});

describe("the database trigger", () => {
  it("blocks an overlapping insert that bypasses the service", async () => {
    await createAdoption(db, 1, input(), TODAY);
    await expect(
      db.execute(`
        INSERT INTO adoptions (bench_id, side, donor_name, donor_email, display_name, start_date, end_date,
                               term_months, status, created_at)
        VALUES (1, 1, 'x', 'x@example.com', 'X', '2027-01-01', '2027-06-01', 5, 'active', '2026-09-22')
      `),
    ).rejects.toThrow(/overlaps/);
  });

  it("still allows the other side", async () => {
    await createAdoption(db, 2, input({ side: 1 }), TODAY);
    await expect(
      db.execute(`
        INSERT INTO adoptions (bench_id, side, donor_name, donor_email, display_name, start_date, end_date,
                               term_months, status, created_at)
        VALUES (2, 2, 'x', 'x@example.com', 'X', '2027-01-01', '2027-06-01', 5, 'active', '2026-09-22')
      `),
    ).resolves.toBeTruthy();
  });
});

describe("cancelAdoption", () => {
  it("frees the dates so the bench can be adopted again", async () => {
    const first = await createAdoption(db, 1, input(), TODAY);
    await cancelAdoption(db, first.id);

    expect((await getBench(db, 1, TODAY))?.status).toBe("available");
    await expect(createAdoption(db, 1, input(), TODAY)).resolves.toBeTruthy();
  });

  it("fails for an unknown or already cancelled adoption", async () => {
    await expect(cancelAdoption(db, 42)).rejects.toBeInstanceOf(NotFoundError);
    const first = await createAdoption(db, 1, input(), TODAY);
    await cancelAdoption(db, first.id);
    await expect(cancelAdoption(db, first.id)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("status over time", () => {
  it("expires an adoption without anyone touching it", async () => {
    await createAdoption(db, 1, input({ termMonths: 1 }), TODAY); // ends 2026-10-22
    expect((await getBench(db, 1, "2026-10-21"))?.status).toBe("adopted");
    expect((await getBench(db, 1, "2026-10-22"))?.status).toBe("available");

    const later = await getBench(db, 1, "2026-10-22");
    expect(later?.past).toHaveLength(1);
    expect(later?.current).toHaveLength(0);
  });

  it("flags terms ending within 60 days", async () => {
    await createAdoption(db, 1, input({ termMonths: 3 }), TODAY); // ends 2026-12-22
    expect((await getBench(db, 1, "2026-10-01"))?.expiringSoon).toBe(false);
    expect((await getBench(db, 1, "2026-11-01"))?.expiringSoon).toBe(true);
  });
});

describe("listBenches and getStats", () => {
  it("filters by status, area and adopter search and counts correctly", async () => {
    await createAdoption(db, 1, input(), TODAY);
    await createAdoption(db, 2, input({ side: 1, displayName: "Sam Khan" }), TODAY);

    const stats = await getStats(db, TODAY);
    expect(stats).toEqual({ total: 2, adopted: 1, available: 1, expiringSoon: 0 }); // retired bench excluded

    const base = { status: "all" as const, area: "", q: "", page: 1 };
    expect((await listBenches(db, base, TODAY)).total).toBe(2);
    expect((await listBenches(db, { ...base, status: "adopted" }, TODAY)).items.map((b) => b.code)).toEqual([
      "VCP-0001",
    ]);
    expect((await listBenches(db, { ...base, status: "available" }, TODAY)).items.map((b) => b.code)).toEqual([
      "VCP-0002",
    ]);
    expect((await listBenches(db, { ...base, area: "Vault Hill" }, TODAY)).total).toBe(0);
    expect((await listBenches(db, { ...base, q: "khan" }, TODAY)).items.map((b) => b.code)).toEqual(["VCP-0002"]);
    expect((await listBenches(db, { ...base, q: "vcp-0001" }, TODAY)).total).toBe(1);
  });

  it("clamps an out-of-range page", async () => {
    const result = await listBenches(db, { status: "all", area: "", q: "", page: 99 }, TODAY);
    expect(result.page).toBe(1);
    expect(result.pageCount).toBe(1);
  });
});
