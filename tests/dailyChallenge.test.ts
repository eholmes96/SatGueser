import { describe, expect, it } from 'vitest'
import citiesV2Json from '../src/Cities_v2.json'
import type { CityWithPoints, Difficulty } from '../src/utils/mapboxUtils'
import { buildDailyChallengeCities, buildShareText, canonicalCityKey, DAILY_CHALLENGE_EPOCH_DATE_KEY } from '../src/utils/dailyChallenge'
import { daysBetween, previousDateKey } from '../src/utils/easternDate'

const allCities = citiesV2Json as CityWithPoints[]

// Every date from launch to mid-2027. The client and /api/submit-daily both
// rebuild the day from this function, so any change to its output is a
// change to which cities a day has (and to how the server scores it).
function dateRange(from: string, to: string): string[] {
  const out: string[] = []
  for (let d = to; daysBetween(from, d) >= 0; d = previousDateKey(d)) out.push(d)
  return out.reverse()
}
const DATES = dateRange(DAILY_CHALLENGE_EPOCH_DATE_KEY, '2027-06-30')

const describeDay = (dateKey: string) =>
  buildDailyChallengeCities(allCities, dateKey).map(c => `${c.name} ${c.difficulty} ${c.lat},${c.lng}`)

describe('buildDailyChallengeCities', () => {
  it('produces the same picks for every date as before (golden file)', async () => {
    const picks = Object.fromEntries(DATES.map(d => [d, describeDay(d)]))
    await expect(JSON.stringify(picks, null, 1) + '\n').toMatchFileSnapshot('./__golden__/daily-picks.json')
  })

  it('is deterministic for a given date', () => {
    expect(describeDay('2026-11-17')).toEqual(describeDay('2026-11-17'))
  })

  it('always draws 2 easy, 2 medium and 1 hard, with no city twice', () => {
    for (const d of DATES) {
      const day = buildDailyChallengeCities(allCities, d)
      expect(day).toHaveLength(5)
      const counts = day.reduce<Record<string, number>>((acc, c) => ({ ...acc, [c.difficulty]: (acc[c.difficulty] ?? 0) + 1 }), {})
      expect(counts).toEqual({ easy: 2, medium: 2, hard: 1 })
      expect(new Set(day.map(c => canonicalCityKey(c.name))).size).toBe(5)
    }
  })

  it('never repeats a city from the previous 7 days', () => {
    const keysByDay = new Map(DATES.map(d => [d, buildDailyChallengeCities(allCities, d).map(c => canonicalCityKey(c.name))]))
    for (let i = 0; i < DATES.length; i++) {
      const recent = new Set(DATES.slice(Math.max(0, i - 7), i).flatMap(d => keysByDay.get(d)!))
      for (const key of keysByDay.get(DATES[i])!) expect(recent.has(key), `${DATES[i]} repeats ${key}`).toBe(false)
    }
  })

  it('only draws US and Global cities', () => {
    for (const d of DATES.slice(0, 60)) {
      for (const c of buildDailyChallengeCities(allCities, d)) expect(['us', 'global']).toContain(c.mode)
    }
  })
})

describe('buildShareText', () => {
  const round = (score: number, elapsedSeconds: number, wrongGuesses?: number, difficulty: Difficulty = 'easy') =>
    ({ cityName: 'x', displayName: 'X', difficulty, score, elapsedSeconds, wrongGuesses })

  it('numbers the puzzle from the epoch and colours squares by the score clock', () => {
    const record = {
      dateKey: '2026-10-05',
      totalScore: 6040,
      rounds: [round(700, 3.42, 2), round(930, 2.49, 0), round(0, 9.0, 7), round(1620, 3.0, 1, 'medium'), round(2790, 2.47)],
    }
    expect(buildShareText('2026-10-05', record, 1)).toBe(
      'SatGueser Daily #92 — 6040 pts\n🟨🟩⬛🟩🟩\nhttps://satgueser.app'
    )
  })

  it('adds the streak line only for streaks longer than one day', () => {
    const record = { dateKey: '2026-07-06', totalScore: 100, rounds: [round(100, 25)] }
    expect(buildShareText('2026-07-06', record, 3)).toBe('SatGueser Daily #1 — 100 pts\n🟥\n🔥 3-day streak\nhttps://satgueser.app')
  })
})
