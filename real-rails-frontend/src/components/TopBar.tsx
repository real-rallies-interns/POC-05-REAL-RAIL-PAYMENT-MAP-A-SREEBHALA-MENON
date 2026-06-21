"use client";

import { useState } from "react";
import { Activity, Globe, Zap, Download, Info, X } from "lucide-react";
import type { GlobalStats } from "@/types";
import { downloadURL } from "@/lib/api";

interface Props {
  stats: GlobalStats | null;
  isConnected: boolean;
}

export default function TopBar({ stats, isConnected }: Props) {
  const [showMeta, setShowMeta] = useState(false);

  return (
    <header className="flex-none flex items-center justify-between px-5 py-3 border-b border-rr-border bg-rr-surface z-30 relative">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-7 h-7 rounded-md bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
            <Zap size={14} className="text-violet-400" />
          </div>
          {isConnected && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
          )}
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight text-rr-text leading-none">
            Infocreon Internship - Global RTP Intelligence
          </div>
          <div className="text-[10px] text-rr-muted tracking-widest uppercase leading-none mt-0.5">
           Payment Infrastructure Map
          </div>
        </div>
      </div>

      {/* Stats pills */}
      {stats && (
        <div className="hidden md:flex items-center gap-2">
          <Pill icon={<Globe size={11} />} label="Countries" value={stats.total_countries} />
          <Pill icon={<Activity size={11} />} label="Live Schemes" value={stats.live_schemes} />
          <Pill icon={<Zap size={11} />} label="Pioneers" value={stats.pioneer_adopters} />
        </div>
      )}

      {/* Right actions */}
      <div className="flex items-center gap-3">
        <span
          className={`flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded border ${
            isConnected
              ? "border-violet-500/30 text-violet-400 bg-violet-500/5"
              : "border-red-800/40 text-red-400 bg-red-900/10"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-violet-400 animate-pulse" : "bg-red-500"}`} />
          {isConnected ? "API LIVE" : "API OFFLINE"}
        </span>

        <a
          href={downloadURL()}
          download="rtp_schemes.csv"
          className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded border border-rr-border text-rr-dim hover:text-violet-400 hover:border-violet-500/40 transition-colors"
        >
          <Download size={12} />
          Export CSV
        </a>

        {/* (i) Developer Signature */}
        <div className="relative">
          <button
            onClick={() => setShowMeta((v) => !v)}
            className="w-7 h-7 rounded-md border border-rr-border text-rr-muted hover:text-violet-400 hover:border-violet-500/40 flex items-center justify-center transition-colors"
            title="Developer Info"
          >
            <Info size={13} />
          </button>

          {showMeta && (
            <div className="animate-fade-in-down absolute right-0 top-9 w-56 glass-card p-4 z-50 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono text-violet-400 tracking-widest uppercase">
                  Developer Signature
                </span>
                <button
                  onClick={() => setShowMeta(false)}
                  className="text-rr-muted hover:text-rr-text transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
              <div className="space-y-2 text-[12px]">
                <Row label="Architect" value="A Sreebhala Menon" />
                <Row label="Stack" value="Next.js · FastAPI · Tailwind" />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function Pill({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-violet-500/20 text-[11px] font-mono text-violet-400 bg-violet-500/5">
      {icon}
      <span className="font-semibold">{value}</span>
      <span className="text-rr-muted">{label}</span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-rr-muted">{label}</span>
      <span className="text-rr-text font-medium">{value}</span>
    </div>
  );
}
