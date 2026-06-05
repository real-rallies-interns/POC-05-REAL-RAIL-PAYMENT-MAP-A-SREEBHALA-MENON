"use client";

import dynamic from "next/dynamic";
import type { RTPScheme } from "@/types";

const MapInner = dynamic(() => import("./MapInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-rr-black">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-rr-cyan/40 border-t-rr-cyan rounded-full animate-spin mx-auto mb-3" />
        <p className="text-rr-muted text-xs font-mono">Loading map…</p>
      </div>
    </div>
  ),
});

interface Props {
  schemes: RTPScheme[];
  selected: RTPScheme | null;
  onSelect: (s: RTPScheme) => void;
}

export default function MapView({ schemes, selected, onSelect }: Props) {
  return (
    <div className="w-full h-full">
      <MapInner schemes={schemes} selected={selected} onSelect={onSelect} />
    </div>
  );
}
