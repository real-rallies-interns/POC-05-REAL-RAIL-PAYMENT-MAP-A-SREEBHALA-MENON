"""
Real Rails Intelligence Platform — FastAPI Backend
PoC #05: Real-Time Payments Map
Live data from: World Bank, BIS, FedNow, EPC SEPA data
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from typing import Optional
import json
import io
import csv
from data_fetcher import fetch_all_schemes
from models import SchemeResponse, CountryDetailResponse, StatsResponse

app = FastAPI(
    title="Real Rails Intelligence API",
    description="Global Real-Time Payments Infrastructure Intelligence System",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "service": "Real Rails Intelligence API",
        "version": "1.0.0",
        "endpoints": ["/api/schemes", "/api/schemes/{country_code}", "/api/stats", "/api/download"],
    }


@app.get("/api/schemes", response_model=list[SchemeResponse])
async def get_all_schemes(
    maturity: Optional[str] = Query(None, description="Filter by maturity: pioneer|growing|emerging|legacy"),
    region: Optional[str] = Query(None, description="Filter by region"),
    year_from: Optional[int] = Query(None, description="Filter schemes launched from year"),
    year_to: Optional[int] = Query(None, description="Filter schemes launched to year"),
):
    """Return all RTP schemes with optional filters."""
    schemes = fetch_all_schemes()

    if maturity:
        schemes = [s for s in schemes if s.get("maturity", "").lower() == maturity.lower()]
    if region:
        schemes = [s for s in schemes if s.get("region", "").lower() == region.lower()]
    if year_from:
        schemes = [s for s in schemes if s.get("launch_year") and s["launch_year"] >= year_from]
    if year_to:
        schemes = [s for s in schemes if s.get("launch_year") and s["launch_year"] <= year_to]

    return schemes


@app.get("/api/schemes/{country_code}", response_model=CountryDetailResponse)
async def get_country_detail(country_code: str):
    """Get detailed scheme data for a specific country (ISO 3166-1 alpha-2)."""
    schemes = fetch_all_schemes()
    country_code = country_code.upper()
    match = next((s for s in schemes if s.get("country_code", "").upper() == country_code), None)
    if not match:
        raise HTTPException(status_code=404, detail=f"No RTP data found for country: {country_code}")
    return match


@app.get("/api/stats", response_model=StatsResponse)
async def get_global_stats():
    """Return aggregated global statistics for the Intelligence Sidebar."""
    schemes = fetch_all_schemes()

    total = len(schemes)
    live = sum(1 for s in schemes if s.get("status") == "Live")
    pioneers = sum(1 for s in schemes if s.get("maturity") == "Pioneer")
    avg_limit = (
        sum(s["transaction_limit_usd"] for s in schemes if s.get("transaction_limit_usd"))
        / max(1, sum(1 for s in schemes if s.get("transaction_limit_usd")))
    )

    by_region = {}
    for s in schemes:
        r = s.get("region", "Unknown")
        by_region[r] = by_region.get(r, 0) + 1

    by_maturity = {}
    for s in schemes:
        m = s.get("maturity", "Unknown")
        by_maturity[m] = by_maturity.get(m, 0) + 1

    timeline = {}
    for s in schemes:
        yr = s.get("launch_year")
        if yr:
            timeline[str(yr)] = timeline.get(str(yr), 0) + 1

    return {
        "total_countries": total,
        "live_schemes": live,
        "pioneer_adopters": pioneers,
        "avg_transaction_limit_usd": round(avg_limit, 2),
        "by_region": by_region,
        "by_maturity": by_maturity,
        "launch_timeline": dict(sorted(timeline.items())),
    }


@app.get("/api/geojson")
async def get_geojson(
    maturity: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
):
    """Return GeoJSON FeatureCollection for map rendering."""
    schemes = fetch_all_schemes()

    if maturity:
        schemes = [s for s in schemes if s.get("maturity", "").lower() == maturity.lower()]
    if region:
        schemes = [s for s in schemes if s.get("region", "").lower() == region.lower()]

    features = []
    for s in schemes:
        if s.get("lat") and s.get("lng"):
            features.append(
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [s["lng"], s["lat"]]},
                    "properties": {
                        "country_code": s.get("country_code"),
                        "country_name": s.get("country_name"),
                        "scheme_name": s.get("scheme_name"),
                        "maturity": s.get("maturity"),
                        "status": s.get("status"),
                        "launch_year": s.get("launch_year"),
                        "operator": s.get("operator"),
                        "transaction_limit_usd": s.get("transaction_limit_usd"),
                        "iso_standard": s.get("iso_standard"),
                        "region": s.get("region"),
                    },
                }
            )

    return {"type": "FeatureCollection", "features": features}


import json as json_lib
import csv as csv_lib
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"


def _load(filename: str) -> list:
    """
    Smart loader — accepts either JSON or CSV.
    Pass the JSON filename (e.g. 'rtp_country_synthetic.json').
    If the JSON is missing it automatically falls back to the CSV equivalent.
    CSV values are auto-cast: 'true'/'false' → bool, numeric strings → float/int.
    """
    def cast(v: str):
        if v == "":           return None
        if v == "true":       return True
        if v == "false":      return False
        try:                  return int(v)
        except ValueError:    pass
        try:                  return float(v)
        except ValueError:    pass
        return v

    # 1. Try JSON first
    json_path = DATA_DIR / filename
    if json_path.exists():
        with open(json_path, encoding="utf-8") as f:
            payload = json_lib.load(f)
        return payload.get("records", payload if isinstance(payload, list) else [])

    # 2. Fall back to CSV (same stem, .csv extension)
    csv_path = DATA_DIR / (Path(filename).stem + ".csv")
    if csv_path.exists():
        rows = []
        with open(csv_path, encoding="utf-8", newline="") as f:
            for row in csv_lib.DictReader(f):
                rows.append({k: cast(v) for k, v in row.items()})
        return rows

    # 3. Nothing found
    return []


# ── Transactions ───────────────────────────────────────────────────────────────
@app.get("/api/transactions")
async def get_transactions(
    scheme: Optional[str] = Query(None, description="Filter by scheme_name e.g. UPI"),
    country: Optional[str] = Query(None, description="Filter by originating_country e.g. IN"),
    status: Optional[str] = Query(None, description="Filter by status e.g. COMPLETED"),
    tx_type: Optional[str] = Query(None, description="Filter by transaction_type e.g. P2P"),
    limit: int = Query(20, ge=1, le=200, description="Max rows to return"),
):
    """Return synthetic transactions, filterable by scheme, country, status, type."""
    rows = _load("rtp_transaction_synthetic.json")
    if not rows:
        raise HTTPException(status_code=503, detail="Transaction data not found. Place rtp_transaction_synthetic.json or .csv in /data/")
    if scheme:
        rows = [r for r in rows if r.get("scheme_name", "").upper() == scheme.upper()]
    if country:
        rows = [r for r in rows if r.get("originating_country", "").upper() == country.upper()]
    if status:
        rows = [r for r in rows if r.get("status", "").upper() == status.upper()]
    if tx_type:
        rows = [r for r in rows if r.get("transaction_type", "").upper() == tx_type.upper()]
    # Sort newest first
    rows = sorted(rows, key=lambda r: r.get("initiated_at", ""), reverse=True)
    return rows[:limit]


@app.get("/api/transactions/stats")
async def get_transaction_stats(
    scheme: Optional[str] = Query(None),
    country: Optional[str] = Query(None),
):
    """Return aggregated stats for a scheme or country's transactions."""
    rows = _load("rtp_transaction_synthetic.json")
    if scheme:
        rows = [r for r in rows if r.get("scheme_name", "").upper() == scheme.upper()]
    if country:
        rows = [r for r in rows if r.get("originating_country", "").upper() == country.upper()]
    if not rows:
        return {"total": 0, "completed": 0, "failed": 0, "success_rate": 0, "avg_latency_ms": None, "total_volume_usd": 0}

    completed = [r for r in rows if r.get("status") == "COMPLETED"]
    failed    = [r for r in rows if r.get("status") in ("FAILED", "TIMED_OUT", "REVERSED")]
    latencies = [r["latency_ms"] for r in completed if r.get("latency_ms")]
    amounts   = [r.get("amount", 0) for r in rows]

    return {
        "total":           len(rows),
        "completed":       len(completed),
        "failed":          len(failed),
        "pending":         sum(1 for r in rows if r.get("status") == "PENDING"),
        "success_rate":    round(len(completed) / len(rows) * 100, 1),
        "avg_latency_ms":  round(sum(latencies) / len(latencies)) if latencies else None,
        "total_volume_usd": round(sum(amounts), 2),
        "cross_border":    sum(1 for r in rows if r.get("is_cross_border")),
        "edge_cases":      sum(1 for r in rows if r.get("edge_case_flag") != "NORMAL"),
    }


