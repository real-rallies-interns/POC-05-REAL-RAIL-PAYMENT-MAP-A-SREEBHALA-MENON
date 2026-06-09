"use client";

import { Activity, Globe, Zap, Download } from "lucide-react";
import type { GlobalStats } from "@/types";
import { downloadURL } from "@/lib/api";

interface Props {
  stats: GlobalStats | null;
  isConnected: boolean;
}

export default function TopBar({ stats, isConnected }: Props) {
  return (
    <header className="flex-none flex items-center justify-between px-5 py-3 border-b border-rr-border bg-rr-surface z-30">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-7 h-7 rounded-md bg-rr-cyan/10 border border-rr-cyan/30 flex items-center justify-center">
            <Zap size={14} className="text-rr-cyan" />
          </div>
          {isConnected && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rr-cyan animate-pulse-slow" />
          )}
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight text-rr-text leading-none">
            REAL RAILS 
          </div>
          <div className="text-[10px] text-rr-muted tracking-widest uppercase leading-none mt-0.5">
            Global RTP Intelligence  
          </div>
        </div>
      </div>

      {/* Stats pills */}
      {stats && (
        <div className="hidden md:flex items-center gap-2">
          <Pill icon={<Globe size={11} />} label="Countries" value={stats.total_countries} color="cyan" />
          <Pill icon={<Activity size={11} />} label="Live Schemes" value={stats.live_schemes} color="indigo" />
          <Pill icon={<Zap size={11} />} label="Pioneers" value={stats.pioneer_adopters} color="cyan" />
        </div>
      )}

      {/* Right actions */}
      <div className="flex items-center gap-3">
        <span
          className={`flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded border ${
            isConnected
              ? "border-rr-cyan/30 text-rr-cyan bg-rr-cyan/5"
              : "border-red-800/40 text-red-400 bg-red-900/10"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-rr-cyan animate-pulse" : "bg-red-500"}`} />
          {isConnected ? "API LIVE" : "API OFFLINE"}
        </span>

        <a
          href={downloadURL()}
          download="real_rails_rtp_schemes.csv"
          className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded border border-rr-border text-rr-dim hover:text-rr-cyan hover:border-rr-cyan/40 transition-colors"
        >
          <Download size={12} />
          Export CSV
        </a>
      </div>
    </header>
  );
}

function Pill({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "cyan" | "indigo";
}) {
  const cls =
    color === "cyan"
      ? "border-rr-cyan/20 text-rr-cyan bg-rr-cyan/5"
      : "border-rr-indigo/20 text-rr-indigo bg-rr-indigo/5";
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-mono ${cls}`}>
      {icon}
      <span className="font-semibold">{value}</span>
      <span className="text-rr-muted">{label}</span>
    </div>
  );
}
