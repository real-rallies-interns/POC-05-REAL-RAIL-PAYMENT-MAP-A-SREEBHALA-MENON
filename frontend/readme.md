# Real Rails Intelligence Platform — Frontend

**PoC #05: Real-Time Payments Map**
Next.js 14 frontend for the Real Rails Intelligence Platform.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy and configure environment
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL to your FastAPI backend URL

# 3. Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

> **Note**: The backend must be running at `NEXT_PUBLIC_API_URL` for live data.
> Without the backend, the map will show an "API OFFLINE" indicator.

## Architecture

```
src/
  app/
    layout.tsx        → Root layout, fonts, metadata
    page.tsx          → Server component (SSR data fetch)
    globals.css       → Design tokens, Leaflet overrides
  components/
    Dashboard.tsx     → Main 2-column layout orchestrator
    TopBar.tsx        → Header with stats pills + download
    MapView.tsx       → Dynamic import wrapper (SSR-safe)
    MapInner.tsx      → Leaflet map with markers + legend
    Sidebar.tsx       → Full 30% intelligence sidebar
    TimelineBar.tsx   → Interactive launch timeline slider
  lib/
    api.ts            → API adapter + formatting utilities
  types/
    index.ts          → TypeScript interfaces
```

## DNA Compliance

| Requirement | Status |
|-------------|--------|
| Background #030712 | ✅ |
| Sidebar exactly 30% | ✅ |
| Filters update map without page refresh | ✅ |
| "Why This Matters" panel | ✅ |
| "Who Controls the Rail" panel | ✅ |
| Interactive world map (Leaflet) | ✅ |
| Country cards with scheme detail | ✅ |
| Adoption filters by maturity + region | ✅ |
| Timeline of launches (slider) | ✅ |
| ISO 20022 metadata drill-down | ✅ |
| Download sample data | ✅ |
| Zero hallucination (data labeled by source) | ✅ |
| No hardcoded API keys (.env.example) | ✅ |

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS** (custom Real Rails palette)
- **Leaflet + React-Leaflet** (geospatial map)
- **Recharts** (regional bar chart)
- **Lucide React** (icons)
