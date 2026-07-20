# Miko — Overview

## Goal

A web app that answers "what should I cook tonight?" by matching your current ingredients against your recipes and surfacing the best option. Multi-user: each account has its own ingredients, categories, and recipes.

## Features

| Feature         | Description                                                                                                                                                                                                                                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Auth**        | Email + password signup/login/logout, session via signed HTTP-only cookie (30-day expiry). "Forgot password" emails a reset link (via Gmail SMTP) that lands on a dedicated reset form via a `?resetToken=` URL param. No email verification, no rate limiting on attempts. |
| **Ingredients** | Pantry list of ingredient names, each with a checked/unchecked in-stock state, optionally grouped into user-defined categories (add/rename/delete a category; deleting one uncategorizes its ingredients rather than deleting them). Drag-and-drop (whole row, 200ms press-and-hold before it activates) to move an ingredient between categories. Ingredients within a category (and "Uncategorized") are always shown alphabetically. Add via text input (Enter or button), remove any ingredient, toggle in-stock via checkbox. Duplicate names (case-insensitive) rejected. Shows an "N of M in stock" count. |
| **Recipes**     | Add recipes with a name and a list of ingredients, each optionally flagged "essential". The ingredient field is a custom-built (not native `<datalist>`) autocomplete suggesting names already in your pantry, but free-text entry for a brand-new ingredient still works. Saving a recipe with an ingredient not yet in your pantry auto-adds it there, unchecked — existing ingredients are never touched. View recipes as cards showing match %, a match bar, and tag chips (green = in stock, red = missing, ★ = essential). Edit mode toggles which ingredients are essential. Recipes missing an essential ingredient sit under a separate "Unmakable" section rather than being deleted or hidden. |
| **Tonight's pick** | Ranks all makable recipes by match percentage; shows the top pick with a reason, a "Find recipe ↗" Google-search link, and "Show another" to skip and re-rank. Shows up to 3 runner-ups. Resets the skip list if you run out of makable recipes. |
| **AI Ideas**    | "Get suggestions" button sends your checked-off ingredients to whatever OpenAI-compatible chat completions endpoint you've configured in Settings (OpenAI, Ollama, LM Studio, OpenRouter, Groq, etc.) and renders the recommended recipes as cards. Suggestions come from the model's own training knowledge only — there is no live web search (a generic OpenAI-compatible endpoint has no standard way to do that). |
| **Settings**    | Per-account AI provider config: endpoint URL, model name, API key. The key is write-only (never sent back to the browser after saving, only a "configured" indicator) and encrypted at rest. |

## Matching Logic

Each recipe's match score is the percentage of its ingredients currently checked as in-stock (`have.length / ings.length`, rounded). A recipe is **unmakable** if any ingredient flagged `essential: true` is not in stock, regardless of overall percentage — unmakable recipes are excluded from Tonight's Pick and shown separately on the Recipes tab. See [useStore.js](../../src/useStore.js) `getMatch()` / `getSortedRecipes()`.

## Tech Stack

| Layer            | Technology                                                                 |
| ---------------- | --------------------------------------------------------------------------- |
| UI framework     | React 18 (functional components + hooks), no router                        |
| Language         | JavaScript (JSX, no TypeScript)                                             |
| Styling          | CSS Modules per component + global CSS variables (light/dark mode) in `index.css` |
| Drag and drop    | `@dnd-kit/core` — whole-row draggable ingredients, custom press-and-hold activation |
| Build / dev      | Vite 5 (`@vitejs/plugin-react`)                                             |
| Backend          | Vercel Serverless Functions (`api/*.js`, plain Node request handlers, no framework) |
| Database         | Postgres via Neon (`@neondatabase/serverless`), scoped per user             |
| Auth             | `bcryptjs` (password hashing), `jose` (session JWT), `cookie` (Set-Cookie/parse) |
| Password reset email | `nodemailer` over Gmail SMTP (`GMAIL_USER`/`GMAIL_APP_PASSWORD`)       |
| State            | `useStore` (ingredients/recipes/categories) + `useAuth` (session) hooks, fetch-based, no external state library |

## Data Storage

All data lives in Postgres (Neon), accessed only through the `/api/*` serverless routes — the frontend never talks to the database directly, and there is no client-only/offline mode anymore.

| Table                    | Contents                                                                 |
| ------------------------ | -------------------------------------------------------------------------- |
| `users`                  | `email`, `password_hash`, plus per-account AI provider settings (`ai_endpoint_url`, `ai_model`, `ai_api_key_encrypted`) |
| `password_reset_tokens`  | Hashed one-time reset tokens with expiry, scoped to a user                  |
| `categories`             | User-defined ingredient categories, unique per `(user_id, name)`           |
| `ingredients`            | Composite primary key `(user_id, name)`, `checked`, optional `category_id` |
| `recipes`                | `name`, owned by `user_id`                                                  |
| `recipe_ingredients`     | `(recipe_id, name)`, `essential` — no `user_id` of its own; ownership is transitive via `recipe_id → recipes.user_id` |

## How to Run / Build

```bash
npm install
vercel link                      # one-time: links this folder to the Vercel project
vercel env pull .env.local
npm run db:init                  # one-time: creates tables, seeds default data if empty
npm run dev:vercel                # Vite + the /api serverless functions together — use this for local dev
```

`npm run dev` (plain `vite`) still works for quick UI-only iteration, but every tab calls `/api/*`, so nothing loads without `vercel dev` (or a deployed environment) running.

One-time setup scripts (see [file-reference.md](file-reference.md) for details): `db:migrate-auth` + `db:claim-data <email>` (adds accounts to an existing database), `db:migrate-ai-settings` (adds the AI provider settings columns). All are idempotent — safe to re-run.

```bash
npm run build      # production build (dist/)
npm run preview    # preview the production build
```

No test runner, linter, or type checker is configured.
