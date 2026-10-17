# Data Storage & Dynamic Catalog: `backend/app/data`

This directory acts as the single source of truth for the verified API catalog (`apis.json`).

---

## 📄 Schema Definition (`apis.json`)

Each API item in the JSON array must follow this schema:

```json
{
  "id": "open-meteo",
  "name": "Open-Meteo Weather API",
  "slug": "open-meteo",
  "description": "Free open-source weather API providing hourly and 7-day weather forecasts without requiring an API key.",
  "category": "weather",
  "base_url": "https://api.open-meteo.com",
  "sample_endpoint": "/v1/forecast?latitude=52.52&longitude=13.41&current_weather=true",
  "method": "GET",
  "auth_type": "none",
  "pricing_tier": "open",
  "cors_supported": true,
  "https": true,
  "documentation_url": "https://open-meteo.com/en/docs",
  "tags": ["weather", "forecast", "climate", "open-data"],
  "health": {
    "status": "healthy",
    "uptime_percent": 99.9,
    "avg_latency_ms": 115,
    "last_checked": "2026-10-17T12:00:00Z",
    "last_status_code": 200
  },
  "default_params": {
    "latitude": "52.52",
    "longitude": "13.41",
    "current_weather": "true"
  },
  "default_headers": {}
}
```

### Supported Field Enumerations

- **`auth_type`**:
  - `"none"`: Completely open, no authentication required.
  - `"api_key"`: Free API key required (no billing info).
  - `"oauth"`: Free OAuth application credentials.
- **`pricing_tier`**:
  - `"open"`: 100% free with no limits or purely open source.
  - `"free_forever"`: Permanent free tier with rate limits.
  - `"freemium_no_cc"`: Free tier without credit card requirement.
- **`health.status`**:
  - `"healthy"`: Operational (`2xx` response, fast latency).
  - `"degraded"`: Intermittent failures, high latency, or `4xx` responses.
  - `"offline"`: Failed consecutive probes, unreachable.

---

## ➕ How to Add a New API to the Catalog

To contribute or add an API without writing any backend code:

1. Open `backend/app/data/apis.json`.
2. Append a new object following the schema above to the root JSON array.
3. Verify that:
   - `sample_endpoint` returns `200 OK` on a standard HTTP `GET`.
   - `pricing_tier` does **not** demand credit card entry.
   - `slug` is URL-safe and unique (e.g. `pokeapi`, `coingecko-free`).
4. Run the health checker worker to test and populate the initial health metrics:
   ```bash
   python -m app.workers.health_checker
   ```
