import Link from "next/link";
import { formatDate, formatRemaining, formatTerm } from "@/lib/dates";
import { describeBench, sideLabel } from "@/lib/labels";
import type { BenchListItem, DateString } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

const dash = <span className="text-cream-300">—</span>;

export function BenchTable({ benches, today }: { benches: BenchListItem[]; today: DateString }) {
  if (benches.length === 0) {
    return (
      <p className="border border-dashed border-cream-300 bg-white p-10 text-center text-ink-500">
        No benches match those filters.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto border border-pine-200 bg-white shadow-sm">
      <table className="w-full text-left">
        <thead className="border-b border-pine-200 bg-pine-50 text-xs uppercase tracking-wider text-pine-700">
          <tr>
            <th scope="col" className="px-4 py-3 font-normal">Bench</th>
            <th scope="col" className="px-4 py-3 font-normal">Status</th>
            <th scope="col" className="px-4 py-3 font-normal">Adopted by</th>
            <th scope="col" className="hidden px-4 py-3 font-normal md:table-cell">Term</th>
            <th scope="col" className="hidden px-4 py-3 font-normal sm:table-cell">Until</th>
            <th scope="col" className="px-4 py-3"><span className="sr-only">Action</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-cream-100">
          {benches.map((bench) => {
            const freeSides = bench.sides - bench.current.length;
            return (
              <tr key={bench.id} className="align-top hover:bg-pine-50">
                <td className="px-4 py-3">
                  <Link href={`/benches/${bench.id}`} className="font-mono text-sm text-pine-800 hover:underline">
                    {bench.code}
                  </Link>
                  <div className="text-sm text-ink-500">{bench.area}</div>
                  <div className="text-sm text-ink-500">{describeBench(bench)}</div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={bench.status} expiringSoon={bench.expiringSoon} />
                  {bench.sides === 2 && bench.status === "available" && (
                    <div className="mt-1 text-sm text-ink-500">
                      {freeSides === 2 ? "both sides free" : "one side free"}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {bench.current.length === 0
                    ? dash
                    : bench.current.map((a) => (
                        <div key={a.id}>
                          {a.displayName}
                          {bench.sides === 2 && (
                            <span className="text-sm text-ink-500"> · side {sideLabel(a.side)}</span>
                          )}
                        </div>
                      ))}
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  {bench.current.length === 0
                    ? dash
                    : bench.current.map((a) => <div key={a.id}>{formatTerm(a.termMonths)}</div>)}
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  {bench.current.length === 0
                    ? dash
                    : bench.current.map((a) => (
                        <div key={a.id}>
                          {formatDate(a.endDate)}
                          <span className="text-sm text-ink-500"> · {formatRemaining(today, a.endDate)}</span>
                        </div>
                      ))}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <Link
                    href={`/benches/${bench.id}`}
                    className={
                      bench.status === "available"
                        ? "rounded-sm bg-pine-800 px-3 py-1.5 text-sm text-cream-50 hover:bg-pine-700"
                        : "text-sm text-pine-800 hover:underline"
                    }
                  >
                    {bench.status === "available" ? "Adopt" : "View"}
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
