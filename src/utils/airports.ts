import type { CityPoint, CityWithPoints, Difficulty } from './mapboxUtils'
import type { SuggestionEntry } from './suggestionMatching'
import airportsJson from '../data/airports.json'
import busiestExtraJson from '../data/busiestAirportsExtra.json'

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

// The autocomplete pool is deliberately larger than the playable set: players
// can type any of the world's busiest airports and have it recognized, even
// though only the entries above are ever actual round answers — guessing one
// of the extras just registers as a normal wrong guess. Real playable
// airports always win a IATA collision with the extra list, since only they
// carry real gameplay data.
interface BusiestAirportRef {
  city: string
  airportName: string
  iata: string
}

const busiestExtra = busiestExtraJson as BusiestAirportRef[]
const playableIata = new Set(airports.map(a => a.iata.toUpperCase()))

function toSuggestionEntry(a: { city: string; airportName: string; iata: string; displayName?: string }): SuggestionEntry {
  return {
    display: a.displayName ?? `${a.city} ${a.airportName} (${a.iata})`,
    fields: [
      { value: a.iata, tier: 0 },
      { value: a.city, tier: 1 },
      { value: a.airportName, tier: 2 },
    ],
  }
}

export const AIRPORT_SUGGESTIONS: SuggestionEntry[] = [
  ...airports.map(toSuggestionEntry),
  ...busiestExtra.filter(a => !playableIata.has(a.iata.toUpperCase())).map(toSuggestionEntry),
]
