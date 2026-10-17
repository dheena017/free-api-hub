# Route Views & Screens: `frontend/src/pages`

This directory contains the primary route views corresponding to the platform's 7 core routes plus the 404 handler.

---

## 🗺️ Route-to-Page Mappings

| Route | Component | Responsibilities & UI Features |
| :--- | :--- | :--- |
| `/` | `HomePage.tsx` | Hero section, keyboard-activated search (`Ctrl+K`), quick filter pills, live trust stats, trending APIs. |
| `/explore` | `ExplorePage.tsx` | Master catalog with left sticky sidebar filters (Category, Auth, Pricing, Latency, CORS), sorting dropdown, and URL search query parameter synchronization. |
| `/api/:slug` | `ApiDetailPage.tsx` | Dedicated API documentation & in-browser interactive playground. Left column has request parameters and live tester; right column has multi-language code snippets; bottom has alternatives. |
| `/category/:category` | `CategoryPage.tsx` | SEO landing pages for specific categories (`/category/weather`, `/category/ai-ml`, etc.) with targeted titles and descriptions. |
| `/collections/:filter` | `CollectionPage.tsx` | Curated editorial collections (`/collections/no-auth`, `/collections/cors-enabled`, `/collections/mock-data`) with tips and best practices. |
| `/status` | `StatusPage.tsx` | Real-time health dashboard showing global catalog operational %, recent ping table, status badges, and degraded alerts. |
| `/submit` | `SubmitPage.tsx` | Community submission form with integrated **live ping validator** that ensures `200 OK` before submission. |
| `*` | `NotFoundPage.tsx` | Friendly 404 page with quick navigation back to home or explore. |

---

## 🔄 State & Navigation Guidelines

- Search and filter states on `ExplorePage` synchronize two-way with the browser's URL query string via `useSearchParams()`.
- Route transitions preserve scroll state at the top of pages.
- Navigation links between pages use React Router's `<Link>` component for instant client-side transitions.
