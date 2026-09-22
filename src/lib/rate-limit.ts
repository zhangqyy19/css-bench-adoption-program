// A small in-memory limiter for the public adopt endpoint: at most `limit`
// hits per key within `windowMs`. Per server instance, so on a multi-instance
// host it is a per-instance limit; enough to blunt a script, not a defence
// against a determined attacker (see the README).

const WINDOW_MS = 60 * 60 * 1000;
const LIMIT = 5;

const hits = new Map<string, number[]>();

function recent(key: string, now: number, windowMs: number): number[] {
  return (hits.get(key) ?? []).filter((t) => t > now - windowMs);
}

export function isRateLimited(key: string, now = Date.now(), limit = LIMIT, windowMs = WINDOW_MS): boolean {
  return recent(key, now, windowMs).length >= limit;
}

// Called only for successful adoptions, so validation mistakes do not count.
export function recordHit(key: string, now = Date.now(), windowMs = WINDOW_MS): void {
  hits.set(key, [...recent(key, now, windowMs), now]);

  // keep the map from growing without bound
  if (hits.size > 10_000) {
    for (const [k, times] of hits) {
      if (times.every((t) => t <= now - windowMs)) hits.delete(k);
    }
  }
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
}
