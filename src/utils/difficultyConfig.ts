import type { Difficulty, GameMode, Mode } from './mapboxUtils'

// Shared between the difficulty-tile picker (App.tsx) and any other UI that
// needs to label/color a difficulty (e.g. DailyRecapCard's per-round column).
export const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; desc: string; accent: string; bg: string; border: string }> = {
  easy:   { label: 'Easy',   desc: 'Iconic grids & coastlines',    accent: '#4ade80', bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.35)'  },
  medium: { label: 'Medium', desc: 'Familiar but less obvious',    accent: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.35)' },
  hard:   { label: 'Hard',   desc: 'Good luck',                    accent: '#f87171', bg: 'rgba(248,113,113,0.08)',border: 'rgba(248,113,113,0.35)' },
}

// Only "Easy" needs mode-specific wording — Islands and Airports don't have
// "grids & coastlines" the way US/Global/Daily cities do. Medium/Hard stay
// one shared string across every mode.
const EASY_DESC_OVERRIDE: Partial<Record<Mode, string>> = {
  islands: 'Islands that would be on a middle school geography test',
  airports: 'The busiest destinations in the world',
}

export function getDifficultyDesc(difficulty: Difficulty, mode: GameMode): string {
  if (difficulty === 'easy' && mode in EASY_DESC_OVERRIDE) {
    return EASY_DESC_OVERRIDE[mode as Mode]!
  }
  return DIFFICULTY_CONFIG[difficulty].desc
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
