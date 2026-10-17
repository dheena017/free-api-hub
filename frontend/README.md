# Frontend Application: Free API Hub

High-performance, developer-first React application built with Vite, TypeScript, and Tailwind CSS. Provides instant fuzzy search, faceted exploration, an in-browser live API playground, and health telemetry.

---

## 🛠️ Getting Started

### 1. Install Node Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment Variables

Create `.env.local` if you need custom API URLs:

```env
VITE_API_BASE_URL=http://localhost:8000
```

### 3. Start Development Server

```bash
npm run dev
```

The Vite dev server starts at `http://localhost:5173`.

### 4. Build for Production

```bash
npm run build
```

Production static assets are emitted to `dist/`.

---

## 🎨 Tech Stack & Design System

- **Framework**: React 18+ with TypeScript
- **Bundler**: Vite
- **Styling**: Tailwind CSS with custom dark-developer palette
- **Routing**: `react-router-dom` v6
- **Icons**: Lucide React
- **Syntax Highlighting**: Prism.js / custom dark code viewer

---

## 📂 Source Code Structure

- [`src/`](./src/README.md) - Application source code.
  - [`src/api/`](./src/api/README.md) - API client and backend fetch wrappers.
  - [`src/types/`](./src/types/README.md) - TypeScript interfaces matching backend models.
  - [`src/pages/`](./src/pages/README.md) - 7 route pages (`HomePage`, `ExplorePage`, `ApiDetailPage`, etc.).
  - [`src/components/`](./src/components/README.md) - Reusable components (`Navbar`, `ApiCard`, `Playground`, etc.).
  - [`src/utils/`](./src/utils/README.md) - Code generators and pure utilities.
