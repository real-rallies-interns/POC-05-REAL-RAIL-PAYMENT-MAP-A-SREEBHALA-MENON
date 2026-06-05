"use client";

import { useEffect, useRef } from "react";
import type { RTPScheme } from "@/types";
import { MATURITY_COLOR } from "@/lib/api";

// Leaflet must be loaded client-side only
let L: typeof import("leaflet") | null = null;
if (typeof window !== "undefined") {
  L = require("leaflet");
  require("leaflet/dist/leaflet.css");
}

interface Props {
  schemes: RTPScheme[];
  selected: RTPScheme | null;
  onSelect: (s: RTPScheme) => void;
}

function makeIcon(maturity: string, isSelected: boolean) {
  if (!L) return undefined;
  const color = MATURITY_COLOR[maturity] || "#6B7280";
  const size = isSelected ? 18 : 12;
  const glow = isSelected ? `drop-shadow(0 0 6px ${color})` : "none";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size + 8}" height="${size + 8}" viewBox="0 0 ${size + 8} ${size + 8}">
      ${isSelected ? `<circle cx="${(size + 8) / 2}" cy="${(size + 8) / 2}" r="${size / 2 + 3}" fill="${color}" opacity="0.15"/>` : ""}
      <circle cx="${(size + 8) / 2}" cy="${(size + 8) / 2}" r="${size / 2}" fill="${color}" opacity="${isSelected ? 1 : 0.85}"/>
      <circle cx="${(size + 8) / 2}" cy="${(size + 8) / 2}" r="${size / 4}" fill="white" opacity="0.4"/>
    </svg>
  `;
  return L.divIcon({
    html: `<div style="filter:${glow}">${svg}</div>`,
    className: "",
    iconSize: [size + 8, size + 8],
    iconAnchor: [(size + 8) / 2, (size + 8) / 2],
  });
}

export default function MapInner({ schemes, selected, onSelect }: Props) {
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  // Init map once
  useEffect(() => {
    if (!L || !containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [20, 10],
      zoom: 2,
      minZoom: 1.5,
      maxZoom: 10,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    L.control
      .attribution({ position: "bottomleft", prefix: "" })
      .addTo(map);

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when schemes change
  useEffect(() => {
    if (!L || !mapRef.current) return;
    const map = mapRef.current;

    // Remove old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    schemes.forEach((scheme) => {
      if (!scheme.lat || !scheme.lng || !L) return;
      const isSelected = selected?.country_code === scheme.country_code;
      const icon = makeIcon(scheme.maturity, isSelected);
      if (!icon) return;

      const marker = L!.marker([scheme.lat, scheme.lng], { icon })
        .addTo(map)
        .bindTooltip(
          `<strong>${scheme.country_name}</strong><br/>${scheme.scheme_name}<br/><span style="color:${MATURITY_COLOR[scheme.maturity]}">${scheme.maturity}</span>`,
          { direction: "top", offset: [0, -8] }
        )
        .on("click", () => onSelect(scheme));

      markersRef.current.set(scheme.country_code, marker);
    });
  }, [schemes, selected, onSelect]);

  // Pan to selected
  useEffect(() => {
    if (!mapRef.current || !selected?.lat || !selected?.lng) return;
    mapRef.current.flyTo([selected.lat, selected.lng], 4, { duration: 1.2 });
  }, [selected]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* Legend overlay */}
      <div className="absolute bottom-16 left-4 z-[1000] glass-card px-3 py-2.5 space-y-1.5">
        <div className="text-[10px] text-rr-muted font-mono uppercase tracking-widest mb-2">
          Maturity
        </div>
        {Object.entries(MATURITY_COLOR).map(([label, color]) => (
          <div key={label} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full flex-none"
              style={{ background: color, boxShadow: `0 0 6px ${color}60` }}
            />
            <span className="text-[11px] text-rr-dim">{label}</span>
          </div>
        ))}
      </div>

      {/* Scheme count overlay */}
      <div className="absolute top-4 left-4 z-[1000] glass-card px-3 py-2">
        <span className="text-[11px] font-mono text-rr-cyan">{schemes.length}</span>
        <span className="text-[11px] text-rr-muted ml-1">schemes visible</span>
      </div>
    </div>
  );
}
