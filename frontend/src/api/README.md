# Backend Communication Layer: `frontend/src/api`

This directory provides the typed API client for communicating with the FastAPI backend service.

---

## 🔌 API Client (`client.ts`)

Encapsulates all REST calls to the backend using native `fetch` or `axios` with unified error handling and environment fallback.

### Exposed Methods

- **`fetchApis(params?: ApiQueryParams): Promise<ApiResponse>`**
  Queries the catalog with support for fuzzy search, category filter, pricing tier, auth requirements, and sorting.
- **`fetchApiBySlug(slug: string): Promise<ApiItem>`**
  Fetches full metadata and playground defaults for a specific API.
- **`fetchCategories(): Promise<CategorySummary[]>`**
  Fetches all category summaries with API counts.
- **`fetchStats(): Promise<CatalogStats>`**
  Retrieves global metrics (total APIs, uptime %, total health checks).
- **`executeProxy(request: ProxyRequest): Promise<ProxyResponse>`**
  Sends an API call through the backend proxy relay to bypass browser CORS restrictions.
- **`validateEndpoint(payload: ValidationRequest): Promise<ValidationResult>`**
  Pre-tests a user-submitted endpoint live.
- **`submitApi(payload: SubmissionPayload): Promise<SubmissionResponse>`**
  Submits a verified API candidate to the backend review queue.

---

## 🛡️ Error Handling & Fallbacks

- Automatically intercepts non-2xx responses and formats human-readable error messages.
- Handles network disconnections gracefully, providing offline banners if the backend is unreachable.
- Uses `import.meta.env.VITE_API_BASE_URL` with a default of `http://localhost:8000`.
