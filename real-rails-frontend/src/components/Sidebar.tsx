"use client";

/**
 * Sidebar.tsx — Full Intelligence Panel
 * Integrations added:
 *   A) Transaction Feed — live /api/transactions when a node is selected
 *   B) Country Detail  — live /api/countries enrichment per selected node
 *   C) Interop Panel   — live /api/interop links for selected scheme
 * All existing functionality (filters, Why This Matters, Who Controls,
 * Region chart, Download) preserved and unchanged.
 */

import { useState, useEffect } from "react";
import {
  X, TrendingUp, Shield, SlidersHorizontal,
  ChevronRight, Globe, Zap, ExternalLink,
  Activity, Link2, ArrowRightLeft, AlertTriangle,
} from "lucide-react";
import type { RTPScheme, GlobalStats, Filters } from "@/types";
import { MATURITY_COLOR, MATURITY_BG, REGIONS, formatLimit, downloadURL } from "@/lib/api";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const API = typeof window === "undefined"
  ? (process.env.API_URL || "http://real-rails-backend:8000")
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000");

// ─── Local types for live data ────────────────────────────────────────────────
interface Transaction {
  transaction_id: string;
  scheme_name: string;
  transaction_type: string;
  amount: number;
  currency_code: string;
  status: string;
  failure_reason: string | null;
  initiated_at: string;
  latency_ms: number | null;
  sender_bank: string;
  receiver_bank: string;
  is_cross_border: boolean;
  edge_case_flag: string;
}

interface TxStats {
  total: number;
  completed: number;
  failed: number;
  success_rate: number;
  avg_latency_ms: number | null;
  total_volume_usd: number;
  cross_border: number;
  edge_cases: number;
}

interface InteropLink {
  link_id: string;
  scheme_a_name: string;
  scheme_b_name: string;
  scheme_a_code: string;
  scheme_b_code: string;
  status: string;
  link_type: string;
  go_live_year: number | null;
  daily_volume_usd: number | null;
  avg_settlement_seconds: number | null;
  governing_body: string;
  protocol: string;
  edge_case_flag: string;
}

interface CountryData {
  country_code: string;
  country_name: string;
  region: string;
  gdp_usd_billions: number;
  population_millions: number;
  financial_inclusion_pct: number;
  smartphone_penetration_pct: number;
  has_live_rtp_scheme: boolean;
  scheme_count: number;
  rtp_maturity_score: number;
  central_bank_name: string;
  edge_case_flag: string;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useTransactions(scheme: string | null) {
  const [txs, setTxs]       = useState<Transaction[]>([]);
  const [stats, setStats]   = useState<TxStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!scheme) { setTxs([]); setStats(null); return; }
    setLoading(true);
    Promise.all([
      fetch(`${API}/api/transactions?scheme=${encodeURIComponent(scheme)}&limit=6`).then(r => r.json()).catch(() => []),
      fetch(`${API}/api/transactions/stats?scheme=${encodeURIComponent(scheme)}`).then(r => r.json()).catch(() => null),
    ]).then(([t, s]) => {
      setTxs(Array.isArray(t) ? t : []);
      setStats(s);
    }).finally(() => setLoading(false));
  }, [scheme]);

  return { txs, stats, loading };
}

function useInteropLinks(scheme: string | null) {
  const [links, setLinks]     = useState<InteropLink[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!scheme) { setLinks([]); return; }
    setLoading(true);
    fetch(`${API}/api/interop?scheme=${encodeURIComponent(scheme)}&status=Live`)
      .then(r => r.json())
      .then(d => setLinks(Array.isArray(d) ? d.slice(0, 8) : []))
      .catch(() => setLinks([]))
      .finally(() => setLoading(false));
  }, [scheme]);

  return { links, loading };
}

function useCountryData(countryCode: string | null) {
  const [country, setCountry] = useState<CountryData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!countryCode) { setCountry(null); return; }
    setLoading(true);
    fetch(`${API}/api/countries?country=${countryCode}`)
      .then(r => r.json())
      .then(d => setCountry(Array.isArray(d) && d.length > 0 ? d[0] : null))
      .catch(() => setCountry(null))
      .finally(() => setLoading(false));
  }, [countryCode]);

  return { country, loading };
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────
interface Props {
  selected: RTPScheme | null;
  stats: GlobalStats | null;
  filters: Filters;
  onFiltersChange: (f: Partial<Filters>) => void;
  totalVisible: number;
  onClose: () => void;
}

