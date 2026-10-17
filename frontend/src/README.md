# Frontend Source Code: `frontend/src`

This directory contains the root React components, styling systems, client routing, and sub-packages.

---

## 🏛️ Application Architecture

- **`main.tsx`**: Application entrypoint rendering `App` into the DOM with React strict mode.
- **`App.tsx`**: Declares client-side routes via `react-router-dom` across all 7 views.
- **`index.css`**: Tailwind directives and custom dark developer design tokens (glassmorphic cards, gradient accents, glowing health indicators).

---

## 🎨 Design System Conventions

1. **Color Palette**:
   - Dark Background: `#0B0F17` (Deep Obsidian)
   - Surface / Card: `#131B2A` (Charcoal Slate)
   - Border: `#1F293D` (Subtle divider)
   - Primary Accent: `#38BDF8` (Sky Cyan)
   - Success / Healthy: `#10B981` (Emerald Green)
   - Degraded / Warning: `#F59E0B` (Amber)
   - Error / Offline: `#EF4444` (Crimson)
2. **Typography**:
   - UI & Body: Inter / System Sans-serif
   - Code & Monospace: Fira Code / JetBrains Mono
3. **Accessibility**:
   - Full keyboard navigation support (e.g. `Ctrl+K` search modal).
   - High-contrast text labels on all badges.

---

## 📂 Subdirectories

- [`api/`](./api/README.md): Client-side HTTP services communicating with the backend.
- [`types/`](./types/README.md): TypeScript type definitions & data contracts.
- [`pages/`](./pages/README.md): Route view components (7 core views + 404).
- [`components/`](./components/README.md): Reusable UI feature blocks.
- [`utils/`](./utils/README.md): Snippet generators and formatting helpers.
