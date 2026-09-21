import type { CityPoint, CityWithPoints, Difficulty } from './mapboxUtils'
import airportsJson from '../data/airports.json'

// Airports mode. The shape is a superset of CityWithPoints
// (name/displayName/difficulty/mode/points) plus airport metadata
// (city/airportName/iata/country) and per-airport zoom — airports vary in
// how tightly the terminal complex sits relative to surrounding development,
// so like islands they carry their own startZoom/endZoom rather than sharing
// one fixed city default.

export interface Airport {
  name: string
  city: string
  airportName: string
  iata: string
  displayName: string
  difficulty: Difficulty
  mode: 'airports'
  country: string
  startZoom: number
  endZoom: number
  hints: string[]
  points: CityPoint[]
}

export const airports = airportsJson as Airport[]

// The game-facing pool. Shaped as CityWithPoints — carrying per-airport zoom
// + hints — so it flows through the exact same round-building path as
// Cities_v2 and Islands (pickFromDifficulty -> resolveRoundCities -> MapReveal).
export const playableAirports: CityWithPoints[] = airports.map(a => ({
  name: a.name,
  displayName: a.displayName,
  difficulty: a.difficulty,
  mode: a.mode,
  country: a.country,
  points: a.points,
  startZoom: a.startZoom,
  endZoom: a.endZoom,
  hints: a.hints,
}))
