import type { Difficulty, GameMode } from './mapboxUtils'

// Personal best score per mode + difficulty, kept in localStorage so it works
// for guests and shows instantly at game over (independent of the Supabase
// game_results history). Daily Challenge has no difficulty picker (one fixed
// set per day), so it keys on just 'daily'; every other mode keys on
// `${mode}-${difficulty}`, giving Easy/Medium/Hard their own independent bests.

const STORAGE_KEY = 'satgueser.highScores'

export function highScoreKey(mode: GameMode, difficulty: Difficulty | null): string {
  return mode === 'daily' || !difficulty ? mode : `${mode}-${difficulty}`
}

function readAll(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, number>) : {}
  } catch {
    return {}
  }
}

export function getHighScore(key: string): number {
  return readAll()[key] ?? 0
}

// Records a finished game's score, returning true iff it's a NEW personal best
// for that key (strictly greater than the prior best) — in which case the best
// is persisted. A first-ever game beats the default 0, so any positive first
// score counts; a 0 never beats 0, so an all-wrong game never celebrates.
export function recordHighScore(key: string, score: number): boolean {
  const all = readAll()
  const prev = all[key] ?? 0
  if (score <= prev) return false
  all[key] = score
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    // Ignore write failures (private mode, quota) — worst case the banner shows
    // again next time, which is harmless.
  }
  return true
}
