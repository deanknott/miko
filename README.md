# Miko

> What should I cook tonight?

Miko cuts out the deliberation by matching your current ingredients against your recipes and surfacing the best option.

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:5173

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

## Structure

```
src/
  main.jsx          # React entry point
  App.jsx           # Root component + tab navigation
  App.module.css
  useStore.js       # All app state (ingredients, recipes, matching logic)
  Ingredients.jsx   # Manage pantry ingredients
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
