import type { Metadata } from "next";
import { BenchMapLoader } from "@/components/BenchMapLoader";
import { listBenchPins } from "@/lib/data";
import { EXPIRING_SOON_DAYS } from "@/lib/dates";
import { PIN_COLORS } from "@/lib/map-colors";

export const metadata: Metadata = { title: "Map" };

// availability changes daily, so never prerender at build time
export const dynamic = "force-dynamic";

export default async function MapPage() {
  const pins = await listBenchPins();
  const available = pins.filter((pin) => pin.status === "available").length;

  const legend = [
    { color: PIN_COLORS.available, label: `Available (${available})` },
    { color: PIN_COLORS.adopted, label: `Adopted (${pins.length - available})` },
    { color: PIN_COLORS.expiringSoon, label: `Term ends within ${EXPIRING_SOON_DAYS} days` },
  ];

  return (
    <div className="wrap flex flex-col gap-6 py-10">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">The map</p>
          <h1 className="mt-2 text-4xl text-pine-900">Where the benches are</h1>
          <p className="mt-3 max-w-2xl text-lg text-ink-700">
            Every bench in the program. Click one to see who has adopted it, or to adopt it yourself.
          </p>
        </div>
        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-base text-ink-700">
          {legend.map((item) => (
            <li key={item.label} className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block size-3 rounded-full border border-cream-50"
                style={{ background: item.color }}
              />
              {item.label}
            </li>
          ))}
        </ul>
      </section>

      <div className="border-4 border-pine-100 bg-pine-100">
        <BenchMapLoader pins={pins} />
      </div>
    </div>
  );
}
