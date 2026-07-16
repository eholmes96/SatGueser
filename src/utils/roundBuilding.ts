import type { City, CityWithPoints } from './mapboxUtils'

// Fisher-Yates shuffle. Accepts an injectable rng so callers that need a
// deterministic sequence (the daily challenge) can thread a seeded generator
// through, while ordinary gameplay keeps using Math.random by default.
export function shuffle<T>(array: T[], rng: () => number = Math.random): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// Resolves each picked city down to one random point of interest, producing
// the flat lat/lng shape the rest of the game (MapReveal, round results)
// already expects — this is the only place "which point" gets decided.
// Accepts an injectable rng for the same reason as shuffle above.
export function resolveRoundCities(cities: CityWithPoints[], rng: () => number = Math.random): City[] {
  return cities.map(c => {
    const point = c.points[Math.floor(rng() * c.points.length)]
    return {
      name: c.name,
      displayName: c.displayName,
      difficulty: c.difficulty,
      mode: c.mode,
      country: c.country,
      lat: point.lat,
      lng: point.lng,
      // Islands carry per-round zoom bounds + hints; undefined for cities.
      startZoom: c.startZoom,
      endZoom: c.endZoom,
      hints: c.hints,
    }
  })
}
