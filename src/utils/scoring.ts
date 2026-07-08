import type { Difficulty } from './mapboxUtils'
import { DIFFICULTY_SCORE_MULTIPLIER } from './difficultyConfig'

// Framework-agnostic scoring math, shared between the client (useGameState)
// and the server-side daily-submit Edge Function so both compute an identical
// score for the same inputs. Keep this file free of React/Vite-only imports —
// it must run unchanged under Deno.

// A round lasts this many seconds; the satellite view fully zooms out and the
// timer expires at ROUND_DURATION. Elapsed time is clamped to this before
// scoring, so a correct-but-slow guess still floors at a positive score while
// a full timeout is scored 0 separately by the caller.
export const ROUND_DURATION = 30

// Base time-based score for a correct guess: 1000 at 0s elapsed, dropping ~30
// points per second (rounded to the nearest 10), never below 0.
export function calculateScore(elapsedSeconds: number): number {
  return Math.max(0, Math.round((1000 - elapsedSeconds * 30) / 10) * 10)
}

// Full per-round score including the difficulty multiplier (easy 1x / medium
// 2x / hard 3x). This is the exact value submitGuess stores and the Edge
// Function re-derives when validating a daily submission.
export function scoreRound(elapsedSeconds: number, difficulty: Difficulty): number {
  const clamped = Math.min(Math.max(elapsedSeconds, 0), ROUND_DURATION)
  return calculateScore(clamped) * DIFFICULTY_SCORE_MULTIPLIER[difficulty]
}
