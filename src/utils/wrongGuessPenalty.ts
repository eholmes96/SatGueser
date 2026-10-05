import type { GameMode } from './mapboxUtils'

// Kept out of scoring.ts so the submit-daily server bundle (which imports
// scoring.ts) doesn't carry it — Daily has no wrong-guess penalty.

// Each wrong guess pushes the round's *score* clock forward by this much (the
// zoom keeps running on true time). 10/3s is exactly 100 points at
// calculateScore's 30 pts/s, so a wrong guess costs 100 × the multiplier. If
// true time plus penalties reaches ROUND_DURATION the round ends as a timeout.
export const WRONG_GUESS_PENALTY_SECONDS = 10 / 3

// Islands-only while the penalty is being trialled. Daily must stay off this
// list unless the server-side re-derivation in submit-daily learns about it.
export function hasWrongGuessPenalty(mode: GameMode | null): boolean {
  return mode === 'islands'
}
