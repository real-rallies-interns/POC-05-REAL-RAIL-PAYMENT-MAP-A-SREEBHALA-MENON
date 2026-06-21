"use client";

import { useState, useCallback } from "react";
import type { RTPScheme, GlobalStats, Filters } from "@/types";
import TopBar from "./TopBar";
import RelationalStage from "./RelationalStage";
import Sidebar from "./Sidebar";
import TimelineBar from "./TimelineBar";
import { X } from "lucide-react";

interface Props {
  initialSchemes: RTPScheme[];
  initialStats: GlobalStats | null;
}

export default function Dashboard({ initialSchemes, initialStats }: Props) {
  const [schemes, setSchemes] = useState<RTPScheme[]>(initialSchemes);
  const [stats] = useState<GlobalStats | null>(initialStats);
  const [selected, setSelected] = useState<RTPScheme | null>(null);
  const [filters, setFilters] = useState<Filters>({
    maturity: "",
    region: "",
    yearFrom: 2004,
    yearTo: 2024,
  });
  const [timelineYear, setTimelineYear] = useState<number | null>(null);

  const handleFiltersChange = useCallback(
    (next: Partial<Filters>) => {
      const merged = { ...filters, ...next };
      setFilters(merged);
      let filtered = initialSchemes;
      if (merged.maturity) filtered = filtered.filter((s) => s.maturity === merged.maturity);
      if (merged.region)   filtered = filtered.filter((s) => s.region === merged.region);
      if (merged.yearFrom || merged.yearTo) {
        filtered = filtered.filter((s) => {
          if (!s.launch_year) return true;
          return s.launch_year >= merged.yearFrom && s.launch_year <= merged.yearTo;
        });
      }
      setSchemes(filtered);
    },
    [filters, initialSchemes]
  );

  const handleTimelineChange = useCallback(
    (year: number | null) => {
      setTimelineYear(year);
      if (!year) {
        setSchemes(initialSchemes);
        return;
      }
      setSchemes(initialSchemes.filter((s) => s.launch_year && s.launch_year <= year));
    },
    [initialSchemes]
  );

  const handleClose = useCallback(() => setSelected(null), []);
  const isConnected = initialSchemes.length > 0;

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ backgroundColor: "#0F0608" }}>
      {/* Pillar III: Top navigation bar with (i) signature */}
      <TopBar stats={stats} isConnected={isConnected} />

      {/* Pillar II: 100% Full Screen Stage */}
      <div className="relative flex-1 overflow-hidden">

        {/* Map takes full 100% width */}
        <RelationalStage
          schemes={schemes}
          selected={selected}
          onSelect={setSelected}
        />

        {/* Timeline overlay at bottom */}
        {stats && (
          <TimelineBar
            timeline={stats.launch_timeline}
            activeYear={timelineYear}
            onChange={handleTimelineChange}
          />
        )}

        {/* Pillar II: Slide-over Intelligence Panel — hidden until node clicked */}
        {selected && (
          <>
            {/* Backdrop dimmer */}
            <div
              className="absolute inset-0 bg-black/30 z-20"
              onClick={handleClose}
            />

            {/* Slide-over panel from right */}
            <div
              className="animate-slide-in absolute top-0 right-0 h-full z-30 overflow-y-auto border-l border-rr-border"
              style={{
                width: "30%",
                minWidth: "320px",
                backgroundColor: "rgba(13, 11, 26, 0.97)",
                backdropFilter: "blur(16px)",
              }}
            >
              {/* Close button */}
	<button
	  onClick={handleClose}
	  className="absolute top-4 right-4 z-10 w-6 h-6 rounded flex items-center justify-center text-rr-muted hover:text-violet-400 hover:bg-violet-500/10 transition-colors"
	  title="Close panel"
	>
	 <X size={14} />
	</button>
              <Sidebar
                selected={selected}
                stats={stats}
                filters={filters}
                onFiltersChange={handleFiltersChange}
                totalVisible={schemes.length}
                onClose={handleClose}
              />
            </div>
          </>
        )}

        {/* When no node selected: show filter hint */}
        {!selected && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-[11px] text-rr-muted font-mono pointer-events-none opacity-60">
            Click a node to open Intelligence Panel
          </div>
        )}
      </div>
    </div>
  );
}
