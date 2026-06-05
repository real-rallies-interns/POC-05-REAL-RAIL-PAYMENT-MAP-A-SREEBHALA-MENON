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
