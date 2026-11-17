import type { DailyChallengeRecord } from '../utils/dailyChallengeStorage'
import { ScoreBreakdown } from './ScoreBreakdown'
import { secondaryButtonStyle } from './buttonStyles'

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

      {/* No ×N tag and a narrower score column than the game-over card. */}
      <ScoreBreakdown
        rows={record.rounds.map(round => ({
          key: round.cityName,
          displayName: round.displayName,
          difficulty: round.difficulty,
          elapsedSeconds: round.elapsedSeconds,
          wrongGuesses: round.wrongGuesses ?? 0,
          score: round.score,
        }))}
        showDifficulty
        showMultiplier={false}
        scoreMinWidth={52}
      />

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

      <button onClick={onCopy} style={secondaryButtonStyle}>
        {copied ? 'Copied!' : 'Copy Result'}
      </button>
    </div>
  )
}
