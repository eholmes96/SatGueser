import type { Difficulty } from '../utils/mapboxUtils'
import { DIFFICULTY_CONFIG } from '../utils/difficultyConfig'

// Small outlined difficulty tag. 'sm' sits in the in-round top bar, 'md'
// beside the game-over title.
const SIZES = {
  sm: { fontSize: 10, padding: '1px 5px' },
  md: { fontSize: 11, padding: '2px 6px' },
}

export function DifficultyBadge({ difficulty, size }: { difficulty: Difficulty; size: keyof typeof SIZES }) {
  const cfg = DIFFICULTY_CONFIG[difficulty]
  return (
    <span style={{
      ...SIZES[size],
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: cfg.accent,
      border: `1px solid ${cfg.border}`,
      borderRadius: 4,
    }}>
      {cfg.label}
    </span>
  )
}
