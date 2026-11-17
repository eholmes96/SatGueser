import { describe, expect, it } from 'vitest'
import citiesV2Json from '../src/Cities_v2.json'
import airportsJson from '../src/data/airports.json'
import busiestExtraJson from '../src/data/busiestAirportsExtra.json'
import type { CityWithPoints, Mode } from '../src/utils/mapboxUtils'
import { US_CITIES } from '../src/data/usCities'
import { GLOBAL_CITIES } from '../src/data/globalCities'
import { playableIslands, ISLAND_NAMES } from '../src/utils/islands'
import { playableAirports, AIRPORT_SUGGESTIONS } from '../src/utils/airports'
import { getDifficulties } from '../src/utils/difficultyConfig'
import { getGuessCoords } from '../src/utils/guessCoords'
import { getSuggestions } from '../src/utils/suggestionMatching'
import { normalize } from '../src/utils/textUtils'
import { ROUNDS_PER_GAME } from '../src/hooks/useGameState'

const cities = citiesV2Json as CityWithPoints[]
const POOLS: Record<Mode, CityWithPoints[]> = {
  us: cities.filter(c => c.mode === 'us'),
  global: cities.filter(c => c.mode === 'global'),
  islands: playableIslands,
  airports: playableAirports,
}
const AUTOCOMPLETE: Record<Mode, string[]> = {
  us: US_CITIES,
  global: GLOBAL_CITIES,
  islands: ISLAND_NAMES,
  airports: AIRPORT_SUGGESTIONS.map(e => e.display),
}
const MODES = Object.keys(POOLS) as Mode[]

describe.each(MODES)('%s dataset', mode => {
  const pool = POOLS[mode]

  it(`has at least ${ROUNDS_PER_GAME} entries in every tier the mode offers, and nothing outside them`, () => {
    const tiers = getDifficulties(mode)
    for (const tier of tiers) {
      expect(pool.filter(c => c.difficulty === tier).length, `${mode} ${tier}`).toBeGreaterThanOrEqual(ROUNDS_PER_GAME)
    }
    for (const c of pool) expect(tiers, c.name).toContain(c.difficulty)
  })

  it('has unique names and display names', () => {
    expect(new Set(pool.map(c => c.name)).size).toBe(pool.length)
    expect(new Set(pool.map(c => normalize(c.displayName))).size).toBe(pool.length)
  })

  it('has at least one point per entry, all with valid coordinates', () => {
    for (const c of pool) {
      expect(c.points.length, c.name).toBeGreaterThan(0)
      for (const p of c.points) {
        expect(Math.abs(p.lat), c.name).toBeLessThanOrEqual(90)
        expect(Math.abs(p.lng), c.name).toBeLessThanOrEqual(180)
      }
    }
  })

  it('lets every answer be typed and picked from autocomplete', () => {
    const suggestions = mode === 'airports' ? AIRPORT_SUGGESTIONS : AUTOCOMPLETE[mode]
    for (const c of pool) {
      expect(AUTOCOMPLETE[mode], c.displayName).toContain(c.displayName)
      const typed = mode === 'airports' ? c.displayName.match(/\(([A-Z]{3})\)$/)![1] : c.displayName
      expect(getSuggestions(typed, suggestions), c.displayName).toContain(c.displayName)
    }
  })

  it('has coordinates for every autocomplete entry (for the wrong-guess hint)', () => {
    for (const name of AUTOCOMPLETE[mode]) expect(getGuessCoords(name), name).not.toBeNull()
  })
})

describe('islands and airports', () => {
  it('carry two hints and a sensible zoom range', () => {
    for (const c of [...playableIslands, ...playableAirports]) {
      expect(c.hints, c.name).toHaveLength(2)
      expect(c.startZoom!, c.name).toBeGreaterThan(c.endZoom!)
    }
  })
})

describe('airports', () => {
  const airports = airportsJson as { name: string; iata: string; city: string; airportName: string; displayName: string }[]

  it('follow the naming convention', () => {
    for (const a of airports) {
      expect(a.iata, a.name).toMatch(/^[A-Z]{3}$/)
      expect(a.name).toBe(a.iata.toLowerCase())
      expect(a.displayName).toBe(`${a.city} ${a.airportName} (${a.iata})`)
    }
  })

  it('never list the same IATA code twice in the autocomplete', () => {
    const codes = AIRPORT_SUGGESTIONS.map(e => e.display.match(/\(([A-Z]{3})\)$/)![1])
    expect(new Set(codes).size).toBe(codes.length)
    expect(busiestExtraJson.length).toBeGreaterThan(0)
  })
})
