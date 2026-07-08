import type { Difficulty } from './mapboxUtils'

// Shared between the difficulty-tile picker (App.tsx) and any other UI that
// needs to label/color a difficulty (e.g. DailyRecapCard's per-round column).
export const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; desc: string; accent: string; bg: string; border: string }> = {
  easy:   { label: 'Easy',   desc: 'Iconic coastlines & skylines', accent: '#4ade80', bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.35)'  },
  medium: { label: 'Medium', desc: 'Familiar but less obvious',    accent: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.35)' },
  hard:   { label: 'Hard',   desc: 'Good luck',                    accent: '#f87171', bg: 'rgba(248,113,113,0.08)',border: 'rgba(248,113,113,0.35)' },
}

// Harder rounds are worth more, in every mode: the base time-based score (see
// useGameState.ts's calculateScore) is multiplied by the round's own city
// difficulty, whether that's the single tier picked for a US/Global game or
// the per-round tier baked into a Daily Challenge's mixed 2/2/1 set.
export const DIFFICULTY_SCORE_MULTIPLIER: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
}
