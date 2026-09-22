"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import type { BenchQuery, StatusFilter } from "@/lib/types";
import { benchListUrl } from "./Pagination";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "available", label: "Available" },
  { value: "adopted", label: "Adopted" },
  { value: "expiring", label: "Ending soon" },
];

// The URL is the state. This component only rewrites the query string; the
// server component re-renders the list from it.
export function FilterBar({ query, areas }: { query: BenchQuery; areas: string[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const searchInput = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Follow the URL when it changes from outside (a stat card, the header link),
  // but never overwrite what the user is in the middle of typing.
  useEffect(() => {
    const input = searchInput.current;
    if (input && document.activeElement !== input) input.value = query.q;
  }, [query.q]);

  useEffect(
    () => () => {
      if (debounce.current) clearTimeout(debounce.current);
    },
    [],
  );

  function navigate(changes: Partial<BenchQuery>) {
    if (debounce.current) clearTimeout(debounce.current);
    const next = { ...query, q: searchInput.current?.value ?? query.q, ...changes };
    // any filter change goes back to page 1
    startTransition(() => router.replace(benchListUrl(next), { scroll: false }));
  }

  function onSearchInput() {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => navigate({}), 300);
  }

  const hasFilters = query.status !== "all" || query.area !== "" || query.q !== "";

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="flex-1">
        <label htmlFor="search" className="sr-only">
          Search benches
        </label>
        <input
          ref={searchInput}
          id="search"
          type="search"
          defaultValue={query.q}
          onInput={onSearchInput}
          placeholder="Search by bench code, area or adopter"
          className="w-full border border-cream-300 bg-white px-3 py-2 outline-none focus:border-pine-600"
        />
      </div>

      <div
        role="group"
        aria-label="Status"
        className="flex border border-cream-300 bg-white p-0.5"
      >
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={query.status === option.value}
            onClick={() => navigate({ status: option.value })}
            className={`flex-1 px-3 py-1.5 whitespace-nowrap ${
              query.status === option.value ? "bg-pine-800 text-cream-50" : "text-ink-700 hover:bg-cream-100"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div>
        <label htmlFor="area" className="sr-only">
          Area
        </label>
        <select
          id="area"
          value={query.area}
          onChange={(event) => navigate({ area: event.target.value })}
          className="w-full border border-cream-300 bg-white px-3 py-2 outline-none focus:border-pine-600"
        >
          <option value="">All areas</option>
          {areas.map((area) => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            if (searchInput.current) searchInput.current.value = "";
            navigate({ status: "all", area: "", q: "" });
          }}
          className="text-pine-800 underline-offset-4 hover:underline"
        >
          Clear
        </button>
      )}

      <span aria-live="polite" className="sr-only">
        {isPending ? "Updating results" : ""}
      </span>
    </div>
  );
}
