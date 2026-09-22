"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

// Leaflet touches `window` on import, so the map is only loaded in the browser.
const BenchMap = dynamic(() => import("./BenchMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[70vh] min-h-96 items-center justify-center border border-cream-200 bg-cream-100 text-ink-500">
      Loading map…
    </div>
  ),
});

export function BenchMapLoader(props: ComponentProps<typeof BenchMap>) {
  return <BenchMap {...props} />;
}
