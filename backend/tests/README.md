# Testing Strategy: Free API Hub

This directory contains test suites designed for **two completely distinct purposes**:

```text
                          WHY WE NEED TESTS
                                  │
         ┌────────────────────────┴────────────────────────┐
         ▼                                                 ▼
1. Data Integrity Tests                          2. Live Uptime Tests
   (Ran when adding new APIs)                       (Runs daily on schedule)
   "Is the data written correctly?"                 "Is the API actually alive?"
```

---

## 🧪 Purpose 1: Data Integrity Tests (`test_data_integrity.py`)

* **Question Answered**: *"Did someone make a typo, omit a required field, or corrupt `apis.json`?"*
* **When It Runs**: 
  - Offline in **< 1 second**.
  - Every time `backend/app/data/apis.json` is modified.
  - In CI/CD pull request checks before merging contributions.
* **What It Validates**:
  1. **No Duplicates**: Guarantees unique `id`, `slug`, `name`, and base endpoints across the entire directory.
  2. **Valid URLs**: Ensures every `base_url` starts with `http://` or `https://` and has a valid hostname.
  3. **No Missing Fields**: Ensures every API item has all mandatory keys (`name`, `category`, `base_url`, `endpoint`, `auth_type`, `pricing_tier`, `description`) so the React frontend never encounters `undefined` crashes.
  4. **Strict Enums**: Ensures `auth_type` is strictly `"none"`, `"api_key"`, or `"oauth"`, and `pricing_tier` is `"open"`, `"free_forever"`, or `"freemium_no_cc"`.

### Command to Run Data Integrity Tests:

```bash
# From the backend directory (runs in < 1 second offline)
pytest -m "not live"
```

---

## 🌐 Purpose 2: Live Uptime & Health Tests (`test_live_uptime.py`)

* **Question Answered**: *"Is this third-party API actually working right now, or is it dead?"*
* **When It Runs**:
  - Automatically once or twice a day via scheduled GitHub Action, cron job, or the background health checker worker.
* **What It Validates**:
  1. **Real HTTP Requests**: Sends real asynchronous HTTP calls to sample paths using `httpx`.
  2. **Status Codes**: Asserts that endpoints respond with `200 OK` (flags `404 Not Found` or `500 Server Error`).
  3. **Latency Benchmarks**: Measures roundtrip response duration in milliseconds and flags degraded endpoints ($> 3000ms$).
  4. **Anti-Bot / Cloudflare Detection**: Detects if endpoints block automated requests with `403 Forbidden` or challenge walls.

### Command to Run Live Uptime Tests:

```bash
# From the backend directory
pytest -m "live"
```

---

## 🚫 What You Do NOT Need to Test

* **No third-party business logic testing**: We test that the API is reachable and validly formatted, not whether weather predictions or cryptocurrency rates are economically accurate.
* **No Markdown table spacing tests**: All data is stored in strictly validated structured JSON (`apis.json`), parsed by Pydantic and TypeScript models.
