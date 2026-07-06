# Miko — Architecture

## Process Model

Miko is a Vite React SPA (client) talking to Vercel Serverless Functions (`api/*.js`, one file per route, no framework) backed by Postgres (Neon). There is no `vercel.json` — Vercel auto-detects `/api/*.js` as functions regardless of the Vite framework preset.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Browser (Vite dev server in dev / static bundle in prod)            │
│                                                                        │
│  main.jsx — React root, mounts <App /> in StrictMode                  │
│  │                                                                     │
│  └── App.jsx — thin auth-gating shell, no tabs/business logic         │
│        ├── useAuth()            — session state, /api/auth/*          │
│        ├── has ?resetToken=     → <ResetPassword />                   │
│        ├── auth.loading         → loading state                       │
│        ├── !auth.user           → <Auth /> (login/signup/forgot)      │
│        └── else                 → <MainApp user onLogout>             │
│              ├── useStore()     — ingredients/recipes/categories       │
│              ├── tab navigation (plain useState, no router)            │
│              ├── header burger menu (☰) → "Settings" link             │
│              │     (same activeTab state, not part of the tab bar)    │
│              └── active tab renders one of:                           │
│                    ├── Ingredients.jsx  (categories, drag-and-drop)    │
│                    ├── Recipes.jsx      (custom ingredient autocomplete)│
│                    ├── Suggest.jsx      ("Tonight's pick")             │
│                    ├── AISuggest.jsx    (AI Ideas)                     │
│                    └── Settings.jsx     (AI provider config — reached  │
│                          only via the burger menu, not a visible tab) │
└──────────────────────────────────────────────────────────────────────┘
                              │ fetch('/api/...')
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Vercel Serverless Functions (api/*.js)                                │
│  _db.js       — shared Neon client (reads miko_DATABASE_URL)          │
│  _auth.js     — password hash/verify, session sign/verify, cookies,   │
│                 requireAuth guard, email/password validation           │
│  _crypto.js   — AES-256-GCM encrypt/decrypt (AI provider API key)     │
│  _email.js    — Resend wrapper (password reset)                       │
│  state.js, ingredients.js, categories.js, recipes.js — data, all      │
│                 scoped to the authenticated user                       │
│  settings.js, suggest-ai.js — AI provider settings + suggestions       │
│  auth/{signup,login,logout,me,forgot-password,reset-password}.js       │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    Postgres (Neon) — see overview.md § Data Storage
```

## Auth Flow

- **Session**: a `jose`-signed JWT (`{ sub: userId }`, HS256, 30-day expiry, secret from `SESSION_SECRET`) stored in an `httpOnly`, `sameSite: lax` cookie named `miko_session` (`secure` except on localhost). Every protected API handler starts with `const session = await requireAuth(req, res); if (!session) return` — `requireAuth` already sends the 401 if the cookie is missing/invalid.
- **Passwords**: hashed with `bcryptjs` (cost 12). Policy: 8–72 characters (72 is bcrypt's hard input-truncation limit), no forced composition rules (NIST 800-63B guidance). Login/signup errors are generic ("Invalid email or password") to avoid leaking which emails have accounts.
- **Password reset**: `forgot-password.js` always returns the same generic message whether or not the email exists (no enumeration), and only emails a link if it does. The token itself is a random 32-byte value; only its SHA-256 hash is stored (`password_reset_tokens.token_hash`), 1-hour expiry, single-use (`used_at`). `reset-password.js` validates the token, updates the password, and signs the user in immediately (auto-login).
- **Frontend**: `useAuth.js` (mirrors `useStore.js`'s shape) checks `/api/auth/me` on mount to restore a session; `App.jsx` doesn't mount `useStore()` (and its `/api/state` fetch) until `auth.user` exists, so a logged-out visitor never hits a 401 from the data endpoints.
- **No email verification, no rate limiting** on signup/login/reset attempts — a deliberate simplification for a personal-scale app, not an oversight to "fix" without being asked.

## State Ownership

- **`useAuth()`** (`src/useAuth.js`) — `user`, `loading`, `error`; exposes `signup`, `login`, `logout`, `forgotPassword`, `resetPassword`. All go through `POST`/`GET` calls to `/api/auth/*` via the shared `api()` helper.
- **`useStore()`** (`src/useStore.js`) — `ingredients`, `recipes`, `categories`, `loading`, `error`; fetches `/api/state` once on mount, then every mutator (`addIngredient`, `toggleIngredient`, `setIngredientCategory`, `addCategory`, `renameCategory`, `removeCategory`, `addRecipe`, `removeRecipe`, `updateRecipeIngs`, …) does an optimistic local update, awaits the matching `/api/*` call, and rolls back on failure. `getMatch`/`getSortedRecipes` are pure derived-data functions, recomputed on every call (fine at this data scale).
- **`src/apiClient.js`** — the shared `api(path, options)` fetch wrapper both hooks use. On a non-2xx response it parses the JSON body's `error` field for the thrown message (so forms can show the server's real error text, e.g. "Invalid email or password") rather than a generic "path failed: 500".
- No context, no Redux/Zustand-style global store, no prop-drilling beyond `MainApp` → active tab component.

### StrictMode double-fetch gotcha (fixed — replicate the pattern for new mount-effect fetches)

React 18's `<StrictMode>` (enabled in `main.jsx`) double-invokes mount effects in dev. Both `useStore.js`'s and `useAuth.js`'s initial fetches used to fire twice on mount as two independent requests; since each is a separate serverless cold start, they could resolve **out of order**, and whichever response landed *last* silently overwrote state — including with a stale snapshot from before a fast follow-up action (e.g. adding an ingredient right after signup could vanish from view, even though the database was always correct). Both effects now guard with the standard React "ignore flag" pattern:

```js
useEffect(() => {
  let ignore = false
  api('/api/whatever')
    .then(data => { if (!ignore) setState(data) })
    .finally(() => { if (!ignore) setLoading(false) })
  return () => { ignore = true }
}, [])
```

Any new component that fetches on mount needs this same guard, or it's silently reintroducing the same class of race.

## Matching Algorithm

`getMatch(recipe)` in `useStore.js`:

1. Takes the names of all currently-checked ingredients.
2. Splits the recipe's ingredient list into `have` (checked) and `missing` (unchecked).
3. Sets `unmakable = true` if any ingredient with `essential: true` is not checked — independent of the percentage.
4. Computes `pct = round(have.length / ings.length * 100)`.

`getSortedRecipes(skipSet)` filters out skipped recipe ids and unmakable recipes, sorts descending by `pct`. `Suggest.jsx` keeps the skip set as local component state — resets on remount or "start over".

`matchClass(pct)` (`MatchBar.jsx`) buckets a percentage into `full` (100) / `partial` (≥50) / `low` (<50) for color-coding across Recipes, Suggest, and (indirectly) nowhere else.

## Ingredients: Categories & Drag-and-Drop

- Categories are optional; ingredients without one render under an always-present "Uncategorized" section. Deleting a category sets its ingredients' `categoryId` to `null` rather than deleting them.
- Both the category list and the ingredient list within each category are sorted alphabetically for display (`byName` in `Ingredients.jsx`) — this is display-only, not the underlying array order.
- Drag-and-drop uses `@dnd-kit/core`. The **whole row** is the drag target (not just an icon), via `useDraggable` on the `<li>` with `PointerSensor`/`TouchSensor` configured with `activationConstraint: { delay: 200, tolerance: 5 }` — a genuine press-and-hold, not drag-on-any-movement. The delete `×` button stops its own `onPointerDown` propagation, since without that, Chrome's drag-sensor swallows its click (a real bug hit and fixed during development — form-element exclusions in dnd-kit's sensors don't cover plain `<button>`s).
- `touch-action: pan-y` (not `none`) on `.row` — `none` would hand *all* touch handling to JS, breaking native vertical scroll on iOS whenever a touch starts on a row, even before a drag is confirmed.

## Recipes: Ingredient Picker

`AddRecipeForm` (inside `Recipes.jsx`) originally used a native `<input list>` + `<datalist>` for pantry-ingredient autocomplete. Replaced with a fully custom React-rendered suggestion dropdown after two distinct native-datalist cross-browser bugs surfaced: Firefox shows all suggestions on focus while Chrome only filters after typing (a real behavioral difference, not a bug), and — the actual blocker — Chrome's suggestions were confirmed unclickable in practice. The custom dropdown (filtered `<button>` list, `onMouseDown` + `preventDefault()` to avoid the classic blur-before-click race) behaves identically across all browsers and shows all pantry ingredients on focus.

Saving a recipe (`POST`/`PATCH /api/recipes`) also calls `ensurePantryIngredients()` server-side, which `INSERT ... ON CONFLICT (user_id, name) DO NOTHING RETURNING ...` for every ingredient the recipe references — any name not already in the pantry is created there as **unchecked**; existing ones (checked or not) are left untouched. The response's `newIngredients` array is merged into `useStore`'s local `ingredients` state so the Ingredients tab reflects it immediately, no reload needed.

## AI Ideas & Settings

- Deliberately **not** using the Anthropic/Claude SDK — the user explicitly asked for a generic "OpenAI-compatible endpoint" so any provider (OpenAI, Ollama, LM Studio, OpenRouter, Groq, a local model, etc.) can be plugged in per account.
- `Settings.jsx` is reached via the header's burger menu (☰ button → "Settings" link), not the main tab bar — `MainApp.jsx` still sets `activeTab` to `'settings'` the same way, it's just not one of the `TABS` array entries shown in `role="tablist"`. The menu button/dropdown reuses the same `onMouseDown` + `preventDefault()` / `onBlur` pattern as the recipe ingredient autocomplete below, now used twice in the codebase — reach for it again for any future small popover/dropdown rather than inventing a third variant.
- `Settings.jsx` stores `aiEndpointUrl`, `aiModel`, and `aiApiKey` via `GET`/`PATCH /api/settings`. The API key is encrypted at rest (`api/_crypto.js`, AES-256-GCM, key derived via `sha256(SESSION_SECRET + ':ai-key-encryption')` — reuses the existing session secret rather than requiring a new env var) and is **write-only**: `GET` only ever returns `hasApiKey: boolean`, never the key itself.
- `AISuggest.jsx` calls `POST /api/suggest-ai` with no body — the endpoint independently looks up the caller's checked ingredients and AI settings server-side. It builds a plain chat-completions request (`POST {endpoint}/chat/completions`, `Authorization: Bearer <decrypted key>`, `response_format: { type: 'json_object' }` asking for `{"recipes": [...]}`), with a 45-second timeout and a fenced-code-block-stripping JSON parser (`extractJson`) since not every provider honors `response_format`.
- No live web search: a generic OpenAI-compatible chat completions endpoint has no standardized search capability. Adding one would mean Miko itself calling a separate search API (another provider + key to manage) — explicitly scoped out for now.

## Styling

Every component has a co-located CSS Module (`Component.module.css`). Global CSS custom properties (light/dark via `@media (prefers-color-scheme: dark)`, no JS toggle) live in `index.css`. New components (`Auth`, `AISuggest`, `Settings`, `ResetPassword`) reuse the same variable set (`--border`, `--radius`, `--bg-subtle`, `--red-bg`/`--red-text` for errors, etc.) rather than introducing new tokens; `ResetPassword.jsx` reuses `Auth.module.css` directly rather than duplicating near-identical styles.

## Build Pipeline

```
vite.config.js — defineConfig({ plugins: [react()] })
src/main.jsx   → entry, mounts React root in StrictMode
api/*.js       → Vercel Serverless Functions, auto-detected (no vercel.json)
```

- `npm run dev:vercel` (`vercel dev`) — Vite + the `/api` functions together; the only way to run the app locally with working data, since every tab depends on `/api/*`.
- `npm run dev` (plain `vite`) — frontend only, no backend; useful for pure UI iteration but data won't load.
- `npm run build` / `npm run preview` — production bundle to `dist/` / local preview of it.
- No test runner, linter, or type checker configured (plain JS, no `tsconfig.json`).

## Known Technical Debt

- No rate limiting on `/api/auth/login`, `/api/auth/signup`, or `/api/auth/forgot-password` — brute-force/enumeration risk is currently only mitigated by generic error messages, not throttling.
- No CSRF token — relies solely on `sameSite: lax` cookies (acceptable for this app's same-origin-only usage, but worth knowing if a cross-site POST vector is ever added).
- The AI provider API key's encryption key is derived from `SESSION_SECRET` rather than a dedicated secret — a pragmatic reuse, not a dedicated key-management setup.
- `AISuggest.jsx` has no caching/dedupe — every "Get suggestions" click is a fresh (billable, for hosted providers) call to the user's configured endpoint.
- No automated tests anywhere in the project; all verification so far has been manual (build + live browser checks via Playwright during development).
