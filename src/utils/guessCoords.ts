import citiesV2Json from '../Cities_v2.json'
import type { CityWithPoints } from './mapboxUtils'
import { US_CITY_COORDS } from '../data/usCities'
import { GLOBAL_CITY_COORDS } from '../data/globalCities'
import { playableIslands } from './islands'
import { normalize } from './textUtils'
import type { LatLng } from './geo'

// Looks up a guessed displayName's coordinates for the wrong-guess
// distance/direction hint. Guesses can only ever be autocomplete entries
// (see CityGuessInput), so one merged map over every suggestion pool gives
// full coverage. Keyed by normalize() — the same canonicalization submitGuess
// uses to match guesses — so lookup and guess-matching can never disagree on
// what a name means. US names ('New York') and global names ('New York, USA')
// normalize to distinct keys, so Daily's merged pool stays unambiguous.
//
// Precedence (later insert wins): Cities_v2 landmark points are the fallback,
// overridden by the curated city-center coords in the data files where both
// exist. Islands only appear in playableIslands, so their order doesn't matter.

const coordsByName = new Map<string, LatLng>()

for (const c of citiesV2Json as CityWithPoints[]) {
  coordsByName.set(normalize(c.displayName), c.points[0])
}
for (const i of playableIslands) {
  coordsByName.set(normalize(i.displayName), i.points[0])
}
for (const c of [...US_CITY_COORDS, ...GLOBAL_CITY_COORDS]) {
  coordsByName.set(normalize(c.name), { lat: c.lat, lng: c.lng })
}

export function getGuessCoords(displayName: string): LatLng | null {
  return coordsByName.get(normalize(displayName)) ?? null
}
