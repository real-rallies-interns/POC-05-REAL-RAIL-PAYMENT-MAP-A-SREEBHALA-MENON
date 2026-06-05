export type Maturity = "Pioneer" | "Growing" | "Emerging" | "Legacy";
export type SchemeStatus = "Live" | "In Development" | "Pilot" | "Status Unknown";

export interface RTPScheme {
  country_code: string;
  country_name: string;
  scheme_name: string;
  status: SchemeStatus;
  maturity: Maturity;
  launch_year: number | null;
  operator: string;
  regulator: string;
  transaction_limit_usd: number | null;
  iso_standard: string | null;
  region: string;
  p2p: boolean;
  p2b: boolean;
  b2b: boolean;
  lat: number | null;
  lng: number | null;
  description?: string;
  governance_notes?: string;
  api_access?: string;
  interoperability?: string;
  source?: string;
  data_source?: string;
  financial_inclusion_pct?: number;
}

export interface GlobalStats {
  total_countries: number;
  live_schemes: number;
  pioneer_adopters: number;
  avg_transaction_limit_usd: number;
  by_region: Record<string, number>;
  by_maturity: Record<string, number>;
  launch_timeline: Record<string, number>;
}

export interface Filters {
  maturity: string;
  region: string;
  yearFrom: number;
  yearTo: number;
}
