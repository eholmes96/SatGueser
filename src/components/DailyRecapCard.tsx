import type { DailyChallengeRecord } from '../utils/dailyChallengeStorage'
import { DIFFICULTY_CONFIG } from '../utils/difficultyConfig'

const btnStyle: React.CSSProperties = {
  padding: '0.55rem 1.5rem',
  fontSize: 15,
  fontWeight: 600,
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.3)',
  background: 'rgba(255,255,255,0.15)',
  color: '#fff',
  cursor: 'pointer',
}

interface DailyRecapCardProps {
  record: DailyChallengeRecord
  streak: number
  onCopy: () => void
  copied: boolean
}

// Read-only summary shown when the player selects Daily Challenge after
// already completing today's run — mirrors the game-over card's container
// and per-round row styling (see App.tsx's gameOver overlay).
export function DailyRecapCard({ record, streak, onCopy, copied }: DailyRecapCardProps) {
  return (
    <div style={{
      background: 'rgba(10,10,10,0.85)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderRadius: 20,
      padding: '2rem 2.5rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1rem',
      minWidth: 340,
    }}>
      <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>
        Today's Challenge
      </h2>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {record.rounds.map((round, i) => {
          const timedOut = round.score === 0
          return (
            <div key={round.cityName} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.4rem 0',
              borderBottom: i < record.rounds.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
            }}>
              <span style={{ flex: 1, color: '#eee', fontSize: 15, fontWeight: 500 }}>
                {round.displayName}
              </span>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                minWidth: 46,
                textAlign: 'right',
                color: DIFFICULTY_CONFIG[round.difficulty].accent,
              }}>
                {DIFFICULTY_CONFIG[round.difficulty].label}
              </span>
              <span style={{ color: '#888', fontSize: 13, minWidth: 40, textAlign: 'right' }}>
                {timedOut ? '—' : `${round.elapsedSeconds.toFixed(1)}s`}
              </span>
              <span style={{
                fontSize: 13,
                fontWeight: 600,
                minWidth: 52,
                textAlign: 'right',
                color: timedOut ? '#f87171' : '#4ade80',
              }}>
                {timedOut ? '0' : `+${round.score}`}
              </span>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        <span style={{ color: '#888', fontSize: 13 }}>Total</span>
        <span style={{ color: '#fff', fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
          {record.totalScore}
        </span>
        <span style={{ color: '#888', fontSize: 13 }}>pts</span>
      </div>

      {streak > 1 && (
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#f59e0b' }}>
          🔥 {streak}-day streak
        </p>
      )}

      <p style={{ margin: 0, fontSize: 12, color: '#888' }}>
        Come back tomorrow for a new challenge.
      </p>

      <button onClick={onCopy} style={btnStyle}>
        {copied ? 'Copied!' : 'Copy Result'}
      </button>
    </div>
  )
}
