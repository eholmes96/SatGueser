export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string

export type Difficulty = 'easy' | 'medium' | 'hard'

export type Mode = 'us' | 'global'

export interface City {
  name: string
  displayName: string
  lat: number
  lng: number
  difficulty: Difficulty
  mode: Mode
  country?: string
}

// testCities.json shape: a city with several candidate start coordinates
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
