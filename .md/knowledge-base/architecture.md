# Miko — Architecture

## Process Model

Miko is a client-only single-page app — there is no server, no IPC, and no separate processes. Everything runs in one browser tab.

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (Vite dev server in dev / static bundle in prod)   │
│                                                               │
│  main.jsx  — React root, mounts <App /> in StrictMode        │
│  │                                                            │
│  └── App.jsx                                                  │
│        ├── useStore()        — single hook owning all state  │
│        ├── tab navigation (Ingredients / Recipes / Tonight's  │
│        │    pick), plain useState, no router                 │
│        └── active tab renders one of:                        │
│              ├── Ingredients.jsx                              │
│              ├── Recipes.jsx                                  │
│              └── Suggest.jsx                                  │
│                    └── MatchBar.jsx (shared, stateless)       │
└─────────────────────────────────────────────────────────────┘
```

## State Ownership

All application state — ingredients, recipes, and the matching logic — lives in a single hook, `useStore()` (`src/useStore.js`). `App.jsx` calls it once and passes down the specific fields/functions each tab needs as props. There is no context, no global store library (Redux/Zustand/etc.), and no prop-drilling beyond one level (App → tab component → card component).

- `ingredients` — array of `{ name, checked }`. `checked` means "currently in stock."
- `recipes` — array of `{ id, name, ings }`, where `ings` is `[{ name, essential }]`.
- Mutators (`addIngredient`, `removeIngredient`, `toggleIngredient`, `addRecipe`, `removeRecipe`, `updateRecipeIngs`) all use functional `setState` updates and return early on invalid input (e.g. empty/duplicate names) rather than throwing.
- Derived data (`getMatch`, `getSortedRecipes`) is computed on every call from the current `ingredients`/`recipes` state — nothing is cached or memoized, which is fine at this data scale (tens of items).

State does not persist across reloads. There is no localStorage, IndexedDB, or backend call anywhere in the app — refreshing the page resets everything to the hard-coded `DEFAULT_INGREDIENTS` / `DEFAULT_RECIPES` seed data.

## Matching Algorithm

`getMatch(recipe)` in `useStore.js`:

1. Takes the names of all currently-checked ingredients.
2. Splits the recipe's ingredient list into `have` (checked) and `missing` (unchecked).
3. Sets `unmakable = true` if any ingredient with `essential: true` is not checked — this is independent of the percentage.
4. Computes `pct = round(have.length / ings.length * 100)`.

`getSortedRecipes(skipSet)` filters out skipped recipe ids and unmakable recipes, then sorts the remainder descending by `pct`. `Suggest.jsx` maintains the skip set as local component state (`useState(new Set())`) — skipping is a per-session UI action, not persisted store state, and resets whenever the tab unmounts/remounts or the user clicks "start over."

`matchClass(pct)` (`MatchBar.jsx`) buckets a percentage into `full` (100), `partial` (≥50), or `low` (<50) for consistent color-coding across Recipes cards, Suggest's top pick, and Suggest's runner-up list.

## Component Responsibilities

- **App.jsx** — owns the active-tab state and renders the tab bar (`role="tablist"`); no business logic.
- **Ingredients.jsx** — local `input` state for the add-ingredient text field; renders the checklist and delegates all mutations to store functions passed as props.
- **Recipes.jsx** — splits recipes into makable/unmakable sections using `getMatch`; contains two sub-components defined in the same file:
  - `RecipeCard` — display + inline "edit essential ingredients" mode (local `editing` boolean state).
  - `AddRecipeForm` — local form state for building a new recipe's ingredient list before submitting via `onSave`.
- **Suggest.jsx** — owns the `skipped` id set; renders the top pick plus up to 3 runner-ups from `getSortedRecipes`.
- **MatchBar.jsx** — stateless, exports both the `MatchBar` component and the `matchClass()` helper used by both Recipes and Suggest.

## Styling

Every component has a co-located CSS Module (`Component.module.css`) imported as `styles` and referenced via `styles.className` — there is no global component CSS beyond `index.css`, which defines CSS custom properties for light/dark theming (no JS-based theme toggle exists; it likely follows `prefers-color-scheme` via `index.css`).

## Build Pipeline

```
vite.config.js — defineConfig({ plugins: [react()] })
src/main.jsx  → entry, mounts React root
                (Vite dev server serves this directly in dev; `vite build` bundles it for prod)
```

- `npm run dev` — Vite dev server with HMR, served at http://localhost:5173
- `npm run build` — production bundle to `dist/`
- `npm run preview` — serves the `dist/` build locally for a final check

No test runner, linter, or type checker is configured (plain JS, no `tsconfig.json`).
