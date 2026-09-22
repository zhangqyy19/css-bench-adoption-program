import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdoptForm } from "@/components/AdoptForm";
import { BenchMapLoader } from "@/components/BenchMapLoader";
import { StatusBadge } from "@/components/StatusBadge";
import { getBench } from "@/lib/data";
import { formatDate, formatRemaining, formatTerm, todayInPark } from "@/lib/dates";
import type { BenchDetail, BenchPin, PublicAdoption } from "@/lib/types";

type Props = { params: Promise<{ id: string }> };

async function loadBench(params: Props["params"]) {
  const id = Number((await params).id);
  return Number.isInteger(id) ? getBench(id) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const bench = await loadBench(params);
  return { title: bench ? `Bench ${bench.code}` : "Bench not found" };
}

function toPin(bench: BenchDetail): BenchPin {
  return {
    id: bench.id,
    code: bench.code,
    area: bench.area,
    lat: bench.lat,
    lng: bench.lng,
    status: bench.status,
    expiringSoon: bench.expiringSoon,
    adopter: bench.current?.displayName ?? null,
    endDate: bench.current?.endDate ?? null,
  };
}

const card = "border border-cream-200 border-t-4 border-t-pine-600 bg-white p-7 shadow-sm";

export default async function BenchPage({ params }: Props) {
  const bench = await loadBench(params);
  if (!bench) notFound();

  const today = todayInPark();
  const takenRanges = [...(bench.current ? [bench.current] : []), ...bench.upcoming].map(
    ({ startDate, endDate }) => ({ startDate, endDate }),
  );

  return (
    <div className="wrap flex flex-col gap-8 py-10">
      <Link href="/benches" className="text-pine-800 underline-offset-4 hover:underline">
        ← All benches
      </Link>

      <header>
        <p className="eyebrow">{bench.area}</p>
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <h1 className="font-mono text-3xl text-pine-900">{bench.code}</h1>
          {bench.retired ? (
            <span className="border border-cream-300 px-2 py-0.5 text-xs uppercase tracking-wider text-ink-500">
              No longer in the program
            </span>
          ) : (
            <StatusBadge status={bench.status} expiringSoon={bench.expiringSoon} />
          )}
        </div>
        {bench.description && <p className="mt-2 text-lg text-ink-700">{bench.description}</p>}
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_26rem]">
        <div className="flex flex-col gap-8">
          <section className={card}>
            <h2 className="eyebrow">Current adoption</h2>
            {bench.current ? (
              <div className="mt-3">
                <p className="text-2xl text-pine-900">{bench.current.displayName}</p>
                {bench.current.dedication && (
                  <blockquote className="mt-4 border-y border-pine-200 bg-pine-50 py-4 text-center text-lg whitespace-pre-line text-pine-900 italic">
                    {bench.current.dedication}
                  </blockquote>
                )}
                <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div>
                    <dt className="text-sm text-ink-500">Term</dt>
                    <dd>{formatTerm(bench.current.termMonths)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-ink-500">Started</dt>
                    <dd>{formatDate(bench.current.startDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-ink-500">Ends</dt>
                    <dd>
                      {formatDate(bench.current.endDate)}
                      <span className="block text-sm text-ink-500">
                        {formatRemaining(today, bench.current.endDate)}
                      </span>
                    </dd>
                  </div>
                </dl>
              </div>
            ) : (
              <p className="mt-3 text-lg text-ink-700">
                Nobody has adopted this bench right now.
                {!bench.retired && " It could be yours."}
              </p>
            )}
            {!bench.retired && (
              <p className="mt-5 border-t border-cream-200 pt-4 text-ink-700">
                {bench.nextAvailableDate === today
                  ? "Available to adopt from today."
                  : `Next available from ${formatDate(bench.nextAvailableDate)}. You can reserve it now.`}
              </p>
            )}
          </section>

          <AdoptionList title="Reserved next" adoptions={bench.upcoming} />
          <AdoptionList title="Past adopters" adoptions={bench.past} />

          <section className={card}>
            <h2 className="eyebrow">Location</h2>
            <p className="mt-3 text-ink-700">
              {bench.area}
              {bench.description && `. ${bench.description}.`}{" "}
              <a
                href={`https://www.openstreetmap.org/?mlat=${bench.lat}&mlon=${bench.lng}#map=18/${bench.lat}/${bench.lng}`}
                target="_blank"
                rel="noreferrer"
                className="text-pine-800 underline-offset-4 hover:underline"
              >
                Open in OpenStreetMap
              </a>
            </p>
            <div className="mt-4">
              <BenchMapLoader pins={[toPin(bench)]} focusId={bench.id} className="h-72" />
            </div>
          </section>
        </div>

        {!bench.retired && (
          <aside>
            <AdoptForm
              benchId={bench.id}
              benchCode={bench.code}
              today={today}
              nextAvailableDate={bench.nextAvailableDate}
              takenRanges={takenRanges}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

function AdoptionList({ title, adoptions }: { title: string; adoptions: PublicAdoption[] }) {
  if (adoptions.length === 0) return null;
  return (
    <section className={card}>
      <h2 className="eyebrow">{title}</h2>
      <ul className="mt-3 divide-y divide-cream-100">
        {adoptions.map((adoption) => (
          <li key={adoption.id} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2">
            <span>{adoption.displayName}</span>
            <span className="text-ink-500">
              {formatDate(adoption.startDate)} to {formatDate(adoption.endDate)} ({formatTerm(adoption.termMonths)})
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
