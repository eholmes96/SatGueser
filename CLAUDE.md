# SatGueser — Claude Code project context

Satellite-zoom geography guessing game. Players watch a satellite view zoom out from a city/island and race to guess the location.

## Stack

- React 19 + TypeScript + Vite
- Mapbox GL JS (satellite reveal map)
- Supabase (Postgres + Auth, magic-link sign-in)
- oxlint for linting
- Vercel serverless function for server-authoritative daily scoring
- Deployed at satgueser.app

## npm scripts

| Command | Description |
|---|---|
| `npm run dev` | Start local dev server (Vite, port 5173) |
| `npm run build` | Type-check + Vite build + bundle API function |
| `npm run build:api` | Bundle `/api/submit-daily` from `functions-src/` via `scripts/build-api.mjs` |
| `npm run lint` | Run oxlint |

## Env vars

Two prefix behaviors — important:

- **`VITE_`-prefixed** (`VITE_MAPBOX_TOKEN`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) are inlined by Vite at build time. Must be set in Vercel, not just `.env.local`. Changing one requires a rebuild.
- **Server-only** (`SUPABASE_URL`, `SUPABASE_SECRET_KEY`) read at runtime by `/api/submit-daily`. Never add a `VITE_` prefix — the service-role key bypasses RLS and must never reach the browser.
- Leaving Supabase vars blank makes the game run fully as a guest on `localStorage`.

Copy `.env.example` → `.env.local` and set `VITE_MAPBOX_TOKEN` at minimum to get the map working locally.

## Architecture notes

### Game modes
Four modes: Daily Challenge, US Cities, Global Cities, Islands.

- **Daily Challenge** — fixed 5-city run (2 easy/2 medium/1 hard), deterministic per Eastern calendar day, one play/day (localStorage for guests, server-authoritative for signed-in players). 30/70 US-vs-non-US roll per round. Harder rounds worth more (2× medium, 3× hard). Wordle-style shareable result + streak counter. "Last 7 days" exclusion prevents repeat cities.
- **US Cities / Global / Islands** — random picks from datasets, personal history only (not leaderboard), per-difficulty personal bests.
- **Islands** — each island has its own satellite reveal zoom range (tuned by hand via `/dev` sandbox), two hints revealable as chat-style bubbles.

### Serverless API
`/api/submit-daily` is pre-bundled from `functions-src/` by `scripts/build-api.mjs` so it can reuse app scoring code without Vercel's per-file build choking on shared imports. It authenticates the player, re-derives the daily score server-side, and writes it with the service-role key.

### Supabase
Schema, RLS policies, and leaderboard/submit functions live in `supabase/migrations/`. Leaderboard functions are security-definer and expose only display name + score — never email or raw round data.

### Content datasets
- US Cities: easy/medium/hard tiers in `src/data/`
- Global Cities: 17 hard-tier cities added 2026-08-02 (Kuala Lumpur, Karachi, Tehran, etc.)
- Islands: 52 islands with per-island zoom ranges, two hints each
- Wrong guesses show live distance + compass direction to the answer

### `/dev` sandbox
Not linked from the game UI. Lets you preview and tune per-city/island satellite zoom and map style, with Easy/Medium/Hard grouping. Has a "Reset Daily Challenge" button for replaying without waiting for midnight rollover.

### Blog
Markdown-based Tips & Tricks at `/blog` — frontmatter + `marked`, same content-as-data-file pattern as city/island datasets.

## Working conventions

- README.md has a "Version history" section (most-recent-first dated changelog). Check it before assuming something is not done. Update it the same way after finishing new work.
- Magic-link sign-in requires both the production URL and `http://localhost:5173/**` registered under Supabase → Authentication → URL Configuration.
- No test suite — linting only (`npm run lint`).
