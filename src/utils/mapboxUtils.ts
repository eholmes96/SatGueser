export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string

export type Difficulty = 'easy' | 'medium' | 'hard'

export type Mode = 'us' | 'global'

// The game-level mode selector supports one option beyond the per-city Mode
// above: 'daily' picks a fixed cross-mode set of cities (see
// utils/dailyChallenge.ts) rather than filtering by a single Mode.
export type GameMode = Mode | 'daily'

export interface City {
  name: string
  displayName: string
  lat: number
  lng: number
  difficulty: Difficulty
  mode: Mode
  country?: string
}

// Cities_v2.json shape: a city with several candidate start coordinates
// (landmarks) instead of one, so a round can vary where it starts each time.
export interface CityPoint {
  label: string
  lat: number
  lng: number
}

export interface CityWithPoints {
  name: string
  displayName: string
  difficulty: Difficulty
  mode: Mode
  country?: string
  points: CityPoint[]
}
