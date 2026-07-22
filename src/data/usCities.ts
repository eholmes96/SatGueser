// Top 100 US cities by metro area population (US Census Bureau estimates).
// Used for autocomplete suggestions in the guess input, plus approximate
// city-center coordinates (WGS84, ~2 decimals) for the wrong-guess
// distance/direction hint. Coordinate precision only needs to support
// "how far and which way" at inter-city scale, not pinpoint accuracy.
import citiesV2Json from '../Cities_v2.json'
import type { CityWithPoints } from '../utils/mapboxUtils'

export interface SuggestionCity {
  name: string
  lat: number
  lng: number
}

const CURATED_US_CITIES: SuggestionCity[] = [
  { name: 'New York', lat: 40.71, lng: -74.01 },
  { name: 'Los Angeles', lat: 34.05, lng: -118.24 },
  { name: 'Chicago', lat: 41.88, lng: -87.63 },
  { name: 'Dallas', lat: 32.78, lng: -96.8 },
  { name: 'Houston', lat: 29.76, lng: -95.37 },
  { name: 'Washington, DC', lat: 38.91, lng: -77.04 },
  { name: 'Miami', lat: 25.76, lng: -80.19 },
  { name: 'Philadelphia', lat: 39.95, lng: -75.17 },
  { name: 'Atlanta', lat: 33.75, lng: -84.39 },
  { name: 'Phoenix', lat: 33.45, lng: -112.07 },
  { name: 'Boston', lat: 42.36, lng: -71.06 },
  { name: 'Riverside', lat: 33.95, lng: -117.4 },
  { name: 'Seattle', lat: 47.61, lng: -122.33 },
  { name: 'San Francisco', lat: 37.77, lng: -122.42 },
  { name: 'Detroit', lat: 42.33, lng: -83.05 },
  { name: 'San Diego', lat: 32.72, lng: -117.16 },
  { name: 'Minneapolis', lat: 44.98, lng: -93.27 },
  { name: 'Tampa', lat: 27.95, lng: -82.46 },
  { name: 'Denver', lat: 39.74, lng: -104.99 },
  { name: 'St. Louis', lat: 38.63, lng: -90.2 },
  { name: 'Baltimore', lat: 39.29, lng: -76.61 },
  { name: 'Orlando', lat: 28.54, lng: -81.38 },
  { name: 'Portland, OR', lat: 45.52, lng: -122.68 },
  { name: 'San Antonio', lat: 29.42, lng: -98.49 },
  { name: 'Charlotte', lat: 35.23, lng: -80.84 },
  { name: 'Sacramento', lat: 38.58, lng: -121.49 },
  { name: 'Pittsburgh', lat: 40.44, lng: -79.99 },
  { name: 'Las Vegas', lat: 36.17, lng: -115.14 },
  { name: 'Austin', lat: 30.27, lng: -97.74 },
  { name: 'Cincinnati', lat: 39.1, lng: -84.51 },
  { name: 'Kansas City', lat: 39.1, lng: -94.58 },
  { name: 'Columbus', lat: 39.96, lng: -83.0 },
  { name: 'Indianapolis', lat: 39.77, lng: -86.16 },
  { name: 'Cleveland', lat: 41.5, lng: -81.69 },
  { name: 'San Jose', lat: 37.34, lng: -121.89 },
  { name: 'Nashville', lat: 36.16, lng: -86.78 },
  { name: 'Virginia Beach', lat: 36.85, lng: -75.98 },
  { name: 'Providence', lat: 41.82, lng: -71.41 },
  { name: 'Jacksonville', lat: 30.33, lng: -81.66 },
  { name: 'Milwaukee', lat: 43.04, lng: -87.91 },
  { name: 'Oklahoma City', lat: 35.47, lng: -97.52 },
  { name: 'Raleigh', lat: 35.78, lng: -78.64 },
  { name: 'Memphis', lat: 35.15, lng: -90.05 },
  { name: 'Richmond', lat: 37.54, lng: -77.44 },
  { name: 'Louisville', lat: 38.25, lng: -85.76 },
  { name: 'New Orleans', lat: 29.95, lng: -90.07 },
  { name: 'Hartford', lat: 41.76, lng: -72.68 },
  { name: 'Buffalo', lat: 42.89, lng: -78.88 },
  { name: 'Birmingham', lat: 33.52, lng: -86.81 },
  { name: 'Salt Lake City', lat: 40.76, lng: -111.89 },
  { name: 'Rochester', lat: 43.16, lng: -77.61 },
  { name: 'Grand Rapids', lat: 42.96, lng: -85.66 },
  { name: 'Tucson', lat: 32.22, lng: -110.97 },
  { name: 'Tulsa', lat: 36.15, lng: -95.99 },
  { name: 'Fresno', lat: 36.74, lng: -119.79 },
  { name: 'Albuquerque', lat: 35.08, lng: -106.65 },
  { name: 'Omaha', lat: 41.26, lng: -95.94 },
  { name: 'Bridgeport', lat: 41.18, lng: -73.19 },
  { name: 'Worcester', lat: 42.26, lng: -71.8 },
  { name: 'Bakersfield', lat: 35.37, lng: -119.02 },
  { name: 'Knoxville', lat: 35.96, lng: -83.92 },
  { name: 'Albany', lat: 42.65, lng: -73.75 },
  { name: 'Greenville', lat: 34.85, lng: -82.4 },
  { name: 'McAllen', lat: 26.2, lng: -98.23 },
  { name: 'El Paso', lat: 31.76, lng: -106.49 },
  { name: 'Baton Rouge', lat: 30.45, lng: -91.15 },
  { name: 'New Haven', lat: 41.31, lng: -72.92 },
  { name: 'Dayton', lat: 39.76, lng: -84.19 },
  { name: 'Columbia', lat: 34.0, lng: -81.03 },
  { name: 'Oxnard', lat: 34.2, lng: -119.18 },
  { name: 'Charleston', lat: 32.78, lng: -79.93 },
  { name: 'Greensboro', lat: 36.07, lng: -79.79 },
  { name: 'Little Rock', lat: 34.75, lng: -92.29 },
  { name: 'Stockton', lat: 37.96, lng: -121.29 },
  { name: 'Cape Coral', lat: 26.56, lng: -81.95 },
  { name: 'Colorado Springs', lat: 38.83, lng: -104.82 },
  { name: 'Syracuse', lat: 43.05, lng: -76.15 },
  { name: 'Akron', lat: 41.08, lng: -81.52 },
  { name: 'Poughkeepsie', lat: 41.7, lng: -73.92 },
  { name: 'Springfield', lat: 42.1, lng: -72.59 },
  { name: 'Winston-Salem', lat: 36.1, lng: -80.24 },
  { name: 'Youngstown', lat: 41.1, lng: -80.65 },
  { name: 'Augusta', lat: 33.47, lng: -81.97 },
  { name: 'Chattanooga', lat: 35.05, lng: -85.31 },
  { name: 'Boise', lat: 43.62, lng: -116.2 },
  { name: 'Des Moines', lat: 41.59, lng: -93.62 },
  { name: 'Lakeland', lat: 28.04, lng: -81.95 },
  { name: 'Durham', lat: 35.99, lng: -78.9 },
  { name: 'Palm Bay', lat: 28.03, lng: -80.59 },
  { name: 'Lancaster', lat: 40.04, lng: -76.31 },
  { name: 'Spokane', lat: 47.66, lng: -117.43 },
  { name: 'Scranton', lat: 41.41, lng: -75.66 },
  { name: 'Harrisburg', lat: 40.27, lng: -76.88 },
  { name: 'Jackson', lat: 32.3, lng: -90.18 },
  { name: 'Toledo', lat: 41.65, lng: -83.54 },
  { name: 'Wichita', lat: 37.69, lng: -97.34 },
  { name: 'Provo', lat: 40.23, lng: -111.66 },
  { name: 'Madison', lat: 43.07, lng: -89.4 },
  { name: 'Sarasota', lat: 27.34, lng: -82.53 },
  { name: 'Modesto', lat: 37.64, lng: -120.99 },
]

// The curated population list above is a guessing/hint-probing convenience,
// not the actual pool of playable rounds — Cities_v2.json is. A target city
// that falls outside the top 100 (e.g. Santa Fe) would otherwise be
// unguessable: the player could be shown its satellite image with no way to
// type it, since CityGuessInput only accepts autocomplete entries. Merging in
// any missing target here, the way islands.ts derives ISLAND_NAMES directly
// from playableIslands, guarantees every playable US city stays guessable
// even as Cities_v2.json changes.
const curatedNames = new Set(CURATED_US_CITIES.map(c => c.name.toLowerCase()))
const missingUsTargets: SuggestionCity[] = (citiesV2Json as CityWithPoints[])
  .filter(c => c.mode === 'us' && !curatedNames.has(c.displayName.toLowerCase()))
  .map(c => ({ name: c.displayName, lat: c.points[0].lat, lng: c.points[0].lng }))

export const US_CITY_COORDS: SuggestionCity[] = [...CURATED_US_CITIES, ...missingUsTargets]
export const US_CITIES: string[] = US_CITY_COORDS.map(c => c.name)
