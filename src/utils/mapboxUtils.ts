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