# ── Interop Links ──────────────────────────────────────────────────────────────
@app.get("/api/interop")
async def get_interop_links(
    status: Optional[str] = Query(None, description="Filter by status e.g. Live"),
    scheme: Optional[str] = Query(None, description="Filter by scheme name (matches either side)"),
    country: Optional[str] = Query(None, description="Filter by country code (matches either side)"),
    link_type: Optional[str] = Query(None, description="Filter by link_type e.g. Bilateral"),
):
    """Return interop links between RTP schemes."""
    rows = _load("rtp_interoplink_synthetic.json")
    if not rows:
        raise HTTPException(status_code=503, detail="Interop data not found. Place rtp_interoplink_synthetic.json or .csv in /data/")
    if status:
        rows = [r for r in rows if r.get("status", "").lower() == status.lower()]
    if scheme:
        su = scheme.upper()
        rows = [r for r in rows if r.get("scheme_a_name", "").upper() == su or r.get("scheme_b_name", "").upper() == su]
    if country:
        cu = country.upper()
        rows = [r for r in rows if r.get("scheme_a_code", "").upper() == cu or r.get("scheme_b_code", "").upper() == cu]
    if link_type:
        rows = [r for r in rows if r.get("link_type", "").lower() == link_type.lower()]
    return rows


# ── Countries ──────────────────────────────────────────────────────────────────
@app.get("/api/countries")
async def get_countries(
    region:     Optional[str]  = Query(None, description="Filter by region"),
    has_scheme: Optional[bool] = Query(None, description="Filter has_live_rtp_scheme"),
    country:    Optional[str]  = Query(None, description="Exact country_code lookup"),
):
    """Return country-level economic and RTP readiness data."""
    rows = _load("rtp_country_synthetic.json")
    if not rows:
        raise HTTPException(status_code=503, detail="Country data not found. Place rtp_country_synthetic.json or .csv in /data/")
    if country:
        cu = country.upper()
        rows = [r for r in rows if r.get("country_code", "").upper() == cu]
    if region:
        rows = [r for r in rows if r.get("region", "").lower() == region.lower()]
    if has_scheme is not None:
        rows = [r for r in rows if r.get("has_live_rtp_scheme") == has_scheme]
    # Deduplicate by country_code — keep highest rtp_maturity_score
    seen: dict = {}
    for r in rows:
        cc = r.get("country_code", "")
        if cc not in seen or r.get("rtp_maturity_score", 0) > seen[cc].get("rtp_maturity_score", 0):
            seen[cc] = r
    return list(seen.values())


@app.get("/api/download")
async def download_sample_data():
    """Download the schemes dataset as CSV."""
    schemes = fetch_all_schemes()

    output = io.StringIO()
    if schemes:
        fieldnames = [
            "country_code", "country_name", "scheme_name", "status",
            "maturity", "launch_year", "operator", "transaction_limit_usd",
            "iso_standard", "region", "p2p", "p2b", "b2b", "lat", "lng",
        ]
        writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(schemes)

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=real_rails_rtp_schemes.csv"},
    )
