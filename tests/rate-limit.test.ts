import { describe, expect, it } from "vitest";
import { isRateLimited, recordHit } from "@/lib/rate-limit";

describe("rate limit", () => {
  it("allows up to the limit per window, then refuses, then recovers", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) {
      expect(isRateLimited("a", t0 + i, 3, 1000)).toBe(false);
      recordHit("a", t0 + i, 1000);
    }
    expect(isRateLimited("a", t0 + 10, 3, 1000)).toBe(true);
    expect(isRateLimited("b", t0 + 10, 3, 1000)).toBe(false); // other keys unaffected
    expect(isRateLimited("a", t0 + 1001, 3, 1000)).toBe(false); // window has passed
  });
});
