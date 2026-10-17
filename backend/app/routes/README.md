# API Routes & Request Handlers: `backend/app/routes`

This directory contains the REST API route modules for serving the catalog, proxying live calls, reporting status metrics, and processing community submissions.

---

## 🚏 Endpoint Inventory

### 1. Catalog Routes (`apis.py`)
- **`GET /api/v1/apis`**:
  - **Query Params**:
    - `q` (string, optional): Search query for name, description, or tags.
    - `category` (string, optional): Filter by category (e.g. `weather`, `finance`).
    - `auth_type` (string, optional): Filter by `none`, `api_key`, `oauth`.
    - `pricing_tier` (string, optional): Filter by `open`, `free_forever`, `freemium_no_cc`.
    - `collection` (string, optional): Filter by preset collection (`no-auth`, `cors-enabled`, `mock-data`).
    - `sort` (string, optional): `popular`, `latency`, `uptime`, `alphabetical`.
    - `limit` & `offset` (int, optional): Pagination controls.
- **`GET /api/v1/apis/{slug}`**:
  - Retrieves full specification and playground defaults for a single API by slug.
- **`GET /api/v1/categories`**:
  - Returns list of all categories with active API counts.
- **`GET /api/v1/stats`**:
  - Returns aggregate platform metrics (total APIs, average latency, 24h ping count, overall health %).

### 2. CORS Proxy Relay (`proxy.py`)
- **`POST /api/v1/proxy`**:
  - **Request Body**:
    ```json
    {
      "url": "https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current_weather=true",
      "method": "GET",
      "headers": {},
      "params": {}
    }
    ```
  - **Response**:
    ```json
    {
      "status_code": 200,
      "latency_ms": 118,
      "headers": { "content-type": "application/json" },
      "data": { ... }
    }
    ```
  - **Safeguards**: Restricts internal IP ranges, enforces a 10s timeout, limits response payload size.

### 3. Health & Status Routes (`health.py`)
- **`GET /api/v1/health`**: Service liveness and readiness probe for orchestration.
- **`GET /api/v1/status`**: Detailed health logs and uptime audit records for `/status` dashboard.

### 4. Community Submissions (`submissions.py`)
- **`POST /api/v1/submit/validate`**: Pings a proposed sample endpoint live and returns validation results.
- **`POST /api/v1/submit`**: Saves a verified candidate API into the staging review queue.
