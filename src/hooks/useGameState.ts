import { useState, useRef, useCallback, useEffect } from 'react'
import allCities from '../cities.json'
import type { City, Difficulty, Mode } from '../utils/mapboxUtils'
import { normalize } from '../utils/textUtils'

export type { Difficulty }
export type GamePhase = 'idle' | 'selectingDifficulty' | 'playing' | 'roundResult' | 'gameOver'

export interface GameState {
  phase: GamePhase
  difficulty: Difficulty | null
  mode: Mode | null
  round: number
  cities: City[]
  activeCityIndex: number
  roundScores: number[]
  roundElapsedTimes: number[]
  totalScore: number
  elapsedSeconds: number
}

const ROUND_DURATION = 30
const ROUNDS_PER_GAME = 5

function calculateScore(elapsedSeconds: number): number {
  return Math.max(0, Math.round((1000 - elapsedSeconds * 30) / 10) * 10)
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

const MAX_COUNTRY_RETRY = 30

function hasConsecutiveSameCountry(cities: City[]): boolean {
  for (let i = 1; i < cities.length; i++) {
    if (cities[i].country && cities[i - 1].country &&
        cities[i].country === cities[i - 1].country) {
      return true
    }
  }
  return false
}

function pickFromDifficulty(
  mode: Mode,
  difficulty: Difficulty,
  excludeNames: Set<string>
): City[] {
  const fullPool = (allCities as City[]).filter(
    c => c.mode === mode && c.difficulty === difficulty
  )
  let workingPool = fullPool.filter(c => !excludeNames.has(c.name))

  // If excluding last game's cities leaves too few to fill a game,
  // top back up from the excluded set rather than fail.
  if (workingPool.length < ROUNDS_PER_GAME) {
    const needed = ROUNDS_PER_GAME - workingPool.length
    const excludedCities = fullPool.filter(c => excludeNames.has(c.name))
    workingPool = [...workingPool, ...shuffle(excludedCities).slice(0, needed)]
  }

  let selection = shuffle(workingPool).slice(0, ROUNDS_PER_GAME)
  for (
    let attempt = 0;
    attempt < MAX_COUNTRY_RETRY && hasConsecutiveSameCountry(selection);
    attempt++
  ) {
    selection = shuffle(workingPool).slice(0, ROUNDS_PER_GAME)
  }
  return selection
}

const INITIAL_STATE: GameState = {
  phase: 'idle',
  difficulty: null,
  mode: null,
  round: 0,
  cities: [],
  activeCityIndex: 0,
  roundScores: [],
  roundElapsedTimes: [],
  totalScore: 0,
  elapsedSeconds: 0,
}

export function useGameState() {
  const [state, setState] = useState<GameState>(INITIAL_STATE)
  const timerStartRef = useRef<number | null>(null)
  const intervalRef = useRef<number>(0)
  // Tracks each mode+difficulty combo's last game's cities separately, so
  // switching modes/tiers doesn't cross-contaminate exclusions.
  const lastGameCitiesRef = useRef<Record<string, Set<string>>>({})

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
            roundElapsedTimes: [...s.roundElapsedTimes, ROUND_DURATION],
            elapsedSeconds: ROUND_DURATION,
          }
        })
      } else {
        setState(s => s.phase === 'playing' ? { ...s, elapsedSeconds: elapsed } : s)
      }
    }, 200)
  }, [])

  // Resets state and shows the difficulty selection screen.
  // Called both on first "Start Game" and on "Play Again".
  const startGame = useCallback(() => {
    clearInterval(intervalRef.current)
    timerStartRef.current = null
    setState({ ...INITIAL_STATE, phase: 'selectingDifficulty' })
  }, [])

  // Called when the player picks a difficulty tile — begins the actual game.
  const selectDifficulty = useCallback((difficulty: Difficulty, mode: Mode = 'us') => {
    const key = `${mode}-${difficulty}`
    const excludeNames = lastGameCitiesRef.current[key] ?? new Set<string>()
    const cities = pickFromDifficulty(mode, difficulty, excludeNames)
    lastGameCitiesRef.current[key] = new Set(cities.map(c => c.name))
    console.log(`--- Starting ${difficulty} game! Cities: ${cities.map(c => c.displayName).join(', ')}`)
    setState({
      ...INITIAL_STATE,
      phase: 'playing',
      difficulty,
      mode,
      round: 1,
      cities,
    })
  }, [])

  const submitGuess = useCallback((cityName: string): boolean => {
    const elapsed = timerStartRef.current !== null
      ? (Date.now() - timerStartRef.current) / 1000
      : ROUND_DURATION

    let wasCorrect = false
    setState(s => {
      if (s.phase !== 'playing') return s
      const active = s.cities[s.activeCityIndex]

      if (normalize(cityName) !== normalize(active.displayName)) {
        console.log(`Wrong guess: "${cityName}"`)
        return s
      }

      wasCorrect = true
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
        roundElapsedTimes: [...s.roundElapsedTimes, clampedElapsed],
        totalScore: newTotal,
        elapsedSeconds: clampedElapsed,
      }
    })
    return wasCorrect
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

  return { state, startGame, startTimer, selectDifficulty, submitGuess, nextRound }
}
