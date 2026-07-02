export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface City {
  name: string
  displayName: string
  lat: number
  lng: number
  difficulty: Difficulty
}
