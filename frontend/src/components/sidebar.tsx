"use client";

import { X, TrendingUp, Shield, SlidersHorizontal, ChevronRight, Globe, Zap, ExternalLink } from "lucide-react";
import type { RTPScheme, GlobalStats, Filters } from "@/types";
import { MATURITY_COLOR, MATURITY_BG, REGIONS, formatLimit, downloadURL } from "@/lib/api";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Props {
  selected: RTPScheme | null;
  stats: GlobalStats | null;
  filters: Filters;
  onFiltersChange: (f: Partial<Filters>) => void;
  totalVisible: number;
  onClose: () => void;
}

export default function Sidebar({ selected, stats, filters, onFiltersChange, totalVisible, onClose }: Props) {
  return (
    <div className="flex flex-col h-full text-sm">
      {/* Section A: Title + Metric */}
      <SectionA selected={selected} stats={stats} totalVisible={totalVisible} onClose={onClose} />

      {/* If a country is selected, show country card */}
      {selected ? (
        <CountryCard scheme={selected} />
      ) : (
        <>
          {/* Section B: Why This Matters */}
          <SectionB />
          {/* Section C: Who Controls the Rail */}
          <SectionC />
        </>
      )}

      {/* Section D: Filters */}
      <SectionD filters={filters} onFiltersChange={onFiltersChange} />

      {/* Regional chart */}
      {stats && !selected && <RegionChart stats={stats} />}

      {/* Section E: Download */}
      <SectionE />
    </div>
  );
}

// ─── Section A ────────────────────────────────────────────────────────────────
function SectionA({
  selected,
  stats,
  totalVisible,
  onClose,
}: {
  selected: RTPScheme | null;
  stats: GlobalStats | null;
  totalVisible: number;
  onClose: () => void;
}) {
  return (
    <div className="p-4 border-b border-rr-border">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[13px] font-semibold text-rr-text tracking-tight leading-tight">
            {selected ? selected.country_name : "Real-Time Payments Map"}
          </h1>
          {selected ? (
            <p className="text-[11px] text-rr-muted mt-0.5">{selected.scheme_name}</p>
          ) : (
            <p className="text-[11px] text-rr-muted mt-0.5">Global Infrastructure Intelligence</p>
          )}
        </div>
        {selected && (
          <button
            onClick={onClose}
            className="w-6 h-6 rounded flex items-center justify-center text-rr-muted hover:text-rr-cyan hover:bg-rr-cyan/10 transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Key metric */}
      {!selected && stats && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <MetricTile
            label="Live Schemes"
            value={stats.live_schemes}
            sub={`of ${stats.total_countries} tracked`}
            color="cyan"
          />
          <MetricTile
            label="Visible Now"
            value={totalVisible}
            sub="after filters"
            color="indigo"
          />
        </div>
      )}

      {selected && (
        <div className="mt-3">
          <MaturityBadge maturity={selected.maturity} status={selected.status} />
        </div>
      )}
    </div>
  );
}

function MetricTile({ label, value, sub, color }: { label: string; value: number; sub: string; color: "cyan" | "indigo" }) {
  const cls = color === "cyan"
    ? "border-rr-cyan/20 bg-rr-cyan/5"
    : "border-rr-indigo/20 bg-rr-indigo/5";
  const textCls = color === "cyan" ? "text-rr-cyan" : "text-rr-indigo";
  return (
    <div className={`rounded-md border p-2.5 ${cls}`}>
      <div className={`text-lg font-mono font-semibold leading-none ${textCls}`}>{value}</div>
      <div className="text-[10px] text-rr-text mt-1 leading-none">{label}</div>
      <div className="text-[10px] text-rr-muted leading-none mt-0.5">{sub}</div>
    </div>
  );
}

function MaturityBadge({ maturity, status }: { maturity: string; status: string }) {
  const color = MATURITY_COLOR[maturity] || "#6B7280";
  const bg = MATURITY_BG[maturity] || "rgba(107,114,128,0.1)";
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border"
        style={{ color, background: bg, borderColor: `${color}30` }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
        {maturity}
      </span>
      <span
        className={`inline-flex items-center px-2 py-1 rounded text-[11px] border ${
          status === "Live"
            ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
            : "text-amber-400 bg-amber-400/10 border-amber-400/20"
        }`}
      >
        {status}
      </span>
    </div>
  );
}

// ─── Country Card ──────────────────────────────────────────────────────────────
function CountryCard({ scheme }: { scheme: RTPScheme }) {
  return (
    <div className="p-4 space-y-4 animate-slide-in border-b border-rr-border">
      {/* Description */}
      {scheme.description && (
        <p className="text-[12px] text-rr-dim leading-relaxed">{scheme.description}</p>
      )}

      {/* Key data grid */}
      <div className="grid grid-cols-2 gap-2">
        <DataCell label="Launch Year" value={scheme.launch_year ? String(scheme.launch_year) : "Unknown"} />
        <DataCell label="Tx Limit" value={formatLimit(scheme.transaction_limit_usd)} />
        <DataCell label="ISO Standard" value={scheme.iso_standard || "Proprietary"} />
        <DataCell label="Region" value={scheme.region} />
      </div>

      {/* Transaction types */}
      <div>
        <div className="text-[10px] text-rr-muted uppercase tracking-widest mb-1.5">Transaction Types</div>
        <div className="flex gap-2">
          <TypeTag label="P2P" active={scheme.p2p} />
          <TypeTag label="P2B" active={scheme.p2b} />
          <TypeTag label="B2B" active={scheme.b2b} />
        </div>
      </div>

      {/* Operator / Regulator */}
      <div className="space-y-2">
        <InfoRow icon={<Zap size={11} />} label="Operator" value={scheme.operator} />
        <InfoRow icon={<Shield size={11} />} label="Regulator" value={scheme.regulator} />
        {scheme.api_access && (
          <InfoRow icon={<Globe size={11} />} label="API Access" value={scheme.api_access} />
        )}
        {scheme.interoperability && (
          <InfoRow icon={<ChevronRight size={11} />} label="Interop" value={scheme.interoperability} />
        )}
      </div>

      {/* Governance notes */}
      {scheme.governance_notes && (
        <div className="rounded-md bg-rr-black border border-rr-border p-2.5">
          <div className="text-[10px] text-rr-cyan uppercase tracking-widest mb-1">Governance</div>
          <p className="text-[11px] text-rr-dim leading-relaxed">{scheme.governance_notes}</p>
        </div>
      )}

      {/* World Bank enrichment */}
      {scheme.financial_inclusion_pct !== undefined && (
        <div className="flex items-center justify-between px-2.5 py-2 rounded-md bg-rr-black border border-rr-border">
          <span className="text-[11px] text-rr-muted">Financial Inclusion (World Bank)</span>
          <span className="text-[12px] font-mono text-rr-cyan">{scheme.financial_inclusion_pct}%</span>
        </div>
      )}

      {/* Source */}
      {scheme.data_source && (
        <div className="text-[10px] text-rr-muted/60 italic">
          Source: {scheme.data_source}
        </div>
      )}
    </div>
  );
}

function DataCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-rr-black border border-rr-border p-2">
      <div className="text-[10px] text-rr-muted uppercase tracking-wider leading-none">{label}</div>
      <div className="text-[12px] text-rr-text font-mono mt-1 leading-tight">{value}</div>
    </div>
  );
}

