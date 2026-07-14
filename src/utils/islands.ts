import type { CityPoint, Difficulty } from './mapboxUtils'
import islandsJson from '../data/islands.json'

// Islands mode (dev-only for now). Kept in its own module + JSON so the game
// stays untouched until the tentative difficulty categories firm up. The shape
// is a superset of CityWithPoints (name/displayName/difficulty/mode/points) plus
// island metadata (area/length/hints) and per-island zoom — islands range over
// ~5 orders of magnitude in size, so unlike cities they can't share one fixed
// START_ZOOM/END_ZOOM.

// A fourth bucket beyond the game's three: islands whose difficulty placement
// we're not yet confident about land here rather than being force-fit.
export type IslandCategory = Difficulty | 'undetermined'

// Which source list an island came from (islands can appear on more than one —
// that overlap is intentional). 'notable' covers hand-picked additions that
// aren't from the three ranked lists.
export type IslandList = 'biggest' | 'populated' | 'visited' | 'notable'

export interface Island {
  name: string
  displayName: string
  difficulty: IslandCategory
  mode: 'islands'
  areaKm2: number
  lengthKm?: number
  lists: IslandList[]
  // Reveal zoom bounds for this specific island: startZoom (closer, ambiguous)
  // eases out to endZoom (whole island roughly fills the frame). Seeded from a
  // log formula, then hand-tuned in the dev sandbox.
  startZoom: number
  endZoom: number
  hints: string[]
  points: CityPoint[]
}

export const ISLAND_CATEGORIES: IslandCategory[] = ['easy', 'medium', 'hard', 'undetermined']

export const islands = islandsJson as Island[]
