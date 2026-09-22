import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// Staff access is a shared token from the environment, kept in an httpOnly
// cookie after the staff member enters it once. This stands in for real
// authentication; see the README.

export const ADMIN_COOKIE = "vcpa_admin";

export function adminToken(): string | undefined {
  const token = process.env.ADMIN_TOKEN?.trim();
  return token ? token : undefined;
}

export function tokenMatches(candidate: string | undefined): boolean {
  const expected = adminToken();
  if (!expected || !candidate) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function isStaff(): Promise<boolean> {
  return tokenMatches((await cookies()).get(ADMIN_COOKIE)?.value);
}
