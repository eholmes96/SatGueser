import { describe, expect, it } from 'vitest'
import { getSuggestions, MAX_SUGGESTIONS, MIN_CHARS } from '../src/utils/suggestionMatching'
import { US_CITIES } from '../src/data/usCities'
import { GLOBAL_CITIES } from '../src/data/globalCities'
import { ISLAND_NAMES } from '../src/utils/islands'
import { AIRPORT_SUGGESTIONS } from '../src/utils/airports'
import { normalize } from '../src/utils/textUtils'

describe('getSuggestions', () => {
  it(`needs at least ${MIN_CHARS} characters and returns at most ${MAX_SUGGESTIONS}`, () => {
    expect(getSuggestions('Sa', US_CITIES)).toEqual([])
    expect(getSuggestions('san', US_CITIES).length).toBeLessThanOrEqual(MAX_SUGGESTIONS)
  })

  it('puts prefix matches before substring matches', () => {
    const results = getSuggestions('york', GLOBAL_CITIES)
    expect(results.every(r => normalize(r).includes('york'))).toBe(true)
    const pool = ['New York', 'Yorkshire', 'Yorktown']
    expect(getSuggestions('york', pool)).toEqual(['Yorkshire', 'Yorktown', 'New York'])
  })

  it('ignores accents and case', () => {
    expect(getSuggestions('SAO PAULO', GLOBAL_CITIES)).toContain('São Paulo, Brazil')
  })

  it('ranks an airport by IATA code, then city, then airport name', () => {
    expect(getSuggestions('ord', AIRPORT_SUGGESTIONS)[0]).toMatch(/\(ORD\)$/)
    expect(getSuggestions('lhr', AIRPORT_SUGGESTIONS)[0]).toMatch(/\(LHR\)$/)
    const pool = [
      { display: 'by airport name', fields: [{ value: 'AAA', tier: 0 }, { value: 'Elsewhere', tier: 1 }, { value: 'Dallas Love', tier: 2 }] },
      { display: 'by city', fields: [{ value: 'BBB', tier: 0 }, { value: 'Dallas', tier: 1 }, { value: 'Field', tier: 2 }] },
      { display: 'by code', fields: [{ value: 'DAL', tier: 0 }, { value: 'Nowhere', tier: 1 }, { value: 'Field', tier: 2 }] },
    ]
    expect(getSuggestions('dal', pool)).toEqual(['by code', 'by city', 'by airport name'])
  })

  it('returns the same results as before for a fixed set of queries (golden file)', async () => {
    const queries = ['san', 'new', 'por', 'sai', 'st.', 'lon', 'par', 'isl', 'gre', 'mad', 'chi', 'int', 'jfk', 'kef', 'são', 'bay', 'cit']
    const pools = { us: US_CITIES, global: GLOBAL_CITIES, islands: ISLAND_NAMES, airports: AIRPORT_SUGGESTIONS }
    const results = Object.fromEntries(
      Object.entries(pools).map(([mode, pool]) => [mode, Object.fromEntries(queries.map(q => [q, getSuggestions(q, pool)]))])
    )
    await expect(JSON.stringify(results, null, 1) + '\n').toMatchFileSnapshot('./__golden__/suggestions.json')
  })
})
