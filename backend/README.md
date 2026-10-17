# Backend Service: Free API Hub

FastAPI-powered backend handling the verified API catalog, CORS-safe proxy forwarding, live health monitoring workers, and community submission pre-validation.

---

## 📋 Responsibilities

1. **Master Catalog Serving**: Provides filtered, sorted, and paginated public API metadata.
2. **CORS Relay Proxy**: Safely proxies client requests from the browser to third-party APIs with timeout controls and sanitized headers.
3. **Automated Health Monitoring**: Background pinger checking HTTP response codes, measuring roundtrip latency, and computing rolling 30-day uptime.
4. **Community Submissions**: Validates proposed endpoints live before accepting submissions to avoid spam and dead links.

---

## 🛠️ Environment Setup & Run Guide

### 1. Initialize Virtual Environment

```bash
# From the backend directory
python -m venv venv

# Activate venv on Windows (PowerShell)
.\venv\Scripts\Activate.ps1
# or Windows (CMD)
.\venv\Scripts\activate.bat
# or macOS / Linux
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Run Development Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

> **Quick run without activating shell (Windows PowerShell):**
> ```powershell
> .\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
> ```

Interactive OpenAPI Swagger UI is available at: `http://localhost:8000/docs`

### 4. Run Tests & Data Validation

Always execute tests from the `backend/` directory so `pytest.ini` automatically configures `pythonpath = .` and prevents `ModuleNotFoundError: No module named 'app'`:

```bash
# Run all tests
pytest

# Or run with the virtualenv Python explicitly:
.\venv\Scripts\python.exe -m pytest

# Run specific test suite (e.g., data integrity)
pytest tests/test_data_integrity.py

# Run only offline unit tests
pytest -m offline
```

---

## ⚙️ Environment Variables

Configure these settings via a `.env` file in `backend/` or your deployment platform:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `8000` | Port for the Uvicorn server |
| `HOST` | `0.0.0.0` | Host binding interface |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Comma-separated list of allowed CORS origins |
| `PROXY_TIMEOUT_SECONDS` | `10` | Maximum wait time for proxied 3rd party requests |
| `HEALTH_CHECK_INTERVAL_HOURS` | `24` | Automated worker check frequency |

---

## 📂 Directory Layout

- [`app/`](./app/README.md) - Core application package containing configuration, models, and business logic.
  - [`app/data/`](./app/data/README.md) - JSON data storage for the API catalog.
  - [`app/routes/`](./app/routes/README.md) - API routing layers (`apis`, `proxy`, `health`, `submissions`).
  - [`app/workers/`](./app/workers/README.md) - Automated health-checking bots and ping workers.
