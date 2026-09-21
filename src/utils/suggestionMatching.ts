import { normalize } from './textUtils'

// A single searchable field on a suggestion entry, e.g. an airport's IATA
// code, city, or airport name. Lower tier = higher priority.
export interface SuggestionField {
  value: string
  tier: number
}

// A suggestion candidate: the string shown/accepted in the UI (`display`),
// matched against one or more prioritized `fields`.
export interface SuggestionEntry {
  display: string
  fields: SuggestionField[]
}

// Existing callers (US Cities, Global, Islands, Daily) pass a flat array of
// plain strings — no tiers, just one implicit field per entry. Newer callers
// (Airports) pass fully-shaped entries with multiple prioritized fields.
export type SuggestionPool = string[] | SuggestionEntry[]

export const MIN_CHARS = 3
export const MAX_SUGGESTIONS = 8

function toEntry(item: string | SuggestionEntry): SuggestionEntry {
  return typeof item === 'string'
    ? { display: item, fields: [{ value: item, tier: 0 }] }
    : item
}

// 0 = prefix match (best), 1 = substring match, null = no match at all.
function matchType(fieldValue: string, normalizedQuery: string): 0 | 1 | null {
  const v = normalize(fieldValue)
  if (v.startsWith(normalizedQuery)) return 0
  if (v.includes(normalizedQuery)) return 1
  return null
}

// Ranks pool entries against `query` and returns their display strings,
// best matches first, capped at MAX_SUGGESTIONS.
//
// Each entry is reduced to its single best-matching field: a prefix match
// beats a substring match outright; among fields of the same match-type, the
// lower tier number wins. That field's (tier, matchType) is then folded into
// one bucket key — (tier * 2) + (0 for prefix, 1 for substring) — so
// tier-0-prefix sorts before tier-0-substring, before tier-1-prefix, and so
// on. Every entry lands in exactly one bucket; buckets are concatenated in
// ascending key order, each preserving the pool's insertion order.
//
// Plain strings (or single-field, tier-0 entries) only ever produce keys 0
// (prefix) or 1 (substring) — i.e. today's "prefix matches, then substring
// matches" behavior, unchanged.
export function getSuggestions(query: string, pool: SuggestionPool): string[] {
  if (query.length < MIN_CHARS) return []
  const q = normalize(query)

  const buckets = new Map<number, string[]>()

  for (const item of pool) {
    const entry = toEntry(item)

    let bestType: 0 | 1 | null = null
    let bestTier = Infinity
    for (const field of entry.fields) {
      const type = matchType(field.value, q)
      if (type === null) continue
      if (bestType === null || type < bestType || (type === bestType && field.tier < bestTier)) {
        bestType = type
        bestTier = field.tier
      }
    }
    if (bestType === null) continue

    const key = bestTier * 2 + bestType
    const bucket = buckets.get(key)
    if (bucket) bucket.push(entry.display)
    else buckets.set(key, [entry.display])
  }

  const result: string[] = []
  for (const key of [...buckets.keys()].sort((a, b) => a - b)) {
    result.push(...buckets.get(key)!)
  }
  return result.slice(0, MAX_SUGGESTIONS)
}
