import type { BenchStatus } from "@/lib/types";

const STYLES: Record<BenchStatus, string> = {
  available: "border-pine-600 text-pine-700",
  adopted: "border-cream-300 text-ink-500",
};

const LABELS: Record<BenchStatus, string> = {
  available: "Available",
  adopted: "Adopted",
};

const badge = "inline-flex rounded-sm border px-2 py-0.5 text-xs uppercase tracking-wider";

export function StatusBadge({ status, expiringSoon }: { status: BenchStatus; expiringSoon?: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className={`${badge} ${STYLES[status]}`}>{LABELS[status]}</span>
      {expiringSoon && <span className={`${badge} border-brass-500 text-brass-700`}>Ending soon</span>}
    </span>
  );
}
