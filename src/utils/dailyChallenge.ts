import type { City, CityWithPoints, Difficulty } from './mapboxUtils'
import { shuffle, resolveRoundCities } from './roundBuilding'
import { hashStringToSeed, mulberry32 } from './seededRandom'
import { daysBetween, previousDateKey } from './easternDate'
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

// A city drawn on any of the previous N days is excluded from today's draw
// (see getExcludedKeys below), so the same place can't come up two days in a
// row or repeat within the same week.
const LOOKBACK_DAYS = 7

// Picks the day's 5 cities (pre-ordering) plus the rng instance used to do
// it, so the caller can keep threading that same rng into the ordering/point
// steps. `excluded` is a set of canonical keys (see canonicalCityKey) that
// must sit out this draw — passed in rather than computed here so this stays
// a pure function of its arguments and can be reused to replay past days.
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
// coin-flip per slot; tiers proceed easy, medium, hard). Reordering any of
// this changes the outcome for every date that's already been played, so
// don't reorder without a strong reason.
function pickTierCities(
  deduped: CityWithPoints[],
  dateKey: string,
  excluded: Set<string>
): { picked: CityWithPoints[]; rng: () => number } {
  const rng = mulberry32(hashStringToSeed(dateKey))

  const picked: CityWithPoints[] = []
  for (const { difficulty, count } of TIERS) {
    const usPool = shuffle(withoutStarvingPool(deduped.filter(c => c.difficulty === difficulty && c.mode === 'us'), excluded, count), rng)
    const globalPool = shuffle(withoutStarvingPool(deduped.filter(c => c.difficulty === difficulty && c.mode === 'global'), excluded, count), rng)
    let usIndex = 0
    let globalIndex = 0
    for (let i = 0; i < count; i++) {
      const wantsUs = rng() < US_PROBABILITY
      picked.push(wantsUs ? usPool[usIndex++] : globalPool[globalIndex++])
    }
  }

  return { picked, rng }
}

// Filters out recently-used cities, unless doing so would leave fewer
// candidates than this tier+mode pool might need to supply on its own (every
// slot's coin flip could land on the same pool) — in which case we'd rather
// risk a repeat than crash on an undefined pick. With today's pool sizes
// (13+ per tier/mode) this fallback shouldn't trigger, but it's cheap
// insurance against a future where a pool gets small relative to
// LOOKBACK_DAYS.
function withoutStarvingPool(pool: CityWithPoints[], excluded: Set<string>, minNeeded: number): CityWithPoints[] {
  if (excluded.size === 0) return pool
  const filtered = pool.filter(c => !excluded.has(canonicalCityKey(c.name)))
  return filtered.length >= minNeeded ? filtered : pool
}

// dateKey -> canonical keys of the cities drawn that day. Populated lazily
// and iteratively (see ensureDailyKeysCached) as far back as the epoch, so
// each day's exclusion window only ever depends on already-computed days.
const dailyKeysCache = new Map<string, Set<string>>()

// The canonical keys used across the LOOKBACK_DAYS days immediately before
// dateKey. Assumes ensureDailyKeysCached has already been called for at
// least `dateKey`'s predecessor.
function getExcludedKeys(dateKey: string): Set<string> {
  const excluded = new Set<string>()
  let cursor = dateKey
  for (let i = 0; i < LOOKBACK_DAYS; i++) {
    cursor = previousDateKey(cursor)
    const keys = dailyKeysCache.get(cursor)
    if (!keys) break // walked back past the epoch (or past what's cached)
    for (const key of keys) excluded.add(key)
  }
  return excluded
}

// Fills dailyKeysCache for every day from the epoch up to and including
// `upToDateKey` that isn't cached yet. Walks forward (oldest day first) so
// that by the time a given day is computed, every day it might exclude is
// already sitting in the cache — deliberately iterative rather than
// recursive, so this stays cheap and stack-safe no matter how many days the
// challenge has been running.
function ensureDailyKeysCached(deduped: CityWithPoints[], upToDateKey: string): void {
  const missing: string[] = []
  for (
    let d = upToDateKey;
    daysBetween(DAILY_CHALLENGE_EPOCH_DATE_KEY, d) >= 0 && !dailyKeysCache.has(d);
    d = previousDateKey(d)
  ) {
    missing.push(d)
  }

  for (const d of missing.reverse()) {
    const { picked } = pickTierCities(deduped, d, getExcludedKeys(d))
    dailyKeysCache.set(d, new Set(picked.map(c => canonicalCityKey(c.name))))
  }
}

// Builds the day's fixed 5-city set: 2 easy + 2 medium + 1 hard, drawn from
// the deduped us+global pool (minus anything drawn in the previous
// LOOKBACK_DAYS days), deterministic per dateKey so every player gets the
// identical draw.
export function buildDailyChallengeCities(allCities: CityWithPoints[], dateKey: string): City[] {
  const deduped = dedupeCitiesByCanonicalKey(allCities)
  ensureDailyKeysCached(deduped, previousDateKey(dateKey))

  const { picked, rng } = pickTierCities(deduped, dateKey, getExcludedKeys(dateKey))
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
