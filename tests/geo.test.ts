import { describe, expect, it } from 'vitest'
import { bearingToArrow, buildDirectionalHint, haversineMiles, rhumbBearingDeg } from '../src/utils/geo'

const SARDINIA = { lat: 40.1, lng: 9 }
const TASMANIA = { lat: -42, lng: 146.8 }
const GREAT_BRITAIN = { lat: 54, lng: -2 }
const NEW_ZEALAND = { lat: -41, lng: 174 }
const CHICAGO = { lat: 41.9, lng: -87.6 }
const LONDON = { lat: 51.5, lng: -0.1 }
const TOKYO = { lat: 35.68, lng: 139.7 }
const SEATTLE = { lat: 47.6, lng: -122.3 }

describe('haversineMiles', () => {
  it('matches known great-circle distances', () => {
    expect(Math.round(haversineMiles(SARDINIA, TASMANIA))).toBe(10256)
    expect(Math.round(haversineMiles(CHICAGO, LONDON))).toBe(3947)
  })

  it('is 0 for the same point and symmetric', () => {
    expect(haversineMiles(CHICAGO, CHICAGO)).toBe(0)
    expect(haversineMiles(TOKYO, SEATTLE)).toBeCloseTo(haversineMiles(SEATTLE, TOKYO), 9)
  })
})

describe('direction arrow (flat-map / rhumb line)', () => {
  it.each([
    ['Sardinia → Tasmania', SARDINIA, TASMANIA, '↘️'],
    ['Great Britain → New Zealand', GREAT_BRITAIN, NEW_ZEALAND, '↘️'],
    ['Chicago → London', CHICAGO, LONDON, '➡️'],
    ['Tokyo → Seattle (across the dateline)', TOKYO, SEATTLE, '➡️'],
    ['Seattle → Tokyo (across the dateline)', SEATTLE, TOKYO, '⬅️'],
    ['due north', { lat: 0, lng: 10 }, { lat: 20, lng: 10 }, '⬆️'],
    ['due south', { lat: 20, lng: 10 }, { lat: 0, lng: 10 }, '⬇️'],
  ])('%s', (_label, from, to, arrow) => {
    expect(bearingToArrow(rhumbBearingDeg(from, to))).toBe(arrow)
  })

  it('splits the compass into eight 45° sectors centred on each arrow', () => {
    expect(bearingToArrow(0)).toBe('⬆️')
    expect(bearingToArrow(22.4)).toBe('⬆️')
    expect(bearingToArrow(22.6)).toBe('↗️')
    expect(bearingToArrow(90)).toBe('➡️')
    expect(bearingToArrow(337.6)).toBe('⬆️')
    expect(bearingToArrow(-90)).toBe('⬅️')
    expect(bearingToArrow(720 + 180)).toBe('⬇️')
  })
})

describe('buildDirectionalHint', () => {
  it('formats distance, arrow and the guessed name', () => {
    expect(buildDirectionalHint(SARDINIA, TASMANIA, 'Sardinia')).toBe('10,256 mi ↘️ away from Sardinia')
  })

  it('shows a bullseye under 10 miles', () => {
    expect(buildDirectionalHint(CHICAGO, { lat: 41.95, lng: -87.65 }, 'Chicago')).toBe('🎯 Less than 10 mi away from Chicago')
  })
})