function TypeTag({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
        active
          ? "border-rr-cyan/30 text-rr-cyan bg-rr-cyan/10"
          : "border-rr-border text-rr-muted/40 bg-transparent"
      }`}
    >
      {label}
    </span>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-rr-cyan mt-0.5 flex-none">{icon}</span>
      <div>
        <span className="text-[10px] text-rr-muted uppercase tracking-wider">{label}: </span>
        <span className="text-[11px] text-rr-dim">{value}</span>
      </div>
    </div>
  );
}

// ─── Section B: Why This Matters ──────────────────────────────────────────────
function SectionB() {
  return (
    <div className="p-4 border-b border-rr-border">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp size={13} className="text-rr-cyan" />
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-rr-muted">
          Why This Matters
        </h2>
      </div>
      <p className="text-[12px] text-rr-dim leading-relaxed">
        Real-time payment rails are the backbone of the digital economy. Countries with mature instant
        payment infrastructure see measurable boosts in <span className="text-rr-cyan">money velocity</span>,
        financial inclusion, and startup formation rate.
      </p>
      <div className="mt-3 space-y-2">
        <InsightRow
          icon="→"
          text="India's UPI processes 14B+ transactions/month — faster than Visa globally"
        />
        <InsightRow
          icon="→"
          text="Brazil's Pix cut cash-to-digital conversion time from days to seconds"
        />
        <InsightRow
          icon="→"
          text="FedNow launched in 2023 — USA was a late Pioneer by global standards"
        />
      </div>
    </div>
  );
}

function InsightRow({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-rr-cyan text-[11px] mt-0.5 flex-none">{icon}</span>
      <p className="text-[11px] text-rr-dim leading-snug">{text}</p>
    </div>
  );
}

// ─── Section C: Who Controls the Rail ─────────────────────────────────────────
function SectionC() {
  return (
    <div className="p-4 border-b border-rr-border">
      <div className="flex items-center gap-2 mb-2">
        <Shield size={13} className="text-rr-indigo" />
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-rr-muted">
          Who Controls the Rail
        </h2>
      </div>
      <p className="text-[12px] text-rr-dim leading-relaxed">
        Real-time payment rails are governed by either <span className="text-rr-indigo">central banks</span> or
        {" "}<span className="text-rr-indigo">private consortia</span>. The governing body determines who can
        access the rail, what standards apply, and how settlements are finalized.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <GovBox
          label="Central Bank"
          examples="RBI (UPI), BCB (Pix), BI (BI-FAST), Fed (FedNow)"
          color="cyan"
        />
        <GovBox
          label="Consortium"
          examples="EPC (SEPA Inst), Pay.UK (FPS), NPPA (NPP), BKM (FAST)"
          color="indigo"
        />
      </div>
    </div>
  );
}

function GovBox({ label, examples, color }: { label: string; examples: string; color: "cyan" | "indigo" }) {
  const cl = color === "cyan"
    ? "border-rr-cyan/20 bg-rr-cyan/5"
    : "border-rr-indigo/20 bg-rr-indigo/5";
  const tc = color === "cyan" ? "text-rr-cyan" : "text-rr-indigo";
  return (
    <div className={`rounded-md border p-2.5 ${cl}`}>
      <div className={`text-[11px] font-semibold ${tc} mb-1`}>{label}</div>
      <div className="text-[10px] text-rr-muted leading-relaxed">{examples}</div>
    </div>
  );
}

// ─── Section D: Filters ────────────────────────────────────────────────────────
function SectionD({ filters, onFiltersChange }: { filters: Filters; onFiltersChange: (f: Partial<Filters>) => void }) {
  return (
    <div className="p-4 border-b border-rr-border">
      <div className="flex items-center gap-2 mb-3">
        <SlidersHorizontal size={13} className="text-rr-cyan" />
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-rr-muted">
          Filters
        </h2>
      </div>

      <div className="space-y-3">
        {/* Maturity */}
        <div>
          <label className="text-[10px] text-rr-muted uppercase tracking-wider block mb-1.5">
            Maturity Level
          </label>
          <div className="flex flex-wrap gap-1.5">
            {["", "Pioneer", "Growing", "Emerging"].map((m) => (
              <button
                key={m || "all"}
                onClick={() => onFiltersChange({ maturity: m })}
                className={`px-2.5 py-1 rounded text-[11px] border transition-all ${
                  filters.maturity === m
                    ? "border-rr-cyan/50 text-rr-cyan bg-rr-cyan/10 active-glow"
                    : "border-rr-border text-rr-muted hover:border-rr-cyan/30 hover:text-rr-cyan"
                }`}
              >
                {m || "All"}
              </button>
            ))}
          </div>
        </div>

        {/* Region */}
        <div>
          <label className="text-[10px] text-rr-muted uppercase tracking-wider block mb-1.5">
            Region
          </label>
          <select
            value={filters.region}
            onChange={(e) => onFiltersChange({ region: e.target.value })}
            className="w-full bg-rr-black border border-rr-border text-rr-dim text-[12px] rounded-md px-2.5 py-1.5 outline-none focus:border-rr-cyan/50 transition-colors"
          >
            <option value="">All Regions</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Reset */}
        {(filters.maturity || filters.region) && (
          <button
            onClick={() => onFiltersChange({ maturity: "", region: "" })}
            className="text-[11px] text-rr-muted hover:text-rr-cyan transition-colors underline underline-offset-2"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Regional Chart ────────────────────────────────────────────────────────────
function RegionChart({ stats }: { stats: GlobalStats }) {
  const data = Object.entries(stats.by_region)
    .sort((a, b) => b[1] - a[1])
    .map(([region, count]) => ({
      region: region.split(" ")[0], // Shorten label
      count,
    }));

  return (
    <div className="p-4 border-b border-rr-border">
      <div className="text-[10px] text-rr-muted uppercase tracking-widest mb-3">
        Schemes by Region
      </div>
      <ResponsiveContainer width="100%" height={100}>
        <BarChart data={data} barSize={14} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
          <XAxis
            dataKey="region"
            tick={{ fill: "#6B7280", fontSize: 9 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(56,189,248,0.05)" }}
            contentStyle={{
              background: "#0B1117",
              border: "1px solid #1F2937",
              borderRadius: 6,
              fontSize: 11,
              color: "#E2E8F0",
            }}
          />
          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={i === 0 ? "#38BDF8" : i === 1 ? "#818CF8" : `rgba(56,189,248,${0.5 - i * 0.07})`}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Section E: Download ───────────────────────────────────────────────────────
function SectionE() {
  return (
    <div className="p-4 mt-auto">
      <a
        href={downloadURL()}
        download="real_rails_rtp_schemes.csv"
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-md border border-rr-cyan/30 text-rr-cyan text-[12px] font-medium hover:bg-rr-cyan/10 active-glow transition-all"
      >
        <ExternalLink size={13} />
        Download Sample Dataset
      </a>
      <p className="text-[10px] text-rr-muted/50 text-center mt-2 leading-relaxed">
        44 RTP schemes · BIS CPMI + World Bank sources
      </p>
    </div>
  );
}
