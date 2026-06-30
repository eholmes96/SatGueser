import { useState, useEffect } from 'react'
import { useGameState } from './hooks/useGameState'
import { ImageReveal } from './components/ImageReveal'
import { CityGuessInput } from './components/CityGuessInput'
import './App.css'

type TitlePhase = 'visible' | 'exiting' | 'gone'

function App() {
  const { state, startGame, startTimer, submitGuess, nextRound } = useGameState()
  const activeCity = state.cities[state.activeCityIndex]
  const timeLeft = Math.max(0, 30 - state.elapsedSeconds)
  const timerPct = Math.max(0, (timeLeft / 30) * 100)
  const barColor = timerPct > 66 ? '#22c55e' : timerPct > 33 ? '#f59e0b' : '#dc2626'

  const [titlePhase, setTitlePhase] = useState<TitlePhase>('visible')

  useEffect(() => {
    if (state.phase !== 'idle' && titlePhase === 'visible') {
      setTitlePhase('exiting')
      const t = setTimeout(() => setTitlePhase('gone'), 750)
      return () => clearTimeout(t)
    }
  }, [state.phase, titlePhase])

  const showMap = state.phase !== 'idle'
  const showUIBars = state.phase === 'playing' || state.phase === 'roundResult'
  const lastScore = state.roundScores[state.roundScores.length - 1]

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#111' }}>

      {/* Full-screen satellite imagery */}
      {showMap && activeCity && (
        <ImageReveal
          key={activeCity.name}
          city={activeCity}
          duration={30000}
          onLoad={startTimer}
        />
      )}

      {/* Title / start screen — slides up and fades when game starts */}
      {titlePhase !== 'gone' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2rem',
          transform: titlePhase === 'exiting' ? 'translateY(-100px)' : 'translateY(0)',
          opacity: titlePhase === 'exiting' ? 0 : 1,
          transition: 'transform 0.75s ease-in, opacity 0.75s ease-in',
          pointerEvents: titlePhase === 'exiting' ? 'none' : 'auto',
        }}>
          <h1 style={{
            fontSize: '5rem',
            fontWeight: 800,
            color: '#fff',
            margin: 0,
            letterSpacing: '-0.03em',
            textShadow: '0 2px 24px rgba(0,0,0,0.6)',
          }}>
            SatGueser
          </h1>
          {state.phase === 'idle' && (
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
        </div>
      )}

      {/* Top UI bar: Round · Timer bar · Score */}
      {showUIBars && (
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
          <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>
            Round {state.round}/5
          </span>

          <div style={{
            flex: 1,
            height: 8,
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 4,
            overflow: 'hidden',
          }}>
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

      {/* Bottom UI bar: guess input or round result */}
      {showUIBars && (
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
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.6rem',
        }}>
          {state.phase === 'playing' && (
            <CityGuessInput onSubmit={submitGuess} disabled={false} />
          )}

          {state.phase === 'roundResult' && activeCity && (
            <>
              <p style={{ margin: 0, color: '#eee', fontSize: 15 }}>
                {lastScore === 0
                  ? `Time's up! The city was ${activeCity.displayName}.`
                  : `+${lastScore} pts — ${activeCity.displayName}`}
              </p>
              <button
                onClick={nextRound}
                style={{
                  padding: '0.5rem 1.5rem',
                  fontSize: 15,
                  fontWeight: 600,
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.15)',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                Next Round →
              </button>
            </>
          )}
        </div>
      )}

      {/* Game over overlay */}
      {state.phase === 'gameOver' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          background: 'rgba(0,0,0,0.75)',
        }}>
          <h2 style={{ color: '#fff', margin: 0, fontSize: '2rem', fontWeight: 700 }}>Game Over</h2>
          <p style={{ color: '#aaa', margin: 0, fontSize: 15 }}>
            {state.roundScores.join(' · ')} pts
          </p>
          <p style={{ color: '#fff', fontSize: '3rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            {state.totalScore}
          </p>
          <button
            onClick={startGame}
            style={{
              marginTop: '0.5rem',
              padding: '0.75rem 2.5rem',
              fontSize: 16,
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
      )}
    </div>
  )
}

export default App
