# Core Application Orchestration: `backend/app`

This directory houses the core application code for the FastAPI microservice, including application lifecycle, configuration management, data validation schemas, and service logic.

---

## 🧩 Module Breakdown

| File | Purpose | Key Responsibilities |
| :--- | :--- | :--- |
| `main.py` | Application Entrypoint | Initializes FastAPI, mounts CORS middleware, registers routers, and sets up startup/shutdown hooks. |
| `config.py` | Configuration Settings | Pydantic `BaseSettings` object reading environment variables with typed defaults. |
| `models.py` | Data Contracts & Schemas | Pydantic models for API listings, proxy payloads, health logs, stats, and submissions. |
| `services.py` | Business Logic | Loading/parsing `apis.json`, filtering by category/pricing/auth, performing search fuzzy matching, and executing proxy requests. |

---

## 🔄 Data-Flow Architecture

1. **Client Request**: Frontend hits an endpoint (e.g. `GET /api/v1/apis?category=weather&search=forecast`).
2. **Routing Layer (`app/routes/`)**: Validates request parameters and delegates execution to `services.py`.
3. **Service Layer (`app/services.py`)**: 
   - Queries and filters the cached in-memory data store derived from `app/data/apis.json`.
   - Returns typed Pydantic models with computed pagination and statistics.
4. **Proxy Request**: 
   - A `POST /api/v1/proxy` request sends the target URL, method, headers, and params.
   - `services.py` uses `httpx.AsyncClient` with custom timeouts to call the target endpoint.
   - Headers are sanitized and response data with latency timing is returned to the client.

---

## 📁 Submodules

- [`data/`](./data/README.md): Master catalog store (`apis.json`).
- [`routes/`](./routes/README.md): HTTP endpoint route declarations.
- [`workers/`](./workers/README.md): Background ping jobs & uptime tracker.