export default function Sidebar({ selected, stats, filters, onFiltersChange, totalVisible, onClose }: Props) {
  const schemeName = selected?.scheme_name ?? null;
  const countryCode = selected?.country_code ?? null;

  const { txs, stats: txStats, loading: txLoading } = useTransactions(schemeName);
  const { links, loading: linksLoading }             = useInteropLinks(schemeName);
  const { country, loading: countryLoading }         = useCountryData(countryCode);

  return (
    <div className="flex flex-col h-full text-sm">
      {/* Section A: Title + Metrics */}
      <SectionA selected={selected} stats={stats} totalVisible={totalVisible} onClose={onClose} />

      {selected ? (
        <>
          {/* Country card with live enrichment */}
          <CountryCard scheme={selected} country={country} countryLoading={countryLoading} />

          {/* Live transaction feed */}
          <TransactionFeed txs={txs} txStats={txStats} loading={txLoading} schemeName={schemeName!} />

          {/* Live interop links */}
          <InteropPanel links={links} loading={linksLoading} schemeName={schemeName!} />
        </>
      ) : (
        <>
          <SectionB />
          <SectionC />
        </>
      )}

      {/* Filters — always visible */}
      <SectionD filters={filters} onFiltersChange={onFiltersChange} />

      {/* Regional chart — only on overview */}
      {stats && !selected && <RegionChart stats={stats} />}

      {/* Download */}
      <SectionE />
    </div>
  );
}

