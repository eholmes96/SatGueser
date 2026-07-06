import { useState, useRef, useCallback, useEffect } from 'react'
import citiesV2Json from '../Cities_v2.json'
import type { City, CityWithPoints, Difficulty, GameMode, Mode } from '../utils/mapboxUtils'
import { normalize } from '../utils/textUtils'
import { shuffle, resolveRoundCities } from '../utils/roundBuilding'
import { getEasternDateKey } from '../utils/easternDate'
import { buildDailyChallengeCities, DAILY_SCORE_MULTIPLIER } from '../utils/dailyChallenge'
import {
  getDailyChallengeStorage,
  getTodayStatus,
  recordCompletion,
  type DailyChallengeRecord,
} from '../utils/dailyChallengeStorage'

const allCities = citiesV2Json as CityWithPoints[]

export type { Difficulty }
export type GamePhase = 'idle' | 'selectingDifficulty' | 'playing' | 'roundResult' | 'gameOver'

export interface GameState {
  phase: GamePhase
  difficulty: Difficulty | null
  mode: GameMode | null
  round: number
  cities: City[]
  activeCityIndex: number
  roundScores: number[]
  roundElapsedTimes: number[]
  totalScore: number
  elapsedSeconds: number
  // Eastern-time date key captured once when a daily-challenge run starts,
  // so completion is stamped with the day that was actually played even if
  // the run happens to straddle the midnight-ET rollover.
  dailyDateKey: string | null
}

const ROUND_DURATION = 30
export const ROUNDS_PER_GAME = 5

function calculateScore(elapsedSeconds: number): number {
  return Math.max(0, Math.round((1000 - elapsedSeconds * 30) / 10) * 10)
}

const MAX_COUNTRY_RETRY = 30

function hasConsecutiveSameCountry(cities: CityWithPoints[]): boolean {
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
): CityWithPoints[] {
  const fullPool = allCities.filter(
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
  dailyDateKey: null,
}

export interface DailyStatus {
  completed: boolean
  record?: DailyChallengeRecord
  streak: number
}

export function useGameState() {
  const [state, setState] = useState<GameState>(INITIAL_STATE)
  const timerStartRef = useRef<number | null>(null)
  const intervalRef = useRef<number>(0)
  // Tracks each mode+difficulty combo's last game's cities separately, so
  // switching modes/tiers doesn't cross-contaminate exclusions.
  const lastGameCitiesRef = useRef<Record<string, Set<string>>>({})

  // Read once at mount from whatever's already in localStorage — re-read
  // happens explicitly (via recordCompletion's return value) after a run
  // finishes, not on every render.
  const [dailyStatus, setDailyStatus] = useState<DailyStatus>(() => {
    const todayKey = getEasternDateKey()
    const storage = getDailyChallengeStorage()
    const { completed, record } = getTodayStatus(todayKey)
    return { completed, record, streak: storage.streak }
  })

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
          return {
            ...s,
            phase: 'roundResult',
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
    const pickedCities = pickFromDifficulty(mode, difficulty, excludeNames)
    lastGameCitiesRef.current[key] = new Set(pickedCities.map(c => c.name))
    const cities = resolveRoundCities(pickedCities)
    setState({
      ...INITIAL_STATE,
      phase: 'playing',
      difficulty,
      mode,
      round: 1,
      cities,
    })
  }, [])

  // Called when the player picks the Daily Challenge option. No difficulty
  // choice — the day's fixed 5-city set is deterministic per Eastern date.
  // Defensively re-checks completion (the UI already gates this via
  // dailyStatus, this is belt-and-suspenders) so it can't be double-started.
  const startDailyChallenge = useCallback(() => {
    const todayKey = getEasternDateKey()
    if (getTodayStatus(todayKey).completed) return

    clearInterval(intervalRef.current)
    timerStartRef.current = null
    const cities = buildDailyChallengeCities(allCities, todayKey)
    setState({
      ...INITIAL_STATE,
      phase: 'playing',
      difficulty: null,
      mode: 'daily',
      round: 1,
      cities,
      dailyDateKey: todayKey,
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
        return s
      }

      wasCorrect = true
      clearInterval(intervalRef.current)
      timerStartRef.current = null

      const clampedElapsed = Math.min(elapsed, ROUND_DURATION)
      const baseScore = calculateScore(clampedElapsed)
      const score = s.mode === 'daily' ? baseScore * DAILY_SCORE_MULTIPLIER[active.difficulty] : baseScore
      const newTotal = s.totalScore + score
      return {
        ...s,
        phase: 'roundResult',
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
      if (s.round >= ROUNDS_PER_GAME) {
        return { ...s, phase: 'gameOver' }
      }
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

  // Persists a completed daily run exactly once, on the transition into
  // 'gameOver' for a mode==='daily' game. Kept as its own effect (rather
  // than folded into a setState updater, unlike the interval handling above)
  // so the localStorage write stays a clean side effect separate from state
  // transitions. recordCompletion is itself idempotent per day, so this is
  // safe even if the effect fires more than once for the same completion.
  useEffect(() => {
    if (state.phase !== 'gameOver' || state.mode !== 'daily' || !state.dailyDateKey) return
    const rounds = state.cities.map((c, i) => ({
      cityName: c.name,
      displayName: c.displayName,
      difficulty: c.difficulty,
      score: state.roundScores[i] ?? 0,
      elapsedSeconds: state.roundElapsedTimes[i] ?? 0,
    }))
    const updated = recordCompletion(state.dailyDateKey, { totalScore: state.totalScore, rounds })
    setDailyStatus({ completed: true, record: updated.lastCompleted, streak: updated.streak })
  }, [state.phase, state.mode, state.dailyDateKey, state.cities, state.roundScores, state.roundElapsedTimes, state.totalScore])

  return { state, startGame, startTimer, selectDifficulty, startDailyChallenge, submitGuess, nextRound, dailyStatus }
}
