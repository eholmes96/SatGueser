// Deterministic PRNG utilities, used so the daily challenge draws the exact
// same cities for every player on a given day without any server involved —
// the "randomness" is a pure function of the date string.

// FNV-1a 32-bit hash — turns an arbitrary string (a date key, e.g.
// "2026-07-06") into a uint32 seed for mulberry32 below.
export function hashStringToSeed(str: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

// mulberry32: a small, fast seeded PRNG. Returns a function with the same
// [0, 1) contract as Math.random, so it drops directly into shuffle()'s
// injectable rng parameter (see utils/roundBuilding.ts).
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
