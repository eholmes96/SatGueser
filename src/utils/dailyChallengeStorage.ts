import { previousDateKey } from './easternDate'
import type { Difficulty } from './mapboxUtils'

const STORAGE_KEY = 'satgueser.dailyChallenge.v1'

export interface DailyRoundResult {
  cityName: string
  displayName: string
  difficulty: Difficulty
  score: number
  elapsedSeconds: number
}

export interface DailyChallengeRecord {
  dateKey: string
  totalScore: number
  rounds: DailyRoundResult[]
}

export interface DailyChallengeStorage {
  version: 1
  lastCompleted?: DailyChallengeRecord
  streak: number
}

const EMPTY_STORAGE: DailyChallengeStorage = { version: 1, streak: 0 }

// Reads and validates whatever's in localStorage. Anything missing, corrupt,
// or from a future/incompatible schema version falls back to an empty
// record rather than throwing — this is best-effort client state, not a
// source of truth that needs to fail loudly.
export function getDailyChallengeStorage(): DailyChallengeStorage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_STORAGE
    const parsed = JSON.parse(raw)
    if (parsed?.version !== 1) return EMPTY_STORAGE
    return parsed as DailyChallengeStorage
  } catch {
    return EMPTY_STORAGE
  }
}

function setDailyChallengeStorage(storage: DailyChallengeStorage): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(storage))
}

// Wipes today's completion (and the streak) so the Daily Challenge can be
// replayed. Dev/testing tool only — never called from the game itself.
export function resetDailyChallengeStorage(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function getTodayStatus(todayKey: string): { completed: boolean; record?: DailyChallengeRecord } {
  const storage = getDailyChallengeStorage()
  const completed = storage.lastCompleted?.dateKey === todayKey
  return { completed, record: completed ? storage.lastCompleted : undefined }
}

// Persists a finished daily run and updates the streak. Idempotent against
// being called twice for the same day (guards against React StrictMode's
// double-invoked dev effects re-triggering the completion effect).
export function recordCompletion(
  todayKey: string,
  result: { totalScore: number; rounds: DailyRoundResult[] }
): DailyChallengeStorage {
  const storage = getDailyChallengeStorage()
  if (storage.lastCompleted?.dateKey === todayKey) {
    return storage
  }

  const wasConsecutive = storage.lastCompleted?.dateKey === previousDateKey(todayKey)
  const nextStreak = wasConsecutive ? storage.streak + 1 : 1

  const updated: DailyChallengeStorage = {
    version: 1,
    lastCompleted: { dateKey: todayKey, ...result },
    streak: nextStreak,
  }
  setDailyChallengeStorage(updated)
  return updated
}
