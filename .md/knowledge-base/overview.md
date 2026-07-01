# Miko — Overview

## Goal

A single-page web app that answers "what should I cook tonight?" by matching the ingredients you currently have against a list of recipes, ranking the best fits, and letting you cycle through alternatives.

## Features

| Feature         | Description                                                                                                                                                                                                                                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ingredients** | Pantry list of ingredient names, each with a checked/unchecked in-stock state. Add new ingredients via text input (Enter or button), remove any ingredient, toggle in-stock status via checkbox. Duplicate names (case-insensitive) are rejected. Shows an "N of M in stock" count.                            |
| **Recipes**     | Add recipes with a name and a list of ingredients, each ingredient optionally flagged "essential". View existing recipes as cards showing match %, a match bar, and tag chips (green = in stock, red = missing, ★ = essential). Edit mode lets you toggle which ingredients are essential per recipe. Recipes missing an essential ingredient are shown separately under an "Unmakable" section rather than being deleted or hidden. Delete any recipe. |
| **Tonight's pick** | Ranks all makable (non-unmakable) recipes by match percentage and shows the top pick with a reason ("You have everything you need" or a breakdown of missing ingredients), a "Find recipe ↗" link (Google search in a new tab), and a "Show another" button that skips the current pick and re-ranks. Shows up to 3 runner-up options below. Resets the skip list if you run out of makable recipes. |

## Matching Logic

Each recipe's match score is the percentage of its ingredients currently checked as in-stock (`have.length / ings.length`, rounded). A recipe is **unmakable** if any ingredient flagged `essential: true` is not in stock, regardless of overall percentage — unmakable recipes are excluded from Tonight's Pick and shown in a separate section on the Recipes tab. See [useStore.js](../../src/useStore.js) `getMatch()` / `getSortedRecipes()`.

## Tech Stack

| Layer          | Technology                                      |
| -------------- | ------------------------------------------------ |
| UI framework   | React 18 (functional components + hooks)         |
| Language       | JavaScript (JSX, no TypeScript)                  |
| Styling        | CSS Modules per component + global CSS variables (light/dark mode) in `index.css` |
| Build / dev    | Vite 5 (`@vitejs/plugin-react`)                  |
| State          | Single custom hook (`useStore`), no external state library, no persistence |

## Data Storage

There is no backend and no persistence layer. All state lives in React component state via `useStore()` (backed by `useState`) and is lost on page refresh. Default ingredients and recipes are hard-coded seed data in [useStore.js](../../src/useStore.js).

## How to Run / Build

```bash
# Install dependencies
npm install

# Start dev server (Vite, HMR) — opens on http://localhost:5173
npm run dev

# Production build (outputs to dist/)
npm run build

# Preview production build
npm run preview
```
