// Geo math for the wrong-guess directional hint: great-circle distance, flat-map
// direction. Pure trig on WGS84 decimal degrees — no geo library needed at
// "which way is the answer" scale.

export interface LatLng {
  lat: number
  lng: number
}

const EARTH_RADIUS_MI = 3958.8

const toRad = (deg: number) => (deg * Math.PI) / 180

// Haversine great-circle distance in miles (accurate to ~0.5%, which is far
// tighter than the approximate city-center coords being fed in).
export function haversineMiles(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.sqrt(h))
}

// Rhumb-line bearing from `from` toward `to`, in degrees clockwise from north,
// normalized to [0, 360): the direction of a straight line drawn between the
// two points on a flat (Mercator) map. Deliberately not the great-circle
// heading — that's the shortest route over the globe, which on long hops
// points somewhere players don't expect (Great Britain → New Zealand starts
// out heading north over the pole; Sardinia → Tasmania reads as due east).
// Longitude difference is wrapped to ±180° so the arrow takes the shorter way
// round the dateline (Tokyo→Seattle comes out east, not west).
export function rhumbBearingDeg(from: LatLng, to: LatLng): number {
  let dLngDeg = to.lng - from.lng
  if (dLngDeg > 180) dLngDeg -= 360
  if (dLngDeg < -180) dLngDeg += 360
  const dPsi = Math.log(
    Math.tan(Math.PI / 4 + toRad(to.lat) / 2) / Math.tan(Math.PI / 4 + toRad(from.lat) / 2)
  )
  return ((Math.atan2(toRad(dLngDeg), dPsi) * 180) / Math.PI + 360) % 360
}

// Index = compass sector, starting at north, going clockwise in 45° steps.
const ARROWS = ['⬆️', '↗️', '➡️', '↘️', '⬇️', '↙️', '⬅️', '↖️']

// Quantizes a bearing into the eight 45° compass sectors (north spans
// 337.5°–22.5°) and returns the matching arrow emoji.
export function bearingToArrow(bearingDeg: number): string {
  const normalized = ((bearingDeg % 360) + 360) % 360
  return ARROWS[Math.round(normalized / 45) % 8]
}

// The hint line shown after a wrong guess: distance + which way the answer
// lies FROM the guessed city (e.g. "2,445 mi ⬅️ away from Los Angeles" =
// answer is 2,445 miles to the west of that guess). Under 10 miles the
// direction is meaningless noise given approximate city-center coords, so it
// becomes a near-miss bullseye instead.
export function buildDirectionalHint(guess: LatLng, target: LatLng, guessName: string): string {
  const miles = haversineMiles(guess, target)
  if (miles < 10) return `🎯 Less than 10 mi away from ${guessName}`
  return `${Math.round(miles).toLocaleString('en-US')} mi ${bearingToArrow(rhumbBearingDeg(guess, target))} away from ${guessName}`
}
