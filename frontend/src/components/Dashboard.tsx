"use client";

import { useState, useCallback } from "react";
import type { RTPScheme, GlobalStats, Filters } from "@/types";
import TopBar from "./TopBar";
import RelationalStage from "./RelationalStage"; // ← Group 2: Relational Archetype
import Sidebar from "./Sidebar";
import TimelineBar from "./TimelineBar";

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

      // Client-side filter for instant response (no network round-trip)
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

  const isConnected = initialSchemes.length > 0;

  return (
    <div className="flex flex-col h-screen bg-rr-black overflow-hidden">
      {/* Top navigation bar */}
      <TopBar stats={stats} isConnected={isConnected} />

      {/* Main 2-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main stage — 70%: Relational D3 network graph */}
        <div className="relative flex-1" style={{ width: "70%" }}>
          <RelationalStage
            schemes={schemes}
            selected={selected}
            onSelect={setSelected}
          />
          {/* Timeline overlay at bottom of stage — preserved from original */}
          {stats && (
            <TimelineBar
              timeline={stats.launch_timeline}
              activeYear={timelineYear}
              onChange={handleTimelineChange}
            />
          )}
        </div>

        {/* Intelligence sidebar — exactly 30% */}
        <div
          className="flex-none overflow-y-auto border-l border-rr-border bg-rr-surface"
          style={{ width: "30%" }}
        >
          <Sidebar
            selected={selected}
            stats={stats}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            totalVisible={schemes.length}
            onClose={() => setSelected(null)}
          />
        </div>
      </div>
    </div>
  );
}
