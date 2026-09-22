import Link from "next/link";
import type { BenchPage, BenchQuery } from "@/lib/types";

export function benchListUrl(query: BenchQuery, page = 1): string {
  const params = new URLSearchParams();
  if (query.status !== "all") params.set("status", query.status);
  if (query.area) params.set("area", query.area);
  if (query.q.trim()) params.set("q", query.q.trim());
  if (page > 1) params.set("page", String(page));
  return params.size > 0 ? `/benches?${params}` : "/benches";
}

export function Pagination({ query, result }: { query: BenchQuery; result: BenchPage }) {
  const { page, pageCount, pageSize, total } = result;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const linkClass = "border border-cream-300 bg-white px-3 py-1.5 hover:border-pine-600";
  const disabledClass = "border border-cream-200 px-3 py-1.5 text-ink-500/50";

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between text-base text-ink-700">
      <p>
        Showing {from} to {to} of {total}
      </p>
      {pageCount > 1 && (
        <div className="flex items-center gap-3">
          {page > 1 ? (
            <Link href={benchListUrl(query, page - 1)} className={linkClass}>Previous</Link>
          ) : (
            <span className={disabledClass}>Previous</span>
          )}
          <span className="tabular-nums">
            Page {page} of {pageCount}
          </span>
          {page < pageCount ? (
            <Link href={benchListUrl(query, page + 1)} className={linkClass}>Next</Link>
          ) : (
            <span className={disabledClass}>Next</span>
          )}
        </div>
      )}
    </nav>
  );
}
