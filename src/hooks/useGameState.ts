import { useState, useRef, useCallback, useEffect } from 'react'
import allCities from '../cities.json'
import type { City } from '../utils/mapboxUtils'

export type GamePhase = 'idle' | 'playing' | 'roundResult' | 'gameOver'

export interface GameState {
  phase: GamePhase
  round: number          // 1–5
  cities: City[]         // 5 randomly selected cities for this game
  activeCityIndex: number
  roundScores: number[]  // one entry per completed round
  totalScore: number
  elapsedSeconds: number // live elapsed time for current round
}

const ROUND_DURATION = 30
const ROUNDS_PER_GAME = 5

// score = max(0, round((1000 - elapsed * 30) / 10) * 10)
// Gives 1000 at t=0, 100 at t=30. Timeout yields 0 explicitly.
function calculateScore(elapsedSeconds: number): number {
  return Math.max(0, Math.round((1000 - elapsedSeconds * 30) / 10) * 10)
}

function pickRandomCities(count: number): City[] {
  return [...(allCities as City[])].sort(() => Math.random() - 0.5).slice(0, count)
}

const INITIAL_STATE: GameState = {
  phase: 'idle',
  round: 0,
  cities: [],
  activeCityIndex: 0,
  roundScores: [],
  totalScore: 0,
  elapsedSeconds: 0,
}

export function useGameState() {
  const [state, setState] = useState<GameState>(INITIAL_STATE)
  const timerStartRef = useRef<number | null>(null)
  const intervalRef = useRef<number>(0)

  // Called by ImageReveal's onLoad — starts the round timer
  const startTimer = useCallback(() => {
    clearInterval(intervalRef.current)
    const startedAt = Date.now()
    timerStartRef.current = startedAt

    intervalRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000

      if (elapsed >= ROUND_DURATION) {
        clearInterval(intervalRef.current)
        timerStartRef.current = null
        setState(s => {
          if (s.phase !== 'playing') return s
          const isLast = s.round >= ROUNDS_PER_GAME
          console.log(`Round ${s.round}: timed out! 0 pts. Running total: ${s.totalScore}`)
          return {
            ...s,
            phase: isLast ? 'gameOver' : 'roundResult',
            roundScores: [...s.roundScores, 0],
            elapsedSeconds: ROUND_DURATION,
          }
        })
      } else {
        setState(s => s.phase === 'playing' ? { ...s, elapsedSeconds: elapsed } : s)
      }
    }, 200)
  }, [])

  const startGame = useCallback(() => {
    clearInterval(intervalRef.current)
    timerStartRef.current = null
    const cities = pickRandomCities(ROUNDS_PER_GAME)
    console.log(`--- New game! Cities: ${cities.map(c => c.displayName).join(', ')}`)
    setState({ ...INITIAL_STATE, phase: 'playing', round: 1, cities })
  }, [])

  // Captures elapsed at call time so the score is locked to the moment of the click,
  // not when React gets around to processing the setState batch.
  const submitGuess = useCallback((cityName: string) => {
    const elapsed = timerStartRef.current !== null
      ? (Date.now() - timerStartRef.current) / 1000
      : ROUND_DURATION

    setState(s => {
      if (s.phase !== 'playing') return s
      const active = s.cities[s.activeCityIndex]

      if (cityName.toLowerCase() !== active.displayName.toLowerCase()) {
        console.log(`Wrong guess: "${cityName}"`)
        return s
      }

      // Side effects here are intentional: clear the timer synchronously
      // so it cannot fire between now and React committing the new phase.
      clearInterval(intervalRef.current)
      timerStartRef.current = null

      const clampedElapsed = Math.min(elapsed, ROUND_DURATION)
      const score = calculateScore(clampedElapsed)
      const newTotal = s.totalScore + score
      const isLast = s.round >= ROUNDS_PER_GAME
      console.log(
        `Round ${s.round}: ✓ "${active.displayName}" in ${clampedElapsed.toFixed(1)}s` +
        ` → ${score} pts. Running total: ${newTotal}`,
      )
      return {
        ...s,
        phase: isLast ? 'gameOver' : 'roundResult',
        roundScores: [...s.roundScores, score],
        totalScore: newTotal,
        elapsedSeconds: clampedElapsed,
      }
    })
  }, [])

  const nextRound = useCallback(() => {
    setState(s => {
      if (s.phase !== 'roundResult') return s
      console.log(`--- Advancing to round ${s.round + 1}, waiting for images to load...`)
      return {
        ...s,
        phase: 'playing',
        round: s.round + 1,
        activeCityIndex: s.activeCityIndex + 1,
        elapsedSeconds: 0,
      }
    })
  }, [])

  useEffect(() => () => { clearInterval(intervalRef.current) }, [])

  return { state, startGame, startTimer, submitGuess, nextRound }
}
