const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;
const STYLE = 'mapbox/satellite-v9';

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface City {
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  difficulty: Difficulty;
}

export function buildMapboxStaticUrl(
  city: City,
  zoom: number,
  width: number,
  height: number,
  retina = false,
): string {
  const size = `${width}x${height}${retina ? '@2x' : ''}`
  return (
    `https://api.mapbox.com/styles/v1/${STYLE}/static/` +
    `${city.lng},${city.lat},${zoom}/` +
    `${size}` +
    `?access_token=${MAPBOX_TOKEN}`
  )
}
