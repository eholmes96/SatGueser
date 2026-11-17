import type { Difficulty } from './mapboxUtils'
import { DIFFICULTY_SCORE_MULTIPLIER } from './difficultyConfig'

// Framework-agnostic scoring math, shared between the client (useGameState)
// and the server-side daily-submit function (a Vercel Node function bundled by
// esbuild from functions-src/ via scripts/build-api.mjs) so both compute an
// identical score for the same inputs. Keep this file free of React/Vite-only
// imports — it is bundled into that function as-is.

// A round lasts this many seconds; the satellite view fully zooms out and the
// timer expires at ROUND_DURATION. Elapsed time is clamped to this before
// scoring, so a correct-but-slow guess still floors at a positive score while
// a full timeout makes scoreRound return 0.
export const ROUND_DURATION = 30

// Base time-based score for a correct guess: 1000 at 0s elapsed, dropping ~30
// points per second (rounded to the nearest 10), never below 0.
export function calculateScore(elapsedSeconds: number): number {
  return Math.max(0, Math.round((1000 - elapsedSeconds * 30) / 10) * 10)
}

// Each wrong guess pushes the round's *score* clock forward by this much (the
// zoom keeps running on true time). 10/3s is exactly 100 points at
// calculateScore's 30 pts/s, so a wrong guess costs 100 × the multiplier.
export const WRONG_GUESS_PENALTY_SECONDS = 10 / 3

// Full per-round score including the difficulty multiplier (easy 1x / medium
// 2x / hard 3x / extreme 4x) and the wrong-guess penalty. This is the exact
// value submitGuess stores and the daily-submit function re-derives when
// validating a daily submission. Returns 0 for a timeout — the true clock
// reaching ROUND_DURATION, or penalties running the score clock out first —
// and a correct guess always scores at least 100 × multiplier, so 0 ⇔ timed out.
export function scoreRound(elapsedSeconds: number, difficulty: Difficulty, wrongGuesses = 0): number {
  // Out-of-range input can't be scored: a non-finite time is treated as a
  // timeout, and wrongGuesses is coerced to a non-negative whole number.
  if (!Number.isFinite(elapsedSeconds)) return 0
  const wrong = Math.max(0, Math.floor(wrongGuesses) || 0)
  const clamped = Math.min(Math.max(elapsedSeconds, 0), ROUND_DURATION)
  const scoreClock = clamped + wrong * WRONG_GUESS_PENALTY_SECONDS
  if (clamped >= ROUND_DURATION || scoreClock >= ROUND_DURATION) return 0
  return calculateScore(scoreClock) * DIFFICULTY_SCORE_MULTIPLIER[difficulty]
}
