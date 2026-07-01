# Miko

> What should I cook tonight?

Miko cuts out the deliberation by matching your current ingredients against your recipes and surfacing the best option.

Data (ingredients, categories, recipes) is stored in a Postgres database (Vercel/Neon) via serverless API routes, scoped per signed-in user — there is no client-only mode anymore.

## Getting started

```bash
npm install
vercel link          # one-time: links this folder to the Vercel project
vercel env pull .env.local
npm run db:init       # one-time: creates tables and seeds default data if empty
npm run dev:vercel
```

Then open http://localhost:3000

`npm run dev` (plain `vite`) still works for quick UI-only iteration, but the app calls `/api/*` for all data, so nothing will load without either `vercel dev` running locally or a deployed environment.

### Auth setup (one-time, per environment)

Requires two additional env vars beyond the database ones already pulled above:

- `SESSION_SECRET` — a random signing key for session cookies. Generate one (`openssl rand -hex 32`) and add it via `vercel env add SESSION_SECRET` for all environments, then `vercel env pull .env.local` again locally.
- `RESEND_API_KEY` — from a free [Resend](https://resend.com) account, used to send password-reset emails. Add it the same way.

Then, once against the live database (only needed the first time auth is added to an existing deployment, or on any fresh database):

```bash
npm run db:migrate-auth              # creates users/password_reset_tokens tables, adds nullable user_id columns
# deploy the app, then sign up for a real account through the actual UI
npm run db:claim-data you@example.com   # reassigns pre-existing ingredients/recipes to that account
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:vercel` | Start Vite + the `/api` serverless functions together (use this for local dev) |
| `npm run dev` | Start Vite only, no `/api` backend |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run db:init` | Create tables and seed default data (safe to re-run — skips seeding if tables already have rows) |
| `npm run db:migrate-auth` | One-time: create `users`/`password_reset_tokens` tables and add nullable `user_id` columns |
| `npm run db:claim-data <email>` | One-time: reassign pre-auth ingredients/recipes/categories to the given account and finalize per-user constraints |

## Structure

```
api/
  _db.js             # Shared Neon Postgres client (reads miko_DATABASE_URL)
  _auth.js           # Password hashing, session signing/cookies, requireAuth guard
  _email.js          # Resend wrapper for password-reset emails
  state.js           # GET  /api/state       — full { ingredients, categories, recipes } for the signed-in user
  ingredients.js     # POST/PATCH/DELETE     — add, toggle/move, remove (scoped to the signed-in user)
  categories.js      # POST/PATCH/DELETE     — add, rename, delete (uncategorizes ingredients)
  recipes.js         # POST/PATCH/DELETE     — add, update ingredients, remove
  auth/
    signup.js         # POST /api/auth/signup
    login.js          # POST /api/auth/login
    logout.js         # POST /api/auth/logout
    me.js             # GET  /api/auth/me — restores a session from the cookie
    forgot-password.js  # POST /api/auth/forgot-password — emails a reset link
    reset-password.js   # POST /api/auth/reset-password — consumes the reset token
scripts/
  init-db.mjs               # Creates tables + seeds defaults (npm run db:init)
  migrate-auth.mjs          # One-time: users/password_reset_tokens tables + nullable user_id columns
  claim-existing-data.mjs   # One-time: assigns pre-auth data to a real account by email
src/
  main.jsx          # React entry point
  App.jsx           # Thin auth-gating shell — reset-password link, loading, Auth, or MainApp
  MainApp.jsx       # The tab navigation + loading/error states (what App.jsx used to be)
  App.module.css
  apiClient.js      # Shared fetch wrapper (surfaces server error messages)
  useStore.js       # All ingredient/recipe/category state — fetches/mutates via the /api routes
  useAuth.js        # Session state — signup/login/logout/forgotPassword/resetPassword
  Auth.jsx          # Login / signup / forgot-password form (one component, three modes)
  Auth.module.css
  ResetPassword.jsx # New-password form, shown when the URL has ?resetToken=
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
