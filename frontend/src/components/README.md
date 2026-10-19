# Modular UI & Feature Blocks: `frontend/src/components`

This directory houses all reusable UI components, organized into clear, domain-driven feature directories.

---

## 📁 Directory Structure

```
frontend/src/components/
├── layout/           # Global application layout shell
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   ├── AppSidebar.tsx
│   ├── Logo.tsx
│   └── index.ts
├── ui/               # Reusable UI primitives, controls, and feedback
│   ├── CustomSelect.tsx
│   ├── CurlImportModal.tsx
│   ├── SearchFilter.tsx
│   ├── SidebarFilters.tsx
│   ├── SkeletonCard.tsx
│   ├── LivePingBadge.tsx
│   └── index.ts
├── viewers/          # Rich payload, code, and response inspectors
│   ├── CodeSnippetViewer.tsx
│   ├── JsonTreeViewer.tsx
│   ├── HtmlPreviewViewer.tsx
│   ├── MediaPreviewViewer.tsx
│   └── index.ts
├── playground/       # Interactive HTTP test console & workbench
│   ├── Playground.tsx
│   ├── RequestHistoryBar.tsx
│   ├── tabs/
│   │   ├── ParamsTab.tsx
│   │   ├── HeadersTab.tsx
│   │   ├── BodyTab.tsx
│   │   ├── AuthTab.tsx
│   │   ├── SettingsTab.tsx
│   │   ├── CodeSnippetsTab.tsx
│   │   ├── ResponseInspector.tsx
│   │   ├── PlaygroundTabsNav.tsx
│   │   └── index.ts
│   └── index.ts
├── api-detail/       # API detail page tabs, docs, and cards
│   ├── ApiCard.tsx
│   ├── ApiDocumentationView.tsx
│   ├── ApiDetailTabsNav.tsx
│   ├── PlaygroundTab.tsx
│   ├── EndpointsDocsTab.tsx
│   ├── HealthTelemetryTab.tsx
│   ├── ArchitectureSdkTab.tsx
│   └── index.ts
└── index.ts          # Central barrel re-exporting all modules
```

---

## 🎨 Component Design Guidelines

- **Props Interface**: Every component exports a strictly typed TypeScript interface for its props.
- **Barrel Exports**: Every feature folder exports a clean `index.ts` barrel. A root `index.ts` re-exports all modules.
- **Aesthetics**: Adheres to modern developer tools aesthetics (clean dark mode, rounded borders, subtle gradient highlights on hover, high-contrast badges).
