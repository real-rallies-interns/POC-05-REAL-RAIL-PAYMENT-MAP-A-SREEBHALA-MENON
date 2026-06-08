# POC-05-REAL-RAIL-PAYMENT-MAP-A-SREEBHALA-MENON
# Real Rails — Global RTP Intelligence Platform
### PoC #05 · Real-Time Payments Map

> A full-stack intelligence tool that maps the maturity and adoption of instant payment schemes (UPI, Pix, FedNow, SEPA Instant and 40+ more) across 44 countries — built for Policy Makers, FinTech Founders, and Global Business Allocators.

---

## What This Is

Most people assume "sending money" works the same everywhere. It doesn't. The world is fragmented between legacy next-day systems and modern real-time rails. This platform makes that gap visible.

Real Rails is a **Global Competitiveness Index** — an allocator can look at this tool and instantly identify which markets have the most efficient financial infrastructure for a new startup.

---

## Live Demo

| Service | URL |
|---|---|
| Frontend | `http://localhost:3000` |
| Backend API | `http://localhost:8000` |
| API Docs (Swagger) | `http://localhost:8000/docs` |

---

## Screenshots
<img width="1858" height="852" alt="image" src="https://github.com/user-attachments/assets/8e251f04-c138-4af6-9302-480b6b38dda7" />

**Relational Network Graph** — 44 RTP scheme nodes connected by interoperability edges, clustered by region, colour-coded by maturity tier.

**Sidebar Intelligence** — Click any node to see:
- Country Intelligence (GDP, financial inclusion %, RTP maturity score)
- Live Transaction Feed (last 6 synthetic transactions for that scheme)
- Interop Links (active cross-border connections with daily volume)

---

## Project Structure

```
real-rail-payment-map/
├── real-rails-backend/          # FastAPI backend
│   ├── main.py                  # API routes
│   ├── data_fetcher.py          # Live World Bank + BIS data
│   ├── models.py                # Pydantic schemas
│   ├── requirements.txt         # Python dependencies
│   ├── .env.example             # Environment template
│   └── data/                   # Synthetic mock data
│       ├── rtp_transaction_synthetic.json
│       ├── rtp_country_synthetic.json
│       └── rtp_interoplink_synthetic.json
│
└── real-rails-frontend/         # Next.js frontend
    ├── src/
    │   ├── app/                 # Next.js App Router
    │   ├── components/
    │   │   ├── Dashboard.tsx    # Main 70/30 layout
    │   │   ├── RelationalStage.tsx  # D3 network graph
    │   │   ├── Sidebar.tsx      # Intelligence panel
    │   │   ├── TimelineBar.tsx  # Launch timeline slider
    │   │   └── TopBar.tsx       # Header + stats
    │   ├── lib/
    │   │   └── api.ts           # API adapter
    │   └── types/
    │       └── index.ts         # TypeScript interfaces
    ├── package.json
    └── .env.example
```

---

## Tech Stack

### Frontend
| Tool | Purpose |
|---|---|
| Next.js 14 (App Router) | React framework |
| TypeScript | Type safety |
| Tailwind CSS | Styling (Obsidian dark theme) |
| D3.js v7 | Force-directed relational graph |
| Recharts | Regional bar chart |
| Lucide React | Icons |

### Backend
| Tool | Purpose |
|---|---|
| FastAPI | API framework |
| Python 3.11+ | Runtime |
| Pandas | Data processing |
| GeoPandas | Geographic data |
| httpx | Live World Bank API calls |
| Pydantic | Request/response validation |

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/real-rails-poc05.git
cd real-rails-poc05
```

### 2. Start the Backend
```bash
cd real-rails-backend

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env

# Run
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Verify at: `http://localhost:8000/docs`

### 3. Start the Frontend
```bash
cd real-rails-frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000

# Run
npm run dev
```

Open: `http://localhost:3000`

