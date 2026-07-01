# Miko

> What should I cook tonight?

Miko cuts out the deliberation by matching your current ingredients against your recipes and surfacing the best option.

Data (ingredients, categories, recipes) is stored in a Postgres database (Vercel/Neon) via serverless API routes — there is no client-only mode anymore.

## Getting started

```bash
npm install
vercel link          # one-time: links this folder to the Vercel project
vercel env pull .env.local
npm run db:init       # one-time: creates tables and seeds default data if empty
npm run dev:vercel
```

Then open http://localhost:3000

`npm run dev` (plain `vite`) still works for quick UI-only iteration, but the app calls `/api/*` for all data, so ingredients/recipes won't load without either `vercel dev` running locally or a deployed environment.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:vercel` | Start Vite + the `/api` serverless functions together (use this for local dev) |
| `npm run dev` | Start Vite only, no `/api` backend |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run db:init` | Create tables and seed default data (safe to re-run — skips seeding if tables already have rows) |

## Structure

```
api/
  _db.js            # Shared Neon Postgres client (reads miko_DATABASE_URL)
  state.js           # GET  /api/state       — full { ingredients, categories, recipes }
  ingredients.js     # POST/PATCH/DELETE     — add, toggle/move, remove
  categories.js      # POST/PATCH/DELETE     — add, rename, delete (uncategorizes ingredients)
  recipes.js         # POST/PATCH/DELETE     — add, update ingredients, remove
scripts/
  init-db.mjs        # Creates tables + seeds defaults (npm run db:init)
src/
  main.jsx          # React entry point
  App.jsx           # Root component + tab navigation + loading/error states
  App.module.css
  useStore.js       # All app state — fetches/mutates via the /api routes, matching logic
  Ingredients.jsx   # Manage pantry ingredients, categories, drag-and-drop
  Ingredients.module.css
  Recipes.jsx       # Add / view recipes with match preview
  Recipes.module.css
  Suggest.jsx       # Tonight's pick — ranked by ingredient match
  Suggest.module.css
  MatchBar.jsx      # Shared progress bar component
  MatchBar.module.css
  index.css         # Global CSS variables (light + dark mode)
```

## How matching works

Each recipe is scored by the percentage of its ingredients you currently have. Recipes are ranked highest to lowest — you can skip suggestions and cycle through alternatives.
