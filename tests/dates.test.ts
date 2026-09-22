import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  daysBetween,
  formatRemaining,
  formatTerm,
  isValidDate,
  rangesOverlap,
  todayInPark,
} from "@/lib/dates";

describe("addMonths", () => {
  it("adds whole months", () => {
    expect(addMonths("2026-03-15", 1)).toBe("2026-04-15");
    expect(addMonths("2026-03-15", 12)).toBe("2027-03-15");
    expect(addMonths("2026-03-15", 120)).toBe("2036-03-15");
  });

  it("clamps to the end of a shorter month", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29"); // leap year
    expect(addMonths("2026-05-31", 1)).toBe("2026-06-30");
  });

  it("crosses year boundaries in both directions", () => {
    expect(addMonths("2026-11-10", 3)).toBe("2027-02-10");
    expect(addMonths("2026-02-10", -3)).toBe("2025-11-10");
  });
});

describe("rangesOverlap", () => {
  it("treats ranges as half-open, so back-to-back terms do not overlap", () => {
    expect(rangesOverlap("2026-01-01", "2027-01-01", "2027-01-01", "2028-01-01")).toBe(false);
    expect(rangesOverlap("2027-01-01", "2028-01-01", "2026-01-01", "2027-01-01")).toBe(false);
  });

  it("detects partial, contained and identical overlaps", () => {
    expect(rangesOverlap("2026-01-01", "2027-01-01", "2026-06-01", "2027-06-01")).toBe(true);
    expect(rangesOverlap("2026-01-01", "2027-01-01", "2026-03-01", "2026-04-01")).toBe(true);
    expect(rangesOverlap("2026-01-01", "2027-01-01", "2026-01-01", "2027-01-01")).toBe(true);
  });

  it("is false for a gap", () => {
    expect(rangesOverlap("2026-01-01", "2026-06-01", "2026-07-01", "2027-01-01")).toBe(false);
  });
});

describe("date helpers", () => {
  it("validates calendar dates", () => {
    expect(isValidDate("2026-02-28")).toBe(true);
    expect(isValidDate("2026-02-30")).toBe(false);
    expect(isValidDate("2026-13-01")).toBe(false);
    expect(isValidDate("26-1-1")).toBe(false);
  });

  it("adds days and counts days between", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(daysBetween("2026-01-01", "2026-03-01")).toBe(59);
  });

  it("reports today in the park's time zone as YYYY-MM-DD", () => {
    // 03:30 UTC on Jan 2 is still Jan 1 in New York
    expect(todayInPark(new Date("2026-01-02T03:30:00Z"))).toBe("2026-01-01");
    expect(todayInPark(new Date("2026-07-02T03:30:00Z"))).toBe("2026-07-01");
  });

  it("formats terms and time remaining", () => {
    expect(formatTerm(6)).toBe("6 months");
    expect(formatTerm(12)).toBe("1 year");
    expect(formatTerm(30)).toBe("2 years 6 months");
    expect(formatRemaining("2026-09-22", "2026-09-22")).toBe("ended");
    expect(formatRemaining("2026-09-22", "2026-09-23")).toBe("1 day left");
    expect(formatRemaining("2026-09-22", "2026-11-01")).toBe("40 days left");
    expect(formatRemaining("2026-09-22", "2027-09-22")).toBe("12 months left");
    expect(formatRemaining("2026-09-22", "2029-09-22")).toBe("3 years left");
  });
});
