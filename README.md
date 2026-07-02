# SatGueser

The hottest satellite based geography quiz game.

Watch a satellite view slowly zoom out from a city, and race the clock to guess where you're looking at before the reveal finishes.

## Gameplay

- Each game is 5 rounds. Every round shows a different city, starting fully zoomed in on a satellite view that gradually zooms out over 30 seconds.
- Type a guess into the autocomplete input — the sooner you guess correctly, the more points you score. Guessing after the timer runs out scores 0 for that round.
- **Difficulty**: Easy, Medium, or Hard — controls how obscure the round's cities are.
- **Mode**: US Cities or Global — pick before you start. US mode draws from well-known American metros; Global mode adds international cities and matches guesses regardless of accents (e.g. typing "sao paulo" still matches "São Paulo, Brazil").

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
