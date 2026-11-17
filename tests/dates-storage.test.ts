import { describe, expect, it } from 'vitest'
import { daysBetween, getEasternDateKey, previousDateKey } from '../src/utils/easternDate'
import { getDailyChallengeStorage, getTodayStatus, recordCompletion, resetDailyChallengeStorage } from '../src/utils/dailyChallengeStorage'
import { getHighScore, highScoreKey, recordHighScore } from '../src/utils/highScores'

describe('Eastern date keys', () => {
  it('rolls over at midnight Eastern, on both sides of the DST change', () => {
    // EDT (UTC-4) on 1 Nov 2026 until 2am; EST (UTC-5) afterwards.
    expect(getEasternDateKey(new Date('2026-11-01T03:59:00Z'))).toBe('2026-10-31')
    expect(getEasternDateKey(new Date('2026-11-01T04:01:00Z'))).toBe('2026-11-01')
    expect(getEasternDateKey(new Date('2026-11-02T04:30:00Z'))).toBe('2026-11-01')
    expect(getEasternDateKey(new Date('2026-11-02T05:01:00Z'))).toBe('2026-11-02')
    expect(getEasternDateKey(new Date('2027-03-14T04:59:00Z'))).toBe('2027-03-13')
  })

  it('steps back across month and year boundaries', () => {
    expect(previousDateKey('2026-03-01')).toBe('2026-02-28')
    expect(previousDateKey('2028-03-01')).toBe('2028-02-29')
    expect(previousDateKey('2027-01-01')).toBe('2026-12-31')
  })

  it('counts whole days, including across DST', () => {
    expect(daysBetween('2026-07-06', '2026-07-06')).toBe(0)
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2)
    expect(daysBetween('2026-11-02', '2026-10-31')).toBe(-2)
    expect(daysBetween('2026-07-06', '2027-07-06')).toBe(365)
  })
})

const run = (totalScore: number) => ({
  totalScore,
  rounds: [{ cityName: 'x', displayName: 'X', difficulty: 'easy' as const, score: totalScore, elapsedSeconds: 3, wrongGuesses: 0 }],
})

describe('daily completion record', () => {
  it('starts a streak, extends it on consecutive days and resets after a gap', () => {
    expect(recordCompletion('2026-11-01', run(100)).streak).toBe(1)
    expect(recordCompletion('2026-11-02', run(200)).streak).toBe(2)
    expect(recordCompletion('2026-11-03', run(300)).streak).toBe(3)
    expect(recordCompletion('2026-11-05', run(400)).streak).toBe(1)
  })

  it('ignores a second completion on the same day', () => {
    recordCompletion('2026-11-01', run(100))
    const again = recordCompletion('2026-11-01', run(999))
    expect(again.lastCompleted?.totalScore).toBe(100)
    expect(again.streak).toBe(1)
  })

  it('reports whether today is done', () => {
    expect(getTodayStatus('2026-11-01').completed).toBe(false)
    recordCompletion('2026-11-01', run(100))
    expect(getTodayStatus('2026-11-01')).toMatchObject({ completed: true, record: { totalScore: 100 } })
    expect(getTodayStatus('2026-11-02').completed).toBe(false)
  })

  it('falls back to an empty record for corrupt or foreign data', () => {
    localStorage.setItem('satgueser.dailyChallenge.v1', '{not json')
    expect(getDailyChallengeStorage().streak).toBe(0)
    localStorage.setItem('satgueser.dailyChallenge.v1', JSON.stringify({ version: 99, streak: 50 }))
    expect(getDailyChallengeStorage().streak).toBe(0)
  })

  it('can be reset', () => {
    recordCompletion('2026-11-01', run(100))
    resetDailyChallengeStorage()
    expect(getTodayStatus('2026-11-01').completed).toBe(false)
  })
})

describe('high scores', () => {
  it('keys by mode and difficulty, with Daily on its own', () => {
    expect(highScoreKey('islands', 'hard')).toBe('islands-hard')
    expect(highScoreKey('daily', null)).toBe('daily')
  })

  it('only records a strictly higher score', () => {
    expect(recordHighScore('us-easy', 0)).toBe(false)
    expect(recordHighScore('us-easy', 500)).toBe(true)
    expect(recordHighScore('us-easy', 500)).toBe(false)
    expect(recordHighScore('us-easy', 400)).toBe(false)
    expect(recordHighScore('us-easy', 600)).toBe(true)
    expect(getHighScore('us-easy')).toBe(600)
    expect(getHighScore('us-hard')).toBe(0)
  })
})
