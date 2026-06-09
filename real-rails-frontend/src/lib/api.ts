import type { RTPScheme, GlobalStats, Filters } from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function buildQuery(filters: Partial<Filters>): string {
  const params = new URLSearchParams();
  if (filters.maturity) params.set("maturity", filters.maturity);
  if (filters.region)   params.set("region", filters.region);
  if (filters.yearFrom) params.set("year_from", String(filters.yearFrom));
  if (filters.yearTo)   params.set("year_to", String(filters.yearTo));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchSchemes(filters: Partial<Filters> = {}): Promise<RTPScheme[]> {
  const res = await fetch(`${BASE}/api/schemes${buildQuery(filters)}`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error("Failed to fetch schemes");
  return res.json();
}

export async function fetchCountryDetail(code: string): Promise<RTPScheme> {
  const res = await fetch(`${BASE}/api/schemes/${code}`);
  if (!res.ok) throw new Error(`No data for ${code}`);
  return res.json();
}

export async function fetchStats(): Promise<GlobalStats> {
  const res = await fetch(`${BASE}/api/stats`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export async function fetchGeoJSON(filters: Partial<Filters> = {}): Promise<GeoJSON.FeatureCollection> {
  const res = await fetch(`${BASE}/api/geojson${buildQuery(filters)}`);
  if (!res.ok) throw new Error("Failed to fetch GeoJSON");
  return res.json();
}

export function downloadURL(): string {
  return `${BASE}/api/download`;
}

export function formatLimit(usd: number | null): string {
  if (!usd) return "No limit stated";
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000)     return `$${(usd / 1_000).toFixed(0)}K`;
  return `$${usd}`;
}

export const MATURITY_COLOR: Record<string, string> = {
  Pioneer:  "#38BDF8",
  Growing:  "#818CF8",
  Emerging: "#34D399",
  Legacy:   "#6B7280",
};

export const MATURITY_BG: Record<string, string> = {
  Pioneer:  "rgba(56,189,248,0.12)",
  Growing:  "rgba(129,140,248,0.12)",
  Emerging: "rgba(52,211,153,0.12)",
  Legacy:   "rgba(107,114,128,0.12)",
};

export const REGIONS = [
  "Asia-Pacific",
  "Europe",
  "North America",
  "Latin America",
  "Africa",
  "Middle East",
];
