"use client";

import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip } from "react-leaflet";
import { formatDate } from "@/lib/dates";
import { PIN_COLORS } from "@/lib/map-colors";
import type { BenchPin } from "@/lib/types";

// Van Cortlandt Park, roughly centred on the Parade Ground
const PARK_CENTER: [number, number] = [40.8945, -73.8865];

function pinColor(pin: BenchPin): string {
  if (pin.status === "available") return PIN_COLORS.available;
  return pin.expiringSoon ? PIN_COLORS.expiringSoon : PIN_COLORS.adopted;
}

type Props = {
  pins: BenchPin[];
  // when set, the map zooms to this bench and shows it alone with a larger marker
  focusId?: number;
  className?: string;
};

export default function BenchMap({ pins, focusId, className = "h-[70vh] min-h-96" }: Props) {
  const focus = focusId === undefined ? undefined : pins.find((pin) => pin.id === focusId);

  return (
    <MapContainer
      center={focus ? [focus.lat, focus.lng] : PARK_CENTER}
      zoom={focus ? 17 : 14}
      scrollWheelZoom={focus === undefined}
      className={`${className} w-full border border-cream-200`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        className="map-tiles"
      />
      {pins.map((pin) => {
        const isFocus = pin.id === focusId;
        return (
          <CircleMarker
            key={pin.id}
            center={[pin.lat, pin.lng]}
            radius={isFocus ? 10 : 6}
            pathOptions={{
              color: isFocus ? "#182919" : "#fbf8f1",
              weight: isFocus ? 2 : 1,
              fillColor: pinColor(pin),
              fillOpacity: 0.9,
            }}
          >
            {focus === undefined ? (
              <>
                <Tooltip direction="top" offset={[0, -6]}>
                  {pin.code}
                </Tooltip>
                <Popup>
                  <p className="font-mono text-sm">{pin.code}</p>
                  <p className="text-ink-500">{pin.area}</p>
                  <p className="mt-1">
                    {pin.adopter ? (
                      <>
                        Adopted by <span className="font-medium">{pin.adopter}</span>
                        {pin.endDate && <span className="text-ink-500"> until {formatDate(pin.endDate)}</span>}
                      </>
                    ) : (
                      <span className="text-pine-700">Available to adopt</span>
                    )}
                  </p>
                  <Link href={`/benches/${pin.id}`} className="mt-2 inline-block text-pine-800 underline">
                    {pin.adopter ? "View bench" : "Adopt this bench"}
                  </Link>
                </Popup>
              </>
            ) : (
              <Tooltip permanent direction="top" offset={[0, -10]}>
                {pin.code}
              </Tooltip>
            )}
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
