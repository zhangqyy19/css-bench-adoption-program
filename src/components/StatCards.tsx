import Link from "next/link";
import { EXPIRING_SOON_DAYS } from "@/lib/dates";
import type { Stats } from "@/lib/types";

export function StatCards({ stats }: { stats: Stats }) {
  const cards = [
    { label: "Benches", value: stats.total, href: "/benches", hint: "in the program" },
    { label: "Available", value: stats.available, href: "/benches?status=available", hint: "ready to adopt" },
    { label: "Adopted", value: stats.adopted, href: "/benches?status=adopted", hint: "right now" },
    {
      label: "Ending soon",
      value: stats.expiringSoon,
      href: "/benches?status=expiring",
      hint: `within ${EXPIRING_SOON_DAYS} days`,
    },
  ];

  return (
    <dl className="grid grid-cols-2 divide-pine-100 border border-pine-200 border-t-4 border-t-pine-600 bg-white shadow-sm sm:grid-cols-4 sm:divide-x">
      {cards.map((card) => (
        <Link key={card.label} href={card.href} className="p-5 hover:bg-pine-50">
          <dt className="eyebrow">{card.label}</dt>
          <dd className="mt-1 text-4xl text-pine-900 tabular-nums">{card.value}</dd>
          <p className="text-sm text-ink-500">{card.hint}</p>
        </Link>
      ))}
    </dl>
  );
}
