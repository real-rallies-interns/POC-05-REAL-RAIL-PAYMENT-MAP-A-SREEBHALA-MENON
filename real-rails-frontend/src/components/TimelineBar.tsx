"use client";

import { useState } from "react";
import { Clock } from "lucide-react";

interface Props {
  timeline: Record<string, number>;
  activeYear: number | null;
  onChange: (year: number | null) => void;
}

export default function TimelineBar({ timeline, activeYear, onChange }: Props) {
  const [dragging, setDragging] = useState(false);
  // CHANGE: enforce 2010 as minimum year per Case Study spec
  const MIN_YEAR = 2010;
  const years = Object.keys(timeline).map(Number).filter(y => y >= MIN_YEAR).sort((a, b) => a - b);
  const minYear = MIN_YEAR;
  const maxYear = new Date().getFullYear(); // always current year
  const maxCount = Math.max(...years.map((y) => timeline[String(y)] || 0), 1);

  if (!years.length) return null;

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    onChange(val === maxYear ? null : val);
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-[1000] glass-card mx-4 mb-3 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Clock size={12} className="text-rr-cyan" />
          <span className="text-[10px] font-mono text-rr-muted uppercase tracking-widest">
            Launch Timeline
          </span>
        </div>
        {activeYear ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-rr-cyan">Up to {activeYear}</span>
            <button
              onClick={() => onChange(null)}
              className="text-[10px] text-rr-muted hover:text-rr-cyan transition-colors px-1.5 py-0.5 rounded border border-rr-border"
            >
              Reset
            </button>
          </div>
        ) : (
          <span className="text-[10px] font-mono text-rr-muted">All years</span>
        )}
      </div>

      {/* Bar chart mini */}
      <div className="flex items-end gap-0.5 h-8 mb-2">
        {years.map((y) => {
          const h = ((timeline[String(y)] || 0) / maxCount) * 100;
          const active = !activeYear || y <= activeYear;
          return (
            <div
              key={y}
              className="flex-1 rounded-sm transition-all duration-200"
              style={{
                height: `${Math.max(h, 8)}%`,
                background: active
                  ? `rgba(56,189,248,${0.3 + (h / 100) * 0.6})`
                  : "rgba(31,41,55,0.5)",
              }}
              title={`${y}: ${timeline[String(y)]} launch(es)`}
            />
          );
        })}
      </div>

      {/* Slider */}
      <input
        type="range"
        min={minYear}
        max={maxYear}
        step={1}
        value={activeYear ?? maxYear}
        onChange={handleSlider}
        className="w-full h-1 appearance-none rounded bg-rr-border cursor-pointer"
        style={{
          accentColor: "#38BDF8",
        }}
      />

      {/* Year labels */}
      <div className="flex justify-between mt-1">
        <span className="text-[10px] font-mono text-rr-muted">{minYear}</span>
        <span className="text-[10px] font-mono text-rr-muted">{maxYear}</span>
      </div>
    </div>
  );
}
