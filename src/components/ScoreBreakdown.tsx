import type { Difficulty } from '../utils/mapboxUtils'
import { DIFFICULTY_CONFIG, DIFFICULTY_SCORE_MULTIPLIER } from '../utils/difficultyConfig'

export interface ScoreBreakdownRow {
  // Stable React key (the city's internal name).
  key: string
  displayName: string
  difficulty: Difficulty
  // Seconds to a correct guess; ignored for timed-out (score 0) rounds.
  elapsedSeconds: number | undefined
  wrongGuesses: number
  score: number
}

interface ScoreBreakdownProps {
  rows: ScoreBreakdownRow[]
  // Show each round's difficulty label (Daily mixes tiers; other modes are one tier).
  showDifficulty: boolean
  // Show the ×N difficulty multiplier tag next to a scored round's points.
  showMultiplier: boolean
  // Width of the score column. Daily mixes ×1/×2/×3 rows, so its fixed width
  // keeps the columns to its left aligned.
  scoreMinWidth: number
}

// Per-round result rows shared by the game-over card and the Daily recap card.
// The two cards differ slightly (multiplier tag, score column width), which the
// props above preserve exactly.
export function ScoreBreakdown({ rows, showDifficulty, showMultiplier, scoreMinWidth }: ScoreBreakdownProps) {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      {rows.map((row, i) => {
        const timedOut = row.score === 0
        const cfg = DIFFICULTY_CONFIG[row.difficulty]
        const multiplier = DIFFICULTY_SCORE_MULTIPLIER[row.difficulty]
        return (
          <div key={row.key} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.4rem 0',
            borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
          }}>
            <span style={{ flex: 1, color: '#eee', fontSize: 15, fontWeight: 500 }}>
              {row.displayName}
            </span>
            {showDifficulty && (
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                minWidth: 46,
                textAlign: 'right',
                color: cfg.accent,
              }}>
                {cfg.label}
              </span>
            )}
            <span style={{ color: '#888', fontSize: 13, minWidth: 40, textAlign: 'right' }}>
              {timedOut ? '—' : `${row.elapsedSeconds?.toFixed(1)}s`}
            </span>
            <span data-testid="wrong-guesses" style={{ color: '#f87171', fontSize: 13, fontWeight: 600, minWidth: 24, textAlign: 'right' }}>
              {row.wrongGuesses === 0 ? '0' : `-${row.wrongGuesses}`}
            </span>
            <span style={{
              fontSize: 13,
              fontWeight: 600,
              minWidth: scoreMinWidth,
              textAlign: 'right',
              color: timedOut ? '#f87171' : '#4ade80',
            }}>
              {timedOut ? '0' : `+${row.score}`}
              {showMultiplier && !timedOut && multiplier > 1 && (
                <span style={{ fontSize: 11, fontWeight: 600, color: '#888', marginLeft: '0.3rem' }}>
                  ×{multiplier}
                </span>
              )}
            </span>
          </div>
        )
      })}
    </div>
  )
}
