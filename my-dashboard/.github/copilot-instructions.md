<!-- Copilot / AI agent guidance for this repo -->
# Copilot instructions — my-dashboard

Purpose: provide concise, actionable guidance for AI coding agents working in this repository.

1) Big picture
- Frontend-only React app scaffolded with Vite. Entry is [index.html](index.html#L1) -> [src/main.jsx](src/main.jsx#L1).
- UI is composed of small, presentational components under `src/` (notably `StatCard` and `DashboardTopRow`). These are intentionally simple, stateless, and use Tailwind utility classes.
- Tooling: Vite dev server (`npm run dev`), `vite build`, and `vite preview` are the canonical workflows.

2) Where to look first (quick-start files)
- Project README: [README.md](README.md#L1)
- Scripts & deps: [package.json](package.json#L1)
- Vite config: [vite.config.js](vite.config.js#L1)
- ESLint config: [eslint.config.js](eslint.config.js#L1)
- UI entry & root: [src/main.jsx](src/main.jsx#L1) and [src/App.jsx](src/App.jsx#L1)
- Example components: [src/componets/StatCard.jsx](src/componets/StatCard.jsx#L1) and [src/componets/DashboardTopRow.jsx](src/componets/DashboardTopRow.jsx#L1)

3) Project-specific conventions and gotchas
- Directory name typo: component sources live in `src/componets/` (misspelled). `src/App.jsx` imports `./components/DashboardTopRow`; on Windows this may still resolve, but cross-platform builds and CI expect paths to match exact names. Prefer normalizing to `components/`. Search for `componet`/`componets` when editing components.
- Simple presentational style: components favor inline SVG icons and Tailwind classes rather than separate icon or CSS modules.
- Trend semantics: `StatCard` treats `trendDirection==='up'` as bad (red) and `down` as good (green) — domain-specific meaning for help-desk metrics. Keep this when adding new metrics or visualizations.

4) Tooling & developer workflows
- Run development server with:

```bash
npm run dev
```

- Build and preview:

```bash
npm run build
npm run preview
```

- Linting:

```bash
npm run lint
```

- Vite is configured in [vite.config.js](vite.config.js#L1) and React plugin is used. Use `console` logs and Vite HMR for quick debugging.

5) ESLint / code style
- See [eslint.config.js](eslint.config.js#L1). Note rule: `no-unused-vars` ignores identifiers matching `^[A-Z_]` (useful for React components or intentionally-prefixed globals).

6) Integration points & dependencies to watch
- `recharts` is installed but not yet used in the shown components — expect charts to be added to `src/` for dashboards.
- `tailwindcss` is present; however, Tailwind setup files (config/postcss) are not obvious in the repo snapshot. If Tailwind styles are missing, check for missing `tailwind.config.js` or PostCSS setup.

7) Typical edits an AI agent will perform here
- Add or update presentational components in `src/componets/` (or rename folder to `components/` and update imports in `src/App.jsx` and `src/main.jsx`).
- When adding metrics, follow `StatCard` props: `title`, `count`, optional `trendValue`, and `trendDirection`.
- Prefer inline SVG icons for small visual indicators to avoid adding new icon libs.

8) Safety & verification steps before committing
- Run `npm run dev` to confirm Vite starts and HMR applies.
- Run `npm run lint` and fix any errors respecting `eslint.config.js` rules.
- On rename of `componets` → `components`, update all imports and run dev build to ensure cross-platform compatibility.

If anything in this file is unclear or you want more examples (e.g., common PR changes, sample unit-test layout, or how to add Recharts), tell me which section to expand.
