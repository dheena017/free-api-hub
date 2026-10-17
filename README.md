# Free API Hub (free-api-hub)

> The ultimate, verified "free-first" API search engine and playground for developers. Every listed API is guaranteed to work, free to use, and testable right in the browser.

---

## 🎯 Mission & Value Proposition

Most public API lists suffer from broken links, abandoned servers, and deceptive "free" pricing tiers that demand credit cards or expire in 7 days. Free API Hub solves these problems with three foundational pillars:

1. **Zero Wasted Time (Guaranteed Working)**: Automated background workers ping every listed endpoint daily. Unhealthy APIs are flagged or automatically delisted, ensuring developers only encounter active endpoints with transparent uptime percentages.
2. **Instant In-Browser Validation**: Developers can run real API requests with 1-click in an interactive playground, preview live JSON responses, inspect headers and roundtrip latency, and copy ready-made snippets.
3. **Radical Transparency on "Free"**: Strict classification into:
   - 🟢 **Completely Open**: No account, no API key required.
   - 🔵 **Free Forever with Rate Limits**: Generous permanent quota, no payment method required.
   - 🟣 **Freemium (Zero CC Required)**: Verified free tier without credit card entrapment.

---

## 🏗️ High-Level Architecture

The project is decoupled into an autonomous backend and a responsive developer-first frontend:

```text
free-api-hub/
├── docker-compose.yml              # Local container orchestration
├── backend/                        # FastAPI application & workers
│   ├── app/
│   │   ├── data/                   # Master JSON catalog of verified APIs
│   │   ├── routes/                 # REST endpoints (catalog, proxy, status, submissions)
│   │   └── workers/                # Automated health check engine
│   └── requirements.txt
└── frontend/                       # React + TypeScript + Vite + Tailwind CSS
    └── src/
        ├── api/                    # Backend API client
        ├── types/                  # Shared TypeScript contracts
        ├── pages/                  # 7 core routes (Home, Explore, Detail, Categories, etc.)
        ├── components/             # Reusable UI components & interactive playground
        └── utils/                  # Multi-language code snippet generator (cURL, JS, Python, Go)
```

---

## 🚀 Quickstart Guide

### Option 1: Using NPM Scripts (Easiest & Recommended)

Run services directly from the project root:

```bash
# Start BOTH backend and frontend concurrently in one command with dual colored logging:
npm run dev

# Or start individually:
npm run backend    # Starts FastAPI backend at http://localhost:8000
npm run frontend   # Starts React/Vite frontend at http://localhost:5173

# Run tests:
npm test           # Runs backend pytest suite
```

*(On Windows, you can also double-click `start-all.bat`, `start-backend.bat`, or `start-frontend.bat`)*

### 🎨 Real-Time Colored Dual Logging & In-Browser Console

#### 1. Interactive Terminal Console (`npm run dev`)
Logs from both services stream into your terminal with clean separation and distinct colors:
- 🟦 **`[BACKEND]` (Cyan / Blue)**: Startup, catalog loading, HTTP requests with colored methods/status codes, CORS proxy relays, and health check probes.
- 🟪 **`[FRONTEND]` (Magenta / Purple)**: Vite server lifecycle, client API traffic, playground execution, and latency metrics.
- 📁 **File Logging**: Automatically written to `logs/combined.log`, `logs/backend.log`, and `logs/frontend.log`.
- ⌨️ **Interactive Hotkeys**:
  - `b` -> Open Swagger Docs in browser (`http://localhost:8000/docs`)
  - `f` -> Open Frontend Web UI in browser (`http://localhost:5173`)
  - `c` -> Clear terminal screen
  - `q` -> Gracefully terminate services

#### 2. In-Browser Live Dev Logs Drawer
Visit `http://localhost:5173` and click the floating **`⚡ Live Logs`** pill in the bottom-right corner:
- Unified view of both Frontend and Backend logs in real-time.
- Filter by `Backend`, `Frontend`, `API Traffic`, or `Errors Only`.
- Real-time search filter and auto-scroll toggle.
- 1-Click JSON export / clipboard copy.
- Click any log to inspect its full payload and headers.

---

### Option 2: Docker Compose

Run both the backend and frontend in isolated containers:

```bash
docker-compose up --build
```

- **Frontend Application**: `http://localhost:5173`
- **Backend API & Docs**: `http://localhost:8000/docs`

---

### Option 3: Manual Step-by-Step

#### 1. Start the Backend (FastAPI)
```bash
cd backend
python -m venv venv

# Windows (PowerShell)
.\venv\Scripts\Activate.ps1
# Windows (CMD)
.\venv\Scripts\activate.bat
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

> **Direct start on Windows without activating shell:**
> ```powershell
> cd backend
> .\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
> ```

To run backend tests (make sure your working directory is `backend/`):
```powershell
pytest
# or: .\venv\Scripts\python.exe -m pytest tests/test_data_integrity.py
```


#### 2. Start the Frontend (Vite + React)
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` to explore the catalog and test endpoints live.

---

## 🗺️ Route Index

| Route | Page | Purpose |
| :--- | :--- | :--- |
| `/` | **Home / Discover** | Hero search with `Ctrl+K`, quick filters, trending APIs, live trust stats |
| `/explore` | **Full Directory** | Master directory with multi-facet sidebar and URL query sync |
| `/api/:slug` | **Detail & Playground** | Live request runner, JSON response inspector, multi-language snippets |
| `/category/:category` | **Category Hub** | SEO-targeted category landings (`/category/weather`, `/category/ai-ml`) |
| `/collections/:filter` | **Curated Collections** | Use-case views (`/collections/no-auth`, `/collections/cors-enabled`) |
| `/status` | **Live Health Dashboard** | Ecosystem health status, latency metrics, and audit table |
| `/submit` | **Submit an API** | Community submission form with live endpoint pre-validator |

---

## 📄 License

MIT License. Contributions and verified API submissions are always welcome!
