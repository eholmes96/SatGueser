# SatGueser

The hottest satellite based geography quiz game.

Watch a satellite view slowly zoom out from a city, and race the clock to guess where you're looking at before the reveal finishes.

## Gameplay

- Each game is 5 rounds. Every round shows a different city, starting fully zoomed in on a satellite view that gradually zooms out over 30 seconds.
- Type a guess into the autocomplete input — the sooner you guess correctly, the more points you score. Guessing after the timer runs out scores 0 for that round.
- **Difficulty**: Easy, Medium, or Hard — controls how obscure the round's cities are.
- **Mode**: Daily Challenge, US Cities, or Global — pick before you start.
  - US mode draws from well-known American metros; Global mode adds international cities and matches guesses regardless of accents (e.g. typing "sao paulo" still matches "São Paulo, Brazil").
  - Daily Challenge has no difficulty picker — everyone gets the same fixed 5-city set (2 easy/2 medium/1 hard, ~30% US/70% non-US) for the day, rotating at midnight Eastern time and playable once per day. Harder rounds score more (2x medium, 3x hard), and you can copy a shareable result once you finish.

## Tech stack

- [React 19](https://react.dev/) + TypeScript, built with [Vite](https://vite.dev/)
- [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/guides/) for the satellite reveal map
- [oxlint](https://oxc.rs/docs/guide/usage/linter.html) for linting

## Getting started

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local` and set `VITE_MAPBOX_TOKEN` to a Mapbox public token (get one free at [account.mapbox.com/access-tokens](https://account.mapbox.com/access-tokens/)). `.env.local` is gitignored and should never be committed.

```bash
npm run dev
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the local dev server |
| `npm run build` | Type-check and build for production (outputs to `dist/`) |
| `npm run preview` | Serve the production build locally, to verify before deploying |
| `npm run lint` | Run oxlint |

## Deployment

Deployed on [Vercel](https://vercel.com/). `vercel.json` rewrites all routes to `index.html` for correct SPA routing. When setting up the Vercel project, set `VITE_MAPBOX_TOKEN` as an environment variable in the project settings — Vite inlines it at build time, so it must be present on Vercel, not just in your local `.env.local`.

## Version history

No formal releases/tags yet — this is a running log of notable changes, most recent first.

**2026-07-06 — Daily Challenge mode**
- Added a Daily Challenge, shown as the first option in the mode selector: a fixed 5-city run (2 easy + 2 medium + 1 hard) that's identical for every player and rotates at midnight Eastern time, playable once per day via a local completion record (with a read-only recap shown if you reopen it after finishing).
- Each daily round independently rolls US vs. non-US at 30%/70% odds before picking a city, deduping the handful of cities that exist as both a US and a Global entry so the same real place can't be drawn twice in one day.
- Harder daily rounds now score more (medium 2x, hard 3x the normal time-based score), with an Easy/Medium/Hard column added to both the end-of-game breakdown and the recap card.
- Added a shareable, Wordle-style result (copy-to-clipboard with a per-round emoji row) and a day-streak counter.
- Added a "Reset Daily Challenge" button to the dev sandbox for replaying without waiting for the real midnight rollover.
- Rebalanced Global mode's difficulty mix to skew harder overall (was 20 easy/26 medium/16 hard, now 20/20/22), weighing both satellite-view distinctiveness and real-world name recognition rather than geography alone.

**2026-07-05 — Cleanup**
- Fixed error handler ordering in the map reveal component and removed leftover debug logging.

**2026-07-04 — Landmark accuracy pass**
- Replaced 106 landmark points across 68 cities that were geographically part of a metro area but too far from its actual urban core to feel connected to it — the worst offenders were international airports, typically built miles outside downtown by design.
- Removed the dev sandbox's legacy single-point dataset toggle (unused by the real game, which had fully moved to the multi-point data) and fixed the sandbox's mode toggle resetting every time you returned to the city picker.

**2026-07-03 — Multi-point cities & content expansion**
- Wired multi-point cities into real gameplay: every city now offers several candidate start landmarks instead of one fixed point, picked at random per round.
- Added 15 more US cities and 26 more global cities, and rebalanced several individual cities' difficulty ratings (including Beijing, Detroit, St. Louis, Lagos, Paris, and Cape Town) based on how recognizable they actually are from a satellite view.
- Added an exit button during play, fixed the last round skipping straight to the Game Over screen instead of showing its round-result card first, and made the mode toggle's button list derive from a single config object instead of a hardcoded list.

**2026-07-02 — Dev sandbox**
- Added a `/dev` sandbox route for manually tuning zoom and map style per city, fully decoupled from the game UI and never linked to from it.
- Added multi-point pilot data (multiple candidate landmarks per city) and wired it into the sandbox for preview, ahead of using it in real gameplay.

**2026-07-02 — Mobile fixes & preview-deployment handling**
- Fixed the on-screen keyboard covering the top status bar on iOS by switching to `100dvh` and restructuring the top/bottom bars as flex children instead of absolutely-positioned overlays.
- Fixed the difficulty tiles overflowing/clipping on narrow (~375px) screens.
- Added a distinct message (no Retry button) when Mapbox returns a 403 on a Vercel preview deployment, since the Mapbox token is intentionally restricted to production + localhost.

**2026-07-02 — Fairer city selection**
- Replaced a biased `sort(() => Math.random() - 0.5)` shuffle with a proper Fisher-Yates implementation.
- Games no longer repeat the immediately-previous game's cities (tracked per mode+difficulty), and global-mode rounds avoid two consecutive cities from the same country.

**2026-07-02 — Global cities mode & production readiness**
- Added a Global Cities mode (36 international cities) alongside the original US mode, with a mode toggle on the difficulty screen and accent-insensitive guess matching.
- Fixed a bug where submitting a correct guess via Enter (instead of a click) could skip the round-result popup.
- Added `vercel.json`, Open Graph/Twitter meta tags, a generated preview image, and a friendly retry UI for failed satellite image loads.
- Removed `ImageReveal.tsx`, a dead leftover from the pre-Mapbox-GL-JS static images implementation.

**2026-07-01 — Mapbox GL JS migration & UI polish**
- Replaced the old Static Images API reveal with a live Mapbox GL JS map (continuous zoom-out animation instead of stepped frames).
- The title now shrinks and stays visible above the difficulty picker instead of disappearing, and the guess input auto-focuses at the start of every round.

**2026-06-29 to 2026-06-30 — Foundation**
- Initial satellite zoom-reveal gameplay, full-screen game UI, difficulty selection, wrong-guess feedback, round results, and pre-deployment cleanup (gitignore hardening, env var setup).
