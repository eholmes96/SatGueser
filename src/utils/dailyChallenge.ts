import type { City, CityWithPoints, Difficulty } from './mapboxUtils'
import { shuffle, resolveRoundCities } from './roundBuilding'
import { hashStringToSeed, mulberry32 } from './seededRandom'
import { daysBetween } from './easternDate'
import type { DailyChallengeRecord } from './dailyChallengeStorage'

// Day #1 of the challenge. Puzzle numbers in the share text count forward
// from this date. Adjust if the actual ship date slips.
export const DAILY_CHALLENGE_EPOCH_DATE_KEY = '2026-07-06'

const GLOBAL_TWIN_SUFFIX = '-global'

// Some real-world cities appear twice in Cities_v2.json under different
// modes (e.g. "los-angeles" mode:"us" and "los-angeles-global" mode:"global"
// are the same place, so a global-mode game can also draw it). Stripping the
// suffix collapses both entries to the same key so the daily draw never
// picks the same real city twice.
export function canonicalCityKey(slug: string): string {
  return slug.endsWith(GLOBAL_TWIN_SUFFIX) ? slug.slice(0, -GLOBAL_TWIN_SUFFIX.length) : slug
}

// Single left-to-right scan, keeping only the first-encountered entry per
// canonical key. Dedup happens once, before splitting into per-difficulty
// pools, so a city can't end up categorized differently across two pools.
export function dedupeCitiesByCanonicalKey(cities: CityWithPoints[]): CityWithPoints[] {
  const seen = new Set<string>()
  const result: CityWithPoints[] = []
  for (const city of cities) {
    const key = canonicalCityKey(city.name)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(city)
  }
  return result
}

// Each tier's slot count, in the fixed order slots are filled.
const TIERS: { difficulty: Difficulty; count: number }[] = [
  { difficulty: 'easy', count: 2 },
  { difficulty: 'medium', count: 2 },
  { difficulty: 'hard', count: 1 },
]

// Independent per-slot odds of drawing a US city rather than a non-US
// (global) one — deliberately not tied to how many US vs global cities
// happen to exist in a given difficulty tier's pool.
const US_PROBABILITY = 0.3

// Builds the day's fixed 5-city set: 2 easy + 2 medium + 1 hard, drawn from
// the deduped us+global pool, deterministic per dateKey so every player gets
// the identical draw.
//
// Each slot is filled in two steps: first an independent US_PROBABILITY coin
// flip decides US vs global, then a city is drawn uniformly from that
// tier+mode's pool. This is a per-slot Bernoulli choice, not a guaranteed
// split — a given day could draw anywhere from 0 to 5 US cities, following a
// Binomial(5, 0.3) distribution (expected value 1.5).
//
// Order below is deliberate and load-bearing: a single rng instance, seeded
// from dateKey, is threaded through every shuffle/coin-flip in this exact
// sequence (per tier: shuffle its us pool, shuffle its global pool, then one
// coin-flip per slot; tiers proceed easy, medium, hard; then round order,
// then per-city point selection). Reordering any of this changes the outcome
// for every date that's already been played, so don't reorder without a
// strong reason.
export function buildDailyChallengeCities(allCities: CityWithPoints[], dateKey: string): City[] {
  const rng = mulberry32(hashStringToSeed(dateKey))
  const deduped = dedupeCitiesByCanonicalKey(allCities)

  const picked: CityWithPoints[] = []
  for (const { difficulty, count } of TIERS) {
    const usPool = shuffle(deduped.filter(c => c.difficulty === difficulty && c.mode === 'us'), rng)
    const globalPool = shuffle(deduped.filter(c => c.difficulty === difficulty && c.mode === 'global'), rng)
    let usIndex = 0
    let globalIndex = 0
    for (let i = 0; i < count; i++) {
      const wantsUs = rng() < US_PROBABILITY
      picked.push(wantsUs ? usPool[usIndex++] : globalPool[globalIndex++])
    }
  }

  const ordered = shuffle(picked, rng)
  return resolveRoundCities(ordered, rng)
}

function roundEmoji(elapsedSeconds: number, score: number): string {
  if (score === 0) return '⬛'
  if (elapsedSeconds < 10) return '🟩'
  if (elapsedSeconds < 20) return '🟨'
  return '🟥'
}

const SHARE_URL = 'https://satgueser.app'

export function buildShareText(dateKey: string, record: DailyChallengeRecord, streak: number): string {
  const puzzleNumber = daysBetween(DAILY_CHALLENGE_EPOCH_DATE_KEY, dateKey) + 1
  const lines = [
    `SatGueser Daily #${puzzleNumber} — ${record.totalScore} pts`,
    record.rounds.map(r => roundEmoji(r.elapsedSeconds, r.score)).join(''),
  ]
  if (streak > 1) {
    lines.push(`🔥 ${streak}-day streak`)
  }
  lines.push(SHARE_URL)
  return lines.join('\n')
}
