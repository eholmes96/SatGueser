import { useState, useEffect, useRef } from 'react'
import { useGameState } from './hooks/useGameState'
import type { Difficulty } from './hooks/useGameState'
import { MapReveal } from './components/MapReveal'
import { CityGuessInput } from './components/CityGuessInput'
import './App.css'

type TitleMode = 'idle' | 'difficulty' | 'hiding' | 'gone'

const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; desc: string; accent: string; bg: string; border: string }> = {
  easy:   { label: 'Easy',   desc: 'Iconic coastlines & skylines', accent: '#4ade80', bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.35)'  },
  medium: { label: 'Medium', desc: 'Familiar but less obvious',    accent: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.35)' },
  hard:   { label: 'Hard',   desc: 'Good luck',                    accent: '#f87171', bg: 'rgba(248,113,113,0.08)',border: 'rgba(248,113,113,0.35)' },
}

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

function App() {
  const { state, startGame, startTimer, selectDifficulty, submitGuess, nextRound } = useGameState()
  const activeCity = state.cities[state.activeCityIndex]
  const timeLeft = Math.max(0, 30 - state.elapsedSeconds)
  const timerPct = Math.max(0, (timeLeft / 30) * 100)
  const barColor = timerPct > 66 ? '#22c55e' : timerPct > 33 ? '#f59e0b' : '#dc2626'

  const [titleMode, setTitleMode] = useState<TitleMode>('idle')

  // Title stays visible (shrunk above the difficulty picker) until the game
  // actually starts, at which point it animates up and away.
  useEffect(() => {
    if (state.phase === 'idle') {
      setTitleMode('idle')
    } else if (state.phase === 'selectingDifficulty') {
      setTitleMode('difficulty')
    } else {
      setTitleMode(prev => (prev === 'gone' ? 'gone' : 'hiding'))
    }
  }, [state.phase])

  useEffect(() => {
    if (titleMode !== 'hiding') return
    const t = setTimeout(() => setTitleMode('gone'), 750)
    return () => clearTimeout(t)
  }, [titleMode])

  // The map is a single persistent instance, so we can't key a remount off
  // the active city (the same city can recur across separate games). Instead
  // bump roundToken every time we transition INTO 'playing' — that uniquely
  // identifies each round start for MapReveal's snap+animate effect.
  const [roundToken, setRoundToken] = useState(0)
  const prevPhaseRef = useRef(state.phase)
  useEffect(() => {
    if (state.phase === 'playing' && prevPhaseRef.current !== 'playing') {
      setRoundToken(t => t + 1)
    }
    prevPhaseRef.current = state.phase
  }, [state.phase])

  // The Next Round button never receives focus (the guess input it replaces
  // is unmounted), so Enter alone wouldn't trigger it without this listener.
  useEffect(() => {
    if (state.phase !== 'roundResult') return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        nextRound()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state.phase, nextRound])

  // Temporary diagnostics — surfaces map/round errors on screen so a stuck
  // round can be reported with an actual message instead of "nothing happened".
  const [mapError, setMapError] = useState<string | null>(null)

  const showMap = state.phase === 'playing' || state.phase === 'roundResult' || state.phase === 'gameOver'
  const showTopBar = state.phase === 'playing' || state.phase === 'roundResult'
  const lastScore = state.roundScores[state.roundScores.length - 1]
  const lastElapsed = state.roundElapsedTimes[state.roundElapsedTimes.length - 1] ?? 0

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#111' }}>

      {/* Full-screen satellite map — single persistent instance for the whole session */}
      <div style={{
        position: 'absolute',
        inset: 0,
        opacity: showMap ? 1 : 0,
        transition: 'opacity 0.3s',
        pointerEvents: 'none',
      }}>
        <MapReveal
          city={activeCity}
          roundToken={roundToken}
          duration={30000}
          onRoundStart={startTimer}
          onError={setMapError}
          debug={!!mapError}
        />
      </div>

      {mapError && (
        <div style={{
          position: 'absolute',
          top: 8,
          left: 8,
          maxWidth: 480,
          fontSize: 12,
          fontFamily: 'monospace',
          color: '#fff',
          background: 'rgba(220,38,38,0.9)',
          padding: '6px 10px',
          borderRadius: 6,
          zIndex: 1000,
        }}>
          {mapError}
        </div>
      )}

      {/* Title + difficulty picker — title shrinks and moves above the
          difficulty options, then slides up and fades once the game starts */}
      {titleMode !== 'gone' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: titleMode === 'difficulty' ? '2.5rem' : '2rem',
          transform: titleMode === 'hiding' ? 'translateY(-100px)' : 'translateY(0)',
          opacity: titleMode === 'hiding' ? 0 : 1,
          transition: 'transform 0.75s ease-in, opacity 0.75s ease-in',
          pointerEvents: titleMode === 'hiding' ? 'none' : 'auto',
        }}>
          <h1 style={{
            fontSize: titleMode === 'difficulty' ? '2.5rem' : '5rem',
            fontWeight: 800,
            color: '#fff',
            margin: 0,
            letterSpacing: '-0.03em',
            textShadow: '0 2px 24px rgba(0,0,0,0.6)',
            transition: 'font-size 0.5s ease',
          }}>
            SatGueser
          </h1>

          {titleMode === 'idle' && (
            <button
              onClick={startGame}
              style={{
                padding: '0.8rem 2.5rem',
                fontSize: 18,
                fontWeight: 600,
                borderRadius: 10,
                border: 'none',
                background: '#fff',
                color: '#111',
                cursor: 'pointer',
              }}
            >
              Start Game
            </button>
          )}

          {titleMode === 'difficulty' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
              <p style={{
                margin: 0,
                color: '#888',
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
              }}>
                Select Difficulty
              </p>

              <div style={{ display: 'flex', gap: '1rem' }}>
                {(['easy', 'medium', 'hard'] as const).map(d => {
                  const cfg = DIFFICULTY_CONFIG[d]
                  return (
                    <button
                      key={d}
                      onClick={() => selectDifficulty(d)}
                      style={{
                        padding: '1.5rem 2rem',
                        minWidth: 150,
                        background: cfg.bg,
                        border: `1px solid ${cfg.border}`,
                        borderRadius: 14,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.4rem',
                        transition: 'background 0.15s',
                      }}
                    >
                      <span style={{ fontSize: '1.1rem', fontWeight: 700, color: cfg.accent }}>
                        {cfg.label}
                      </span>
                      <span style={{ fontSize: 12, color: '#888', fontWeight: 400 }}>
                        {cfg.desc}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top bar: Round · Timer · Score (+ difficulty pill) */}
      {showTopBar && (
        <div style={{
          position: 'absolute',
          top: '1.25rem',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          borderRadius: 12,
          padding: '0.6rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          minWidth: 440,
          color: '#fff',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Round {state.round}/5</span>
            {state.difficulty && (
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: DIFFICULTY_CONFIG[state.difficulty].accent,
                border: `1px solid ${DIFFICULTY_CONFIG[state.difficulty].border}`,
                borderRadius: 4,
                padding: '1px 5px',
              }}>
                {DIFFICULTY_CONFIG[state.difficulty].label}
              </span>
            )}
          </div>

          <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              width: `${timerPct}%`,
              height: '100%',
              background: barColor,
              borderRadius: 4,
              transition: 'width 0.2s linear, background-color 0.5s ease',
            }} />
          </div>

          <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>
            Score: {state.totalScore}
          </span>
        </div>
      )}

      {/* Bottom bar: guess input (playing only) */}
      {state.phase === 'playing' && (
        <div style={{
          position: 'absolute',
          bottom: '1.5rem',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          borderRadius: 12,
          padding: '0.75rem 1.25rem',
        }}>
          <CityGuessInput onSubmit={submitGuess} disabled={false} phase={state.phase} />
        </div>
      )}

      {/* Round result card */}
      {state.phase === 'roundResult' && activeCity && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.45)',
        }}>
          <div style={{
            background: 'rgba(10,10,10,0.85)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderRadius: 20,
            padding: '2rem 2.75rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.6rem',
            minWidth: 300,
            textAlign: 'center',
          }}>
            <span style={{
              fontSize: 12,
              fontWeight: 700,
              color: lastScore === 0 ? '#f87171' : '#4ade80',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
            }}>
              {lastScore === 0 ? "Time's Up" : 'Correct!'}
            </span>
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
              {activeCity.displayName}
            </p>
            {lastScore > 0 && (
              <p style={{ margin: 0, fontSize: 14, color: '#aaa' }}>{lastElapsed.toFixed(1)}s</p>
            )}
            <p style={{ margin: '0.25rem 0 0.75rem', fontSize: '1.75rem', fontWeight: 700, color: lastScore === 0 ? '#f87171' : '#4ade80' }}>
              {lastScore === 0 ? '0' : `+${lastScore}`} pts
            </p>
            <button onClick={nextRound} style={btnStyle}>Next Round →</button>
          </div>
        </div>
      )}

      {/* Game over overlay */}
      {state.phase === 'gameOver' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.75)',
        }}>
          <div style={{
            background: 'rgba(10,10,10,0.9)',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>Game Over</h2>
              {state.difficulty && (
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: DIFFICULTY_CONFIG[state.difficulty].accent,
                  border: `1px solid ${DIFFICULTY_CONFIG[state.difficulty].border}`,
                  borderRadius: 4,
                  padding: '2px 6px',
                }}>
                  {DIFFICULTY_CONFIG[state.difficulty].label}
                </span>
              )}
            </div>

            {/* Per-round breakdown */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {state.cities.map((city, i) => {
                const score = state.roundScores[i] ?? 0
                const elapsed = state.roundElapsedTimes[i]
                const timedOut = score === 0
                return (
                  <div key={city.name} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.4rem 0',
                    borderBottom: i < state.cities.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                  }}>
                    <span style={{ flex: 1, color: '#eee', fontSize: 15, fontWeight: 500 }}>
                      {city.displayName}
                    </span>
                    <span style={{ color: '#888', fontSize: 13, minWidth: 40, textAlign: 'right' }}>
                      {timedOut ? '—' : `${elapsed?.toFixed(1)}s`}
                    </span>
                    <span style={{
                      fontSize: 13,
                      fontWeight: 600,
                      minWidth: 52,
                      textAlign: 'right',
                      color: timedOut ? '#f87171' : '#4ade80',
                    }}>
                      {timedOut ? '0' : `+${score}`}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Total */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
              <span style={{ color: '#888', fontSize: 13 }}>Total</span>
              <span style={{ color: '#fff', fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                {state.totalScore}
              </span>
              <span style={{ color: '#888', fontSize: 13 }}>pts</span>
            </div>

            <button
              onClick={startGame}
              style={{
                padding: '0.7rem 2.5rem',
                fontSize: 15,
                fontWeight: 600,
                borderRadius: 10,
                border: 'none',
                background: '#fff',
                color: '#111',
                cursor: 'pointer',
              }}
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
