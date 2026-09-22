import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CancelButton } from "@/components/CancelButton";
import { adminToken, isStaff } from "@/lib/admin-auth";
import { listAdoptionsForStaff } from "@/lib/data";
import { formatDate, formatTerm, todayInPark } from "@/lib/dates";
import { sideLabel } from "@/lib/labels";
import { signIn, signOut } from "./actions";

export const metadata: Metadata = { title: "Staff", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // without a token configured there is no staff area at all
  if (!adminToken()) notFound();

  if (!(await isStaff())) {
    const { error } = await searchParams;
    return (
      <div className="wrap max-w-md py-16">
        <p className="eyebrow">Staff</p>
        <h1 className="mt-2 text-3xl text-pine-900">Sign in</h1>
        <form action={signIn} className="mt-6 flex flex-col gap-3">
          <label htmlFor="token" className="text-ink-900">
            Staff access token
          </label>
          <input
            id="token"
            name="token"
            type="password"
            autoComplete="current-password"
            required
            className="border border-cream-300 bg-white px-3 py-2 outline-none focus:border-pine-600"
          />
          {error && (
            <p role="alert" className="text-sm text-red-800">
              That token is not right.
            </p>
          )}
          <button type="submit" className="rounded-sm bg-pine-800 px-5 py-2.5 text-cream-50 hover:bg-pine-700">
            Sign in
          </button>
        </form>
      </div>
    );
  }

  const today = todayInPark();
  const adoptions = await listAdoptionsForStaff();

  const stateOf = (a: (typeof adoptions)[number]) => {
    if (a.status === "cancelled") return "cancelled";
    if (a.endDate <= today) return "ended";
    if (a.startDate > today) return "reserved";
    return "active";
  };

  return (
    <div className="wrap flex flex-col gap-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Staff</p>
          <h1 className="mt-2 text-3xl text-pine-900">All adoptions</h1>
          <p className="mt-2 text-ink-700">
            {adoptions.length} records, newest first. Donor contact details are visible only here.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <a href="/api/admin/export" className="text-pine-800 underline-offset-4 hover:underline">
            Download CSV
          </a>
          <form action={signOut}>
            <button type="submit" className="text-ink-500 underline-offset-4 hover:underline">
              Sign out
            </button>
          </form>
        </div>
      </div>

      <div className="overflow-x-auto border border-pine-200 bg-white shadow-sm">
        <table className="w-full text-left text-base">
          <thead className="border-b border-pine-200 bg-pine-50 text-xs uppercase tracking-wider text-pine-700">
            <tr>
              <th className="px-3 py-3 font-normal">Bench</th>
              <th className="px-3 py-3 font-normal">Donor</th>
              <th className="px-3 py-3 font-normal">Shown as</th>
              <th className="px-3 py-3 font-normal">Plaque</th>
              <th className="px-3 py-3 font-normal">Term</th>
              <th className="px-3 py-3 font-normal">State</th>
              <th className="px-3 py-3 font-normal">Notes</th>
              <th className="px-3 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-100 align-top">
            {adoptions.map((a) => {
              const state = stateOf(a);
              return (
                <tr key={a.id} className={state === "cancelled" ? "text-ink-500" : ""}>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <Link href={`/benches/${a.benchId}`} className="font-mono text-sm text-pine-800 hover:underline">
                      {a.benchCode}
                    </Link>
                    <div className="text-sm text-ink-500">
                      {a.benchArea} · side {sideLabel(a.side)}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {a.donorName}
                    <div className="text-sm text-ink-500">{a.donorEmail}</div>
                    {a.honoree && <div className="text-sm text-ink-500">For: {a.honoree}</div>}
                  </td>
                  <td className="px-3 py-3">{a.displayName}</td>
                  <td className="max-w-xs px-3 py-3 text-sm whitespace-pre-line text-ink-700">{a.dedication}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {formatTerm(a.termMonths)}
                    <div className="text-sm text-ink-500">
                      {formatDate(a.startDate)} to {formatDate(a.endDate)}
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">{state}</td>
                  <td className="max-w-xs px-3 py-3 text-sm text-ink-700">{a.notes}</td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    {a.status === "active" && <CancelButton adoptionId={a.id} benchCode={a.benchCode} />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