> The top-right corner shows **API LIVE** (cyan) when both services are connected.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/schemes` | All 44 RTP schemes (filterable) |
| GET | `/api/schemes/{country_code}` | Single country scheme detail |
| GET | `/api/stats` | Global aggregated statistics |
| GET | `/api/geojson` | GeoJSON for map rendering |
| GET | `/api/transactions` | Synthetic transaction feed |
| GET | `/api/transactions/stats` | Aggregated tx stats per scheme |
| GET | `/api/interop` | Cross-border interop links |
| GET | `/api/countries` | Country economic + RTP data |
| GET | `/api/download` | Export all schemes as CSV |

### Query Parameters

**`/api/schemes`**
- `maturity` — `Pioneer` | `Growing` | `Emerging`
- `region` — `Asia-Pacific` | `Europe` | `Latin America` | `Africa` | `North America` | `Middle East`
- `year_from` / `year_to` — launch year range

**`/api/transactions`**
- `scheme` — e.g. `UPI`, `Pix`, `FedNow`
- `country` — ISO 3166-1 alpha-2 e.g. `IN`, `BR`, `US`
- `status` — `COMPLETED` | `FAILED` | `PENDING` | `REVERSED` | `TIMED_OUT`
- `limit` — max rows (default 20, max 200)

**`/api/interop`**
- `status` — `Live` | `Pilot` | `Planned`
- `scheme` — scheme name (matches either side of the link)

---

## Data Sources

### Live Data (fetched on startup)
- **World Bank WDI API** — Financial inclusion indicator `FX.OWN.TOTL.ZS`

### Authoritative Curated Dataset
- **BIS CPMI Red Book** — Payment system statistics
- **Central bank publications** — RBI, BCB, Federal Reserve, EPC, NPCI
- **ISO 20022 Registry** — Messaging standards
- **SWIFT** — Cross-border settlement data

### Synthetic Mock Data (`/data` folder)
All synthetic records carry `"data_classification": "SYNTHETIC_TEST_DATA"` and `"do_not_use_in_prod": true` on every row.

| File | Records | Purpose |
|---|---|---|
| `rtp_transaction_synthetic.json` | 200 | Transaction feed in sidebar |
| `rtp_country_synthetic.json` | 200 | Country intelligence panel |
| `rtp_interoplink_synthetic.json` | 200 | Interop links panel |

---

## Features

### Phase 1 — The Map (Baseline)
- ✅ Interactive relational network graph (D3 force simulation)
- ✅ 44 RTP scheme nodes across 6 regions
- ✅ Colour-coded by maturity: Pioneer (cyan) · Growing (indigo) · Emerging (green)
- ✅ Country cards with scheme metadata on click
- ✅ "Why This Matters" panel
- ✅ "Who Controls the Rail" panel

### Phase 2 — Intelligence Layer
- ✅ Adoption filters by maturity and region
- ✅ Launch Timeline slider (2004–2023)
- ✅ Live transaction feed per scheme
- ✅ Country economic intelligence (GDP, financial inclusion, RTP maturity score)
- ✅ Cross-border interop link visualization with daily volume
- ✅ ISO 20022 metadata per scheme
- ✅ Export dataset as CSV

### Architecture Archetype
**Group 2: Relational** — D3.js force-directed network graph showing how money/data hops between RTP schemes, regions, and operators. Nodes = schemes, edges = interoperability links.

---

## Design System

| Token | Value |
|---|---|
| Background | `#030712` (Obsidian) |
| Surface | `#0B1117` |
| Border | `#1F2937` |
| Accent Cyan | `#38BDF8` (Pioneer) |
| Accent Indigo | `#818CF8` (Growing) |
| Accent Green | `#34D399` (Emerging) |
| Layout | 70% graph stage / 30% intelligence sidebar |

---

## Zero Hallucination Policy

Every data record cites its institutional source. Countries without a confirmed public scheme listing are labeled `"Status Unknown"` — never fabricated. Synthetic data is clearly labeled on every record.

---

## Target Audience

- **Policy Makers** — Compare national rail maturity and interoperability readiness
- **FinTech Founders** — Identify which markets have infrastructure to support instant payment products
- **Global Business Allocators** — Assess financial infrastructure competitiveness before market entry

---

## Part of the Real Rails Intelligence Library

This is PoC #05 in a series of 30 financial infrastructure intelligence tools. Each PoC follows the Obsidian DNA (dark theme, 70/30 layout) and one of three map archetypes: Geographic, Relational, or Temporal.
