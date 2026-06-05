# Real Rails Intelligence API — Backend

**PoC #05: Real-Time Payments Map**
FastAPI backend for the Real Rails Intelligence Platform.

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Copy and configure environment
cp .env.example .env

# 3. Run the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API docs available at: http://localhost:8000/docs

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/schemes` | All RTP schemes (filterable) |
| GET | `/api/schemes/{country_code}` | Single country detail |
| GET | `/api/stats` | Global aggregated statistics |
| GET | `/api/geojson` | GeoJSON FeatureCollection for map |
| GET | `/api/download` | Download CSV of all schemes |

## Query Parameters (`/api/schemes` and `/api/geojson`)

- `maturity` — `pioneer` \| `growing` \| `emerging` \| `legacy`
- `region` — e.g. `Asia-Pacific`, `Europe`, `Latin America`, `Africa`, `North America`, `Middle East`
- `year_from` / `year_to` — integer year filters

## Data Sources

All data is labeled with its institutional source. **Zero Hallucination policy**: countries without confirmed public scheme data are not included or are labeled `Status Unknown`.

Live data enrichment is attempted from:
- **World Bank WDI** — Financial inclusion indicators (FX.OWN.TOTL.ZS)
- **Authoritative curated dataset** — BIS CPMI Red Book, central bank publications, EPC, NPCI, SWIFT

## Architecture

```
main.py          → FastAPI app, route handlers
data_fetcher.py  → Live data fetch + authoritative dataset
models.py        → Pydantic response schemas
.env.example     → Environment variable template
requirements.txt → Python dependencies
```
