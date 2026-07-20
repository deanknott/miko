# Miko — File Reference

## Root Config

| File               | Purpose                                                                 |
| ------------------ | ------------------------------------------------------------------------ |
| `package.json`     | Scripts (`dev`, `dev:vercel`, `build`, `preview`, `db:*`), deps (React 18, Vite 5, `@dnd-kit/core`, `@neondatabase/serverless`, `bcryptjs`, `jose`, `cookie`, `nodemailer`) |
| `package-lock.json`| Locked dependency tree                                                    |
| `vite.config.js`   | Vite config — registers `@vitejs/plugin-react`, no other plugins/aliases  |
| `README.md`        | Setup instructions (incl. Vercel/Postgres/auth/AI-settings one-time steps), scripts table, structure overview |
| `CLAUDE.md`        | Agent working instructions — knowledge base load order, coding conventions, doc-maintenance rules |
| `.claude/settings.local.json` | Local Claude Code permission settings for this project        |

## API (`api/`) — Vercel Serverless Functions, no framework

| File                          | Role                                                                 |
| ------------------------------ | --------------------------------------------------------------------- |
| `api/_db.js`                   | Shared Neon Postgres client — `export const sql = neon(process.env.miko_DATABASE_URL)` |
| `api/_auth.js`                 | `hashPassword`/`verifyPassword` (bcryptjs), `signSession`/`verifySession` (jose JWT), `buildSessionCookie`/`buildClearCookie`/`getSessionTokenFromRequest` (cookie), `requireAuth(req, res)` guard, `generateResetToken`/`hashResetToken`, `normalizeEmail`/`validateEmail`/`validatePassword` |
| `api/_crypto.js`               | `encryptSecret`/`decryptSecret` — AES-256-GCM, key derived from `SESSION_SECRET`; used for the AI provider API key at rest |
| `api/_email.js`                | `sendPasswordResetEmail(toEmail, resetUrl)` — thin `nodemailer` wrapper over Gmail SMTP (`GMAIL_USER`/`GMAIL_APP_PASSWORD`) |
| `api/state.js`                 | `GET` — full `{ ingredients, categories, recipes }` for the signed-in user            |
| `api/ingredients.js`           | `POST`/`PATCH`/`DELETE` — add, toggle checked/move category, remove (all scoped to `session.userId`; `ON CONFLICT (user_id, name)`) |
| `api/categories.js`            | `POST`/`PATCH`/`DELETE` — add, rename, delete (delete also uncategorizes that category's ingredients) |
| `api/recipes.js`               | `POST`/`PATCH`/`DELETE` — create/update/remove a recipe + its `recipe_ingredients`. Exports `ensurePantryIngredients(userId, ings)` (module-local, not exported outside the file) which auto-creates any referenced ingredient missing from the pantry, unchecked; both POST and PATCH return `newIngredients` from it. PATCH does an explicit `recipes` ownership check before touching `recipe_ingredients`, since that table has no `user_id` of its own. |
| `api/settings.js`              | `GET`/`PATCH` — the signed-in user's AI provider settings (`aiEndpointUrl`, `aiModel`, `hasApiKey` on GET; accepts `aiApiKey` on PATCH, write-only, encrypted before storage) |
| `api/suggest-ai.js`            | `POST` — looks up the caller's checked ingredients + AI settings, decrypts the key, calls `{endpoint}/chat/completions` on the user's configured provider, parses/returns `{ recipes: [...] }` |
| `api/auth/signup.js`           | `POST` — validate email/password, 409 if taken, hash + insert, sign session, set cookie |
| `api/auth/login.js`            | `POST` — generic "Invalid email or password" on any mismatch (no user enumeration), sign session, set cookie |
| `api/auth/logout.js`           | `POST` — clears the session cookie, no auth check needed                             |
| `api/auth/me.js`               | `GET` — `requireAuth` then re-fetch `{ id, email }` fresh; used by `useAuth` on mount to restore a session |
| `api/auth/forgot-password.js`  | `POST` — always returns the same generic message; if the email exists, generates + stores a 1-hour reset token and emails a link via `_email.js` |
| `api/auth/reset-password.js`   | `POST` — validates the token (hash + unused + unexpired), updates the password, signs a new session (auto-login) |

## Scripts (`scripts/`) — one-time / idempotent DB setup, run via `node --env-file=.env.local scripts/*.mjs`

| File                          | Role                                                                 |
| ------------------------------ | --------------------------------------------------------------------- |
| `scripts/init-db.mjs`          | Fresh-DB setup: creates `categories`/`ingredients`/`recipes`/`recipe_ingredients`, seeds defaults if empty (`npm run db:init`) |
| `scripts/migrate-auth.mjs`     | Creates `users`/`password_reset_tokens`, adds nullable `user_id` columns to the existing tables (`npm run db:migrate-auth`) |
| `scripts/claim-existing-data.mjs` | Takes an email arg; backfills that user's `user_id` onto pre-auth rows, then enforces `NOT NULL` + finalizes the composite `(user_id, name)` unique/PK constraints (`npm run db:claim-data <email>`) |
| `scripts/migrate-ai-settings.mjs` | Adds `ai_endpoint_url`/`ai_model`/`ai_api_key_encrypted` columns to `users` (`npm run db:migrate-ai-settings`) |

## Source (`src/`)

| File                       | Exports / Role                                                                                                                                                                                                                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/main.jsx`             | React entry point — `createRoot`, renders `<App />` inside `<React.StrictMode>`, imports global `index.css`                                                                                                                                                                                              |
| `src/App.jsx`              | Thin auth-gating shell (no tabs/business logic): checks `?resetToken=` → `<ResetPassword>`; `auth.loading` → loading text; `!auth.user` → `<Auth>`; else `<MainApp>` |
| `src/MainApp.jsx`          | Owns `activeTab` state (`ingredients`/`recipes`/`suggest`/`ai-suggest`/`settings`) and `menuOpen` state, calls `useStore()`, renders the header (email, logout, burger-menu button + dropdown), tab bar (`settings` is not in `TABS` — only reachable via the burger menu's "Settings" link), error banner, and the active tab component |
| `src/App.module.css`       | Layout, header (incl. `.headerRight`/`.userEmail`/`.logoutBtn`/`.menuWrap`/`.menuBtn`/`.menuDropdown`/`.menuItem`), tab bar, loading/error-banner styles — shared by `App.jsx` and `MainApp.jsx` |
| `src/apiClient.js`         | `api(path, options)` — shared `fetch` wrapper; throws with the server's JSON `error` message on non-2xx, used by both `useStore.js` and `useAuth.js` |
| `src/useStore.js`          | `useStore()` — `ingredients`/`recipes`/`categories`/`loading`/`error` (fetches `/api/state` on mount, StrictMode-safe via an ignore-flag guard); optimistic-update mutators: `addIngredient`, `removeIngredient`, `toggleIngredient`, `setIngredientCategory`, `addCategory`, `renameCategory`, `removeCategory`, `addRecipe`, `removeRecipe`, `updateRecipeIngs` (the latter two merge `newIngredients` from the API into local state); pure `getMatch(recipe)`/`getSortedRecipes(skipSet)` |
| `src/useAuth.js`           | `useAuth()` — `user`/`loading`/`error` (checks `/api/auth/me` on mount, same StrictMode ignore-flag guard); `signup`, `login`, `logout`, `forgotPassword`, `resetPassword` |
| `src/Auth.jsx`             | Login/signup/forgot-password form — one component, three modes toggled by local state, client-side validation mirrors the server's 8–72 char password rule |
| `src/Auth.module.css`      | Styles for `Auth.jsx`; also reused directly by `ResetPassword.jsx` (no separate stylesheet — the two screens are visually identical) |
| `src/ResetPassword.jsx`    | New-password + confirm form, rendered only when the URL has `?resetToken=`; on success calls `history.replaceState` to strip the query param and auto-logs in |
| `src/Ingredients.jsx`      | Ingredients tab — add-ingredient input, add-category input, `@dnd-kit/core` `DndContext` (whole-row drag, 200ms press-and-hold via `PointerSensor`/`TouchSensor` `activationConstraint`) grouping ingredients into category sections (+ "Uncategorized"), each alphabetically sorted; category rename/delete controls |
| `src/Ingredients.module.css` | Styles for ingredient rows/categories/drag states (`touch-action: pan-y`, not `none`, to keep native scroll working) |
| `src/Recipes.jsx`          | Recipes tab. Default `Recipes` + two file-local sub-components: `RecipeCard` (match %, `MatchBar`, tag chips, essential-toggle edit mode) and `AddRecipeForm` (name + ingredient list; custom-built suggestion dropdown sourced from the pantry — not a native `<datalist>` — with free-text fallback for new ingredients). Splits recipes into makable / "Unmakable" via `getMatch(r).unmakable` |
| `src/Recipes.module.css`   | Styles for recipe cards, tag chips, essential-editing chip grid, add-recipe form, and the custom autocomplete dropdown (`.autocompleteWrap`/`.suggestionList`/`.suggestionItem`) |
| `src/Suggest.jsx`          | "Tonight's pick" tab — local `skipped` `Set` of recipe ids, ranks via `getSortedRecipes(skipped)`, shows top pick + up to 3 runner-ups, handles empty states |
| `src/Suggest.module.css`   | Styles for the top-pick card, runner-up cards, empty states                                                                                                                                                                                                                                              |
| `src/AISuggest.jsx`        | AI Ideas tab — "Get suggestions" button calling `POST /api/suggest-ai`, renders returned recipe cards, surfaces a "Go to Settings" link on the "configure your AI provider first" error |
| `src/AISuggest.module.css` | Styles for the suggest button, error box, result cards                                                                                                                                                                                                                                                    |
| `src/Settings.jsx`         | AI provider settings form — endpoint URL, model, API key (password input, write-only — never pre-filled, only a "(configured)" indicator); Save + "Remove key" actions against `GET`/`PATCH /api/settings` |
| `src/Settings.module.css`  | Styles for the settings form                                                                                                                                                                                                                                                                              |
| `src/MatchBar.jsx`         | Shared, stateless. Exports `matchClass(pct)` (`'full'`/`'partial'`/`'low'`) and default `MatchBar({ pct })`. Used by `Recipes.jsx` and `Suggest.jsx`                                                                                                                                                       |
| `src/MatchBar.module.css`  | Progress bar track/fill styles per match class                                                                                                                                                                                                                                                            |
| `src/index.css`            | Global CSS custom properties for light/dark theming (`@media (prefers-color-scheme: dark)`, no JS toggle), base element resets                                                                                                                                                                            |

Deleted since the pre-Postgres version: `src/storage.js` (localStorage persistence — removed when the app moved to a Postgres-backed API).
