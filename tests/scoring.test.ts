import { describe, expect, it } from 'vitest'
import { calculateScore, scoreRound, ROUND_DURATION, WRONG_GUESS_PENALTY_SECONDS } from '../src/utils/scoring'

describe('calculateScore', () => {
  it('starts at 1000 and loses 30 points a second, rounded to 10', () => {
    expect(calculateScore(0)).toBe(1000)
    expect(calculateScore(1)).toBe(970)
    expect(calculateScore(3.6)).toBe(890)
    expect(calculateScore(10)).toBe(700)
    expect(calculateScore(29.9)).toBe(100)
  })

  it('never goes below 0', () => {
    expect(calculateScore(40)).toBe(0)
  })
})

describe('scoreRound', () => {
  it.each([
    // [true seconds, difficulty, wrong guesses, expected]
    [3.6, 'easy', 0, 890],
    [3.6, 'easy', 2, 690],
    [3.6, 'medium', 0, 1780],
    [3.6, 'hard', 2, 2070],
    [3.6, 'extreme', 1, 3160],
    [29.9, 'easy', 0, 100],
    [26.6, 'easy', 1, 100], // score clock 29.93s: still a correct guess
    [26.5, 'easy', 1, 110],
  ] as const)('%ss %s with %i wrong → %i', (t, d, w, expected) => {
    expect(scoreRound(t, d, w)).toBe(expected)
  })

  it.each([
    ['the true clock reaching 30s', 30, 0],
    ['the true clock past 30s', 45, 0],
    ['penalties running the score clock out', 4, 8],
    ['penalties landing exactly on 30s', 0, 9],
    ['a score clock just past 30s', 26.7, 1],
  ])('scores 0 (timeout) for %s', (_label, t, w) => {
    expect(scoreRound(t, 'hard', w)).toBe(0)
  })

  it('clamps negative elapsed time to 0', () => {
    expect(scoreRound(-5, 'easy', 0)).toBe(1000)
  })

  it('costs exactly 100 × multiplier per wrong guess while the round is live', () => {
    const multipliers = { easy: 1, medium: 2, hard: 3, extreme: 4 } as const
    for (const [difficulty, m] of Object.entries(multipliers)) {
      for (let t = 0; t <= 20; t += 0.25) {
        for (let w = 1; w <= 3; w++) {
          if (t + w * WRONG_GUESS_PENALTY_SECONDS >= ROUND_DURATION) continue
          expect(scoreRound(t, difficulty as keyof typeof multipliers, 0) - scoreRound(t, difficulty as keyof typeof multipliers, w)).toBe(100 * w * m)
        }
      }
    }
  })

  it('never scores 0 for a correct guess, so 0 always means timed out', () => {
    for (let t = 0; t < ROUND_DURATION; t += 0.05) {
      expect(scoreRound(t, 'easy', 0)).toBeGreaterThanOrEqual(100)
    }
  })
})

describe('scoreRound out-of-range inputs', () => {
  it('scores a non-finite elapsed time as a timeout', () => {
    expect(scoreRound(NaN, 'easy')).toBe(0)
    expect(scoreRound(Infinity, 'hard')).toBe(0)
    expect(scoreRound(-Infinity, 'hard')).toBe(0)
  })

  it('treats negative, fractional or non-finite wrong-guess counts safely', () => {
    expect(scoreRound(0, 'easy', -3)).toBe(1000)
    expect(scoreRound(0, 'easy', NaN)).toBe(1000)
    expect(scoreRound(0, 'easy', 1.9)).toBe(scoreRound(0, 'easy', 1))
  })
})
