import { previousDateKey } from './easternDate'
import type { Difficulty } from './mapboxUtils'

const STORAGE_KEY = 'satgueser.dailyChallenge.v1'

export interface DailyRoundResult {
  cityName: string
  displayName: string
  difficulty: Difficulty
  score: number
  elapsedSeconds: number
  // Wrong guesses this round (see WRONG_GUESS_PENALTY_SECONDS). Optional:
  // records saved before the penalty existed don't have it.
  wrongGuesses?: number
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

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/

function isValidRecord(r: unknown): r is DailyChallengeRecord {
  if (!r || typeof r !== 'object') return false
  const rec = r as Record<string, unknown>
  return typeof rec.dateKey === 'string' && DATE_KEY_RE.test(rec.dateKey) &&
    typeof rec.totalScore === 'number' && Number.isFinite(rec.totalScore) &&
    Array.isArray(rec.rounds)
}

function isValidStorage(p: unknown): p is DailyChallengeStorage {
  if (!p || typeof p !== 'object') return false
  const s = p as Record<string, unknown>
  if (s.version !== 1) return false
  if (typeof s.streak !== 'number' || !Number.isInteger(s.streak) || s.streak < 0) return false
  return s.lastCompleted === undefined || isValidRecord(s.lastCompleted)
}

// Reads and validates whatever's in localStorage. Anything missing, corrupt,
// from a future/incompatible schema version, or the wrong shape falls back to
// an empty record rather than throwing — this is best-effort client state,
// not a source of truth that needs to fail loudly.
export function getDailyChallengeStorage(): DailyChallengeStorage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_STORAGE
    const parsed = JSON.parse(raw)
    return isValidStorage(parsed) ? parsed : EMPTY_STORAGE
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
