"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, tokenMatches } from "@/lib/admin-auth";

export async function signIn(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  if (!tokenMatches(token)) redirect("/admin?error=1");

  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  redirect("/admin");
}

export async function signOut(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin");
}
