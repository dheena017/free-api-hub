# Modular UI & Feature Blocks: `frontend/src/components`

This directory houses all reusable UI components, layout structures, and complex feature blocks.

---

## 🧩 Component Inventory

### Layout & Navigation
- **`Navbar.tsx`**: Header with brand logo, quick navigation links (Explore, Collections, Status, Submit), global search trigger, and GitHub repository link.
- **`Footer.tsx`**: Site footer with category links, legal/privacy notes, and open-source credits.

### Catalog & Discovery
- **`ApiCard.tsx`**:
  - Displays API title, short description, category tag, and pricing badge.
  - Features real-time health indicator (🟢 99.9% / 🟡 Degraded) and average latency badge.
  - Includes a quick **"Test Live"** button navigating directly to the playground.
- **`SearchFilter.tsx`**:
  - Global search bar with debounced input, keyboard shortcut (`Ctrl+K`), and quick-tag pills.
- **`SidebarFilters.tsx`**:
  - Multi-faceted filter panel for `ExplorePage.tsx` supporting Category, Auth Type, Pricing Tier, and Latency slider.
- **`LivePingBadge.tsx`**:
  - Micro-component rendering animated status rings (pulsing green for operational, amber for degraded).

### Testing & Verification
- **`Playground.tsx`**:
  - **URL & Method Display**: Shows HTTP verb (`GET`, `POST`) and editable URL/query path.
  - **Parameter Editor**: Key-value query parameter builder.
  - **Execute Button**: Dispatches proxy request and shows loading state.
  - **JSON Response Inspector**: Formatted, collapsible JSON tree with copy button.
  - **Telemetry Bar**: Displays HTTP status code (`200 OK`), payload size, and roundtrip latency timer (`115 ms`).

---

## 🎨 Component Design Guidelines

- **Props Interface**: Every component exports a strictly typed TypeScript interface for its props.
- **Aesthetics**: Adheres to modern developer tools aesthetics (clean dark mode, rounded borders, subtle gradient highlights on hover, high-contrast badges).
