# Background Automation & Health Checkers: `backend/app/workers`

This directory houses background processes that verify third-party APIs, monitor response times, and calculate uptime percentages.

---

## 🤖 Health Checker Engine (`health_checker.py`)

The health checker guarantees the core promise of Free API Hub: **Zero Wasted Time**.

### Health Evaluation Criteria

For each listed API in `backend/app/data/apis.json`:

1. **Probe Execution**:
   - Sends a non-intrusive `GET` or `HEAD` request to `base_url + sample_endpoint`.
   - Records HTTP status code, roundtrip duration (`latency_ms`), and timestamp.
2. **Classification Logic**:
   - `2xx OK`: Marked as **`healthy`** 🟢.
   - `4xx Client Error` or latency $> 2000ms$: Marked as **`degraded`** 🟡.
   - `5xx Server Error`, DNS failure, or connection timeout: Marked as **`offline`** 🔴.
3. **Uptime Calculation**:
   - Updates the rolling 30-day uptime percentage:
     $$\text{Uptime \%} = \frac{\text{Successful Probes}}{\text{Total Probes in Window}} \times 100$$
4. **Auto-Deprecation**:
   - APIs that remain `offline` for 7 consecutive days are flagged as `deprecated` and hidden from public search until re-verified.

---

## ⏱️ Execution & Scheduling

### Manual Run

Run a single check across the entire catalog:

```bash
cd backend
python -m app.workers.health_checker
```

### Scheduled Daemon Run

Run continuously on an automated loop (e.g. every 24 hours):

```bash
python -m app.workers.health_checker --loop --interval 86400
```

### Production Cron Integration

In production or Docker environments, a crontab entry can be configured:

```cron
0 2 * * * /app/venv/bin/python -m app.workers.health_checker >> /var/log/health_checker.log 2>&1
```