// ─── Section A ────────────────────────────────────────────────────────────────
function SectionA({ selected, stats, totalVisible, onClose }: {
  selected: RTPScheme | null; stats: GlobalStats | null;
  totalVisible: number; onClose: () => void;
}) {
  return (
    <div className="p-4 border-b border-rr-border">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[13px] font-semibold text-rr-text tracking-tight leading-tight">
            {selected ? selected.country_name : "Real-Time Payments Map"}
          </h1>
          <p className="text-[11px] text-rr-muted mt-0.5">
            {selected ? selected.scheme_name : "Global Infrastructure Intelligence"}
          </p>
        </div>
      </div>
      {!selected && stats && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <MetricTile label="Live Schemes" value={stats.live_schemes} sub={`of ${stats.total_countries} tracked`} color="cyan" />
          <MetricTile label="Visible Now" value={totalVisible} sub="after filters" color="indigo" />
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
  const cls = color === "cyan" ? "border-rr-cyan/20 bg-rr-cyan/5" : "border-rr-indigo/20 bg-rr-indigo/5";
  const tc  = color === "cyan" ? "text-rr-cyan" : "text-rr-indigo";
  return (
    <div className={`rounded-md border p-2.5 ${cls}`}>
      <div className={`text-lg font-mono font-semibold leading-none ${tc}`}>{value}</div>
      <div className="text-[10px] text-rr-text mt-1 leading-none">{label}</div>
      <div className="text-[10px] text-rr-muted leading-none mt-0.5">{sub}</div>
    </div>
  );
}

function MaturityBadge({ maturity, status }: { maturity: string; status: string }) {
  const color = MATURITY_COLOR[maturity] || "#6B7280";
  const bg    = MATURITY_BG[maturity]    || "rgba(107,114,128,0.1)";
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border"
        style={{ color, background: bg, borderColor: `${color}30` }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />{maturity}
      </span>
      <span className={`inline-flex items-center px-2 py-1 rounded text-[11px] border ${
        status === "Live"
          ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
          : "text-amber-400 bg-amber-400/10 border-amber-400/20"}`}>
        {status}
      </span>
    </div>
  );
}

// ─── Country Card (with live enrichment) ─────────────────────────────────────
function CountryCard({ scheme, country, countryLoading }: {
  scheme: RTPScheme; country: CountryData | null; countryLoading: boolean;
}) {
  return (
    <div className="p-4 space-y-3 border-b border-rr-border animate-slide-in">
      {scheme.description && (
        <p className="text-[12px] text-rr-dim leading-relaxed">{scheme.description}</p>
      )}

      {/* Core scheme data */}
      <div className="grid grid-cols-2 gap-2">
        <DataCell label="Launch Year" value={scheme.launch_year ? String(scheme.launch_year) : "Unknown"} />
        <DataCell label="Tx Limit"    value={formatLimit(scheme.transaction_limit_usd)} />
        <DataCell label="ISO Standard" value={scheme.iso_standard || "Proprietary"} />
        <DataCell label="Region"       value={scheme.region} />
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

      {/* Operator/Regulator */}
      <div className="space-y-2">
        <InfoRow icon={<Zap size={11} />}   label="Operator"  value={scheme.operator} />
        <InfoRow icon={<Shield size={11} />} label="Regulator" value={scheme.regulator} />
        {scheme.api_access && (
          <InfoRow icon={<Globe size={11} />} label="API Access" value={scheme.api_access} />
        )}
        {scheme.interoperability && (
          <InfoRow icon={<ChevronRight size={11} />} label="Interop" value={scheme.interoperability} />
        )}
      </div>

      {/* Governance */}
      {scheme.governance_notes && (
        <div className="rounded-md bg-rr-black border border-rr-border p-2.5">
          <div className="text-[10px] text-rr-cyan uppercase tracking-widest mb-1">Governance</div>
          <p className="text-[11px] text-rr-dim leading-relaxed">{scheme.governance_notes}</p>
        </div>
      )}

      {/* Live country enrichment from /api/countries */}
      {countryLoading ? (
        <div className="text-[10px] text-rr-muted animate-pulse">Loading country data…</div>
      ) : country ? (
        <div className="rounded-md bg-rr-black border border-rr-cyan/20 p-2.5 space-y-2">
          <div className="text-[10px] text-rr-cyan uppercase tracking-widest mb-1 flex items-center gap-1.5">
            <Globe size={10} /> Country Intelligence
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <MiniStat label="GDP" value={`$${country.gdp_usd_billions.toFixed(0)}B`} />
            <MiniStat label="Population" value={`${country.population_millions.toFixed(0)}M`} />
            <MiniStat label="Financial Inclusion" value={`${country.financial_inclusion_pct.toFixed(0)}%`} />
            <MiniStat label="Smartphone" value={`${country.smartphone_penetration_pct.toFixed(0)}%`} />
          </div>
          {/* RTP maturity score bar */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[10px] text-rr-muted">RTP Maturity Score</span>
              <span className="text-[10px] font-mono text-rr-cyan">{country.rtp_maturity_score.toFixed(1)}/10</span>
            </div>
            <div className="h-1.5 rounded-full bg-rr-border overflow-hidden">
              <div className="h-full rounded-full bg-rr-cyan transition-all duration-700"
                style={{ width: `${(country.rtp_maturity_score / 10) * 100}%` }} />
            </div>
          </div>
          {country.edge_case_flag !== "NORMAL" && (
            <div className="flex items-center gap-1.5 text-[10px] text-amber-400">
              <AlertTriangle size={10} />
              <span>{country.edge_case_flag.replace(/_/g, " ")}</span>
            </div>
          )}
          <div className="text-[10px] text-rr-muted/50 italic">Source: Synthetic dataset · World Bank proxy</div>
        </div>
      ) : null}

      {/* World Bank financial inclusion if from scheme */}
      {scheme.financial_inclusion_pct !== undefined && (
        <div className="flex items-center justify-between px-2.5 py-2 rounded-md bg-rr-black border border-rr-border">
          <span className="text-[11px] text-rr-muted">Financial Inclusion (World Bank)</span>
          <span className="text-[12px] font-mono text-rr-cyan">{scheme.financial_inclusion_pct}%</span>
        </div>
      )}

      {scheme.data_source && (
        <div className="text-[10px] text-rr-muted/60 italic">Source: {scheme.data_source}</div>
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[10px] text-rr-muted">{label}</span>
      <span className="text-[11px] font-mono text-rr-text">{value}</span>
    </div>
  );
}

function TypeTag({ label, active }: { label: string; active: boolean }) {
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
      active
        ? "border-rr-cyan/30 text-rr-cyan bg-rr-cyan/10"
        : "border-rr-border text-rr-muted/40 bg-transparent"}`}>
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

// ─── Transaction Feed (live from /api/transactions) ───────────────────────────
function TransactionFeed({ txs, txStats, loading, schemeName }: {
  txs: Transaction[]; txStats: TxStats | null;
  loading: boolean; schemeName: string;
}) {
  const STATUS_COLOR: Record<string, string> = {
    COMPLETED: "#34D399", FAILED: "#F87171",
    PENDING: "#FBBF24", REVERSED: "#818CF8", TIMED_OUT: "#F97316",
  };

  return (
    <div className="p-4 border-b border-rr-border">
      <div className="flex items-center gap-2 mb-3">
        <Activity size={13} className="text-rr-cyan" />
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-rr-muted">
          Live Transaction Feed
        </h2>
        <span className="ml-auto text-[10px] font-mono text-rr-muted/50">SYNTHETIC</span>
      </div>

      {/* Stats summary row */}
      {txStats && (
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          <StatPill label="Success" value={`${txStats.success_rate}%`} color="emerald" />
          <StatPill label="Avg ms"  value={txStats.avg_latency_ms ? `${txStats.avg_latency_ms}` : "—"} color="cyan" />
          <StatPill label="Total"   value={String(txStats.total)} color="indigo" />
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => (
            <div key={i} className="h-12 rounded-md bg-rr-black border border-rr-border animate-pulse" />
          ))}
        </div>
      ) : txs.length === 0 ? (
        <div className="text-[11px] text-rr-muted text-center py-4">
          No transactions found for {schemeName}
        </div>
      ) : (
        <div className="space-y-1.5">
          {txs.map(tx => {
            const color = STATUS_COLOR[tx.status] || "#6B7280";
            return (
              <div key={tx.transaction_id}
                className="rounded-md bg-rr-black border border-rr-border px-2.5 py-2 flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-mono text-rr-cyan">{tx.transaction_type}</span>
                    {tx.is_cross_border && (
                      <span className="text-[9px] text-rr-indigo border border-rr-indigo/30 rounded px-1">XB</span>
                    )}
                    {tx.edge_case_flag !== "NORMAL" && (
                      <AlertTriangle size={9} className="text-amber-400 flex-none" />
                    )}
                  </div>
                  <div className="text-[10px] text-rr-muted truncate">
                    {tx.sender_bank} → {tx.receiver_bank}
                  </div>
                  {tx.failure_reason && (
                    <div className="text-[9px] text-red-400 mt-0.5">{tx.failure_reason}</div>
                  )}
                </div>
                <div className="text-right flex-none">
                  <div className="text-[11px] font-mono text-rr-text">
                    {tx.amount.toLocaleString()} {tx.currency_code}
                  </div>
                  <div className="text-[10px] font-mono" style={{ color }}>
                    {tx.status}
                  </div>
                  {tx.latency_ms && (
                    <div className="text-[9px] text-rr-muted">{tx.latency_ms}ms</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  const cls: Record<string, string> = {
    emerald: "border-emerald-400/20 bg-emerald-400/5 text-emerald-400",
    cyan:    "border-rr-cyan/20    bg-rr-cyan/5    text-rr-cyan",
    indigo:  "border-rr-indigo/20  bg-rr-indigo/5  text-rr-indigo",
  };
  return (
    <div className={`rounded border px-2 py-1.5 ${cls[color] || cls.cyan}`}>
      <div className="text-[12px] font-mono font-semibold leading-none">{value}</div>
      <div className="text-[9px] opacity-70 mt-0.5 uppercase tracking-wider">{label}</div>
    </div>
  );
}

// ─── Interop Panel (live from /api/interop) ───────────────────────────────────
function InteropPanel({ links, loading, schemeName }: {
  links: InteropLink[]; loading: boolean; schemeName: string;
}) {
  const STATUS_DOT: Record<string, string> = {
    Live: "#34D399", Pilot: "#FBBF24",
    Planned: "#818CF8", Suspended: "#F87171", Deprecated: "#6B7280",
  };

  return (
    <div className="p-4 border-b border-rr-border">
      <div className="flex items-center gap-2 mb-3">
        <Link2 size={13} className="text-rr-indigo" />
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-rr-muted">
          Interop Links
        </h2>
        <span className="ml-auto text-[10px] font-mono text-rr-muted bg-rr-black border border-rr-border rounded px-1.5 py-0.5">
          {links.length} live
        </span>
      </div>

      {loading ? (
        <div className="space-y-1.5">
          {[1,2].map(i => <div key={i} className="h-10 rounded-md bg-rr-black border border-rr-border animate-pulse" />)}
        </div>
      ) : links.length === 0 ? (
        <div className="text-[11px] text-rr-muted text-center py-3">
          No live interop links for {schemeName}
        </div>
      ) : (
        <div className="space-y-1.5">
          {links.map(lnk => {
            const isA     = lnk.scheme_a_name.toUpperCase() === schemeName.toUpperCase();
            const partner = isA ? lnk.scheme_b_name : lnk.scheme_a_name;
            const partnerCode = isA ? lnk.scheme_b_code : lnk.scheme_a_code;
            const dot     = STATUS_DOT[lnk.status] || "#6B7280";
            return (
              <div key={lnk.link_id}
                className="rounded-md bg-rr-black border border-rr-border px-2.5 py-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: dot }} />
                    <span className="text-[11px] font-mono text-rr-text">{schemeName}</span>
                    <ArrowRightLeft size={9} className="text-rr-muted" />
                    <span className="text-[11px] font-mono text-rr-indigo">{partner}</span>
                    <span className="text-[9px] text-rr-muted">({partnerCode})</span>
                  </div>
                  <span className="text-[9px] text-rr-muted">{lnk.link_type}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-rr-muted">
                  <span>{lnk.governing_body}</span>
                  {lnk.daily_volume_usd && (
                    <span className="font-mono text-rr-cyan">
                      ${(lnk.daily_volume_usd / 1_000_000).toFixed(1)}M/day
                    </span>
                  )}
                </div>
                {lnk.avg_settlement_seconds && (
                  <div className="text-[9px] text-rr-muted mt-0.5">
                    Avg settlement: {lnk.avg_settlement_seconds}s · {lnk.protocol}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Section B: Why This Matters ─────────────────────────────────────────────
function SectionB() {
  return (
    <div className="p-4 border-b border-rr-border">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp size={13} className="text-rr-cyan" />
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-rr-muted">Why This Matters</h2>
      </div>
      <p className="text-[12px] text-rr-dim leading-relaxed">
        Real-time payment rails are the backbone of the digital economy. Countries with mature instant
        payment infrastructure see measurable boosts in{" "}
        <span className="text-rr-cyan">money velocity</span>, financial inclusion, and startup formation rate.
      </p>
      <div className="mt-3 space-y-2">
        <InsightRow text="India's UPI processes 14B+ transactions/month — faster than Visa globally" />
        <InsightRow text="Brazil's Pix cut cash-to-digital conversion time from days to seconds" />
        <InsightRow text="FedNow launched in 2023 — USA was a late Pioneer by global standards" />
      </div>
    </div>
  );
}

function InsightRow({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-rr-cyan text-[11px] mt-0.5 flex-none">→</span>
      <p className="text-[11px] text-rr-dim leading-snug">{text}</p>
    </div>
  );
}

// ─── Section C: Who Controls the Rail ────────────────────────────────────────
function SectionC() {
  return (
    <div className="p-4 border-b border-rr-border">
      <div className="flex items-center gap-2 mb-2">
        <Shield size={13} className="text-rr-indigo" />
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-rr-muted">Who Controls the Rail</h2>
      </div>
      <p className="text-[12px] text-rr-dim leading-relaxed">
        Real-time payment rails are governed by either{" "}
        <span className="text-rr-indigo">central banks</span> or{" "}
        <span className="text-rr-indigo">private consortia</span>. The governing body determines who can
        access the rail, what standards apply, and how settlements are finalized.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <GovBox label="Central Bank"  examples="RBI (UPI), BCB (Pix), BI (BI-FAST), Fed (FedNow)" color="cyan" />
        <GovBox label="Consortium"    examples="EPC (SEPA Inst), Pay.UK (FPS), NPPA (NPP), BKM (FAST)" color="indigo" />
      </div>
    </div>
  );
}

function GovBox({ label, examples, color }: { label: string; examples: string; color: "cyan" | "indigo" }) {
  const cl = color === "cyan" ? "border-rr-cyan/20 bg-rr-cyan/5" : "border-rr-indigo/20 bg-rr-indigo/5";
  const tc = color === "cyan" ? "text-rr-cyan" : "text-rr-indigo";
  return (
    <div className={`rounded-md border p-2.5 ${cl}`}>
      <div className={`text-[11px] font-semibold ${tc} mb-1`}>{label}</div>
      <div className="text-[10px] text-rr-muted leading-relaxed">{examples}</div>
    </div>
  );
}

// ─── Section D: Filters ───────────────────────────────────────────────────────
function SectionD({ filters, onFiltersChange }: {
  filters: Filters; onFiltersChange: (f: Partial<Filters>) => void;
}) {
  return (
    <div className="p-4 border-b border-rr-border">
      <div className="flex items-center gap-2 mb-3">
        <SlidersHorizontal size={13} className="text-rr-cyan" />
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-rr-muted">Filters</h2>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-[10px] text-rr-muted uppercase tracking-wider block mb-1.5">Maturity Level</label>
          <div className="flex flex-wrap gap-1.5">
            {["", "Pioneer", "Growing", "Emerging"].map(m => (
              <button key={m || "all"} onClick={() => onFiltersChange({ maturity: m })}
                className={`px-2.5 py-1 rounded text-[11px] border transition-all ${
                  filters.maturity === m
                    ? "border-rr-cyan/50 text-rr-cyan bg-rr-cyan/10 active-glow"
                    : "border-rr-border text-rr-muted hover:border-rr-cyan/30 hover:text-rr-cyan"}`}>
                {m || "All"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] text-rr-muted uppercase tracking-wider block mb-1.5">Region</label>
          <select value={filters.region} onChange={e => onFiltersChange({ region: e.target.value })}
            className="w-full bg-rr-black border border-rr-border text-rr-dim text-[12px] rounded-md px-2.5 py-1.5 outline-none focus:border-rr-cyan/50 transition-colors">
            <option value="">All Regions</option>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        {(filters.maturity || filters.region) && (
          <button onClick={() => onFiltersChange({ maturity: "", region: "" })}
            className="text-[11px] text-rr-muted hover:text-rr-cyan transition-colors underline underline-offset-2">
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Regional Chart ───────────────────────────────────────────────────────────
function RegionChart({ stats }: { stats: GlobalStats }) {
  const data = Object.entries(stats.by_region)
    .sort((a, b) => b[1] - a[1])
    .map(([region, count]) => ({ region: region.split(" ")[0], count }));
  return (
    <div className="p-4 border-b border-rr-border">
      <div className="text-[10px] text-rr-muted uppercase tracking-widest mb-3">Schemes by Region</div>
      <ResponsiveContainer width="100%" height={100}>
        <BarChart data={data} barSize={14} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
          <XAxis dataKey="region" tick={{ fill: "#6B7280", fontSize: 9 }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: "rgba(56,189,248,0.05)" }}
            contentStyle={{ background: "#0B1117", border: "1px solid #1F2937", borderRadius: 6, fontSize: 11, color: "#E2E8F0" }} />
          <Bar dataKey="count" radius={[3,3,0,0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={i === 0 ? "#38BDF8" : i === 1 ? "#818CF8" : `rgba(56,189,248,${0.5 - i * 0.07})`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Section E: Download ──────────────────────────────────────────────────────
function SectionE() {
  return (
    <div className="p-4 mt-auto">
      <a href={downloadURL()} download="real_rails_rtp_schemes.csv"
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-md border border-rr-cyan/30 text-rr-cyan text-[12px] font-medium hover:bg-rr-cyan/10 active-glow transition-all">
        <ExternalLink size={13} />Download Sample Dataset
      </a>
      <p className="text-[10px] text-rr-muted/50 text-center mt-2 leading-relaxed">
        44 RTP schemes · BIS CPMI + World Bank sources
      </p>
    </div>
  );
}
