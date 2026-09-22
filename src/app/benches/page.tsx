import type { Metadata } from "next";
import { BenchTable } from "@/components/BenchTable";
import { FilterBar } from "@/components/FilterBar";
import { Pagination } from "@/components/Pagination";
import { StatCards } from "@/components/StatCards";
import { getStats, listAreas, listBenches } from "@/lib/data";
import { todayInPark } from "@/lib/dates";
import { parseBenchQuery } from "@/lib/validation";

export const metadata: Metadata = { title: "Benches" };

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseBenchQuery(await searchParams);
  const today = todayInPark();
  const [stats, areas, result] = await Promise.all([
    getStats(today),
    listAreas(),
    listBenches(query, today),
  ]);

  return (
    <div className="wrap flex flex-col gap-8 py-10">
      <section>
        <p className="eyebrow">The benches</p>
        <h1 className="mt-2 text-4xl text-pine-900">Find a bench to adopt</h1>
        <p className="mt-3 max-w-2xl text-lg text-ink-700">
          Every bench in the program, who has adopted it, and until when. Choose an available bench
          to adopt it, or reserve an adopted bench for when its current term ends.
        </p>
      </section>

      <StatCards stats={stats} />
      <FilterBar query={query} areas={areas} />
      <BenchTable benches={result.items} today={today} />
      <Pagination query={query} result={result} />
    </div>
  );
}
