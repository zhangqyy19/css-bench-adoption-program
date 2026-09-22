import { describe, expect, it } from "vitest";
import { createDb } from "@/lib/db";
import { generateSeed } from "@/lib/seed-data";
import { getStats } from "@/lib/service";
import { seed } from "../scripts/seed";

const TODAY = "2026-09-22";

describe("seed data", () => {
  it("is deterministic and covers every state the UI shows", () => {
    const a = generateSeed(TODAY);
    const b = generateSeed(TODAY);
    expect(a).toEqual(b);
    expect(a.benches).toHaveLength(520);

    const active = a.adoptions.filter((x) => x.startDate <= TODAY && x.endDate > TODAY);
    const past = a.adoptions.filter((x) => x.endDate <= TODAY);
    const future = a.adoptions.filter((x) => x.startDate > TODAY);
    expect(active.length).toBeGreaterThan(100);
    expect(past.length).toBeGreaterThan(50);
    expect(future.length).toBeGreaterThan(5);
    expect(a.adoptions.some((x) => x.displayName === "Anonymous")).toBe(true);
    expect(a.benches.some((x) => x.retired)).toBe(true);
    expect(a.benches.some((x) => x.sides === 2)).toBe(true);
  });

  it("loads through the schema, passes the trigger, and refuses to overwrite without --force", async () => {
    const db = await createDb(":memory:");
    try {
      const counts = await seed(db, { today: TODAY });
      expect(counts.benches).toBe(520);

      const stats = await getStats(db, TODAY);
      expect(stats.total).toBe(517); // three retired
      expect(stats.adopted + stats.available).toBe(517);
      expect(stats.adopted).toBeGreaterThan(0);
      expect(stats.expiringSoon).toBeGreaterThan(0);

      await expect(seed(db, { today: TODAY })).rejects.toThrow(/--force/);
      await expect(seed(db, { today: TODAY, force: true })).resolves.toMatchObject({ benches: 520 });
    } finally {
      db.close();
    }
  });
});
