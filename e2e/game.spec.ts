import { test, expect } from '@playwright/test'
import { MODES, MULTIPLIER, guess, nextRound, playUntil, roundResult, startRun, timerWidth, waitForRoundStart } from './harness'

// One full game per mode, on exact game time:
//   round 1: 2 wrong guesses at 3.0s, then correct    → (1000 − 90 − 200) × m
//   round 2: correct at 3.0s                          → 910 × m
//   round 3: wrong guesses at 3.0s until the score clock runs out: the 9th
//            takes it to 33s, so the round ends as Time's Up right then → 0
//   round 4: 1 wrong guess at 3.0s, then correct      → 810 × m
//   round 5: correct at 5.0s                          → 850 × m
const BASE = [710, 910, 0, 810, 850]
const WRONG = [2, 0, 9, 1, 0]
const PENALTY_PCT = (10 / 3 / 30) * 100

for (const { key, tab } of MODES) {
  test(`${tab}: full game with wrong guesses, hints, Time's Up and scorecard`, async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const { plan } = await startRun(page, key)
    const expected = plan.map((r, i) => BASE[i] * MULTIPLIER[r.difficulty])

    // Round 1
    await waitForRoundStart(page)
    await playUntil(page, 3)
    const w0 = await timerWidth(page)
    expect(w0).toBeCloseTo(90, 1)
    for (const [i, wrong] of plan[0].wrong.entries()) {
      await guess(page, wrong.typed, wrong.name)
      expect(await timerWidth(page)).toBeCloseTo(w0 - PENALTY_PCT * (i + 1), 1)
    }
    await expect(page.getByTestId('direction-hint')).toHaveText(plan[0].wrong.map(w => w.hint))
    await guess(page, plan[0].typed, plan[0].displayName)
    const r1 = await roundResult(page)
    expect(r1.text).toContain('3.0s')
    expect(r1.points).toBe(expected[0])
    await nextRound(page)

    // Round 2
    await waitForRoundStart(page)
    await playUntil(page, 3)
    await guess(page, plan[1].typed, plan[1].displayName)
    expect((await roundResult(page)).points).toBe(expected[1])
    await nextRound(page)

    // Round 3: eight wrong guesses leave the round live; the ninth ends it.
    await waitForRoundStart(page)
    await playUntil(page, 3)
    const input = page.getByPlaceholder(/Type a/)
    for (let i = 0; i < 9; i++) {
      await expect(input, `still playing before wrong guess ${i + 1}`).toBeVisible()
      const w = plan[2].wrong[i % plan[2].wrong.length]
      await guess(page, w.typed, w.name)
    }
    const r3 = await roundResult(page)
    expect(r3.timedOut).toBe(true)
    expect(r3.points).toBe(0)
    await nextRound(page)

    // Round 4
    await waitForRoundStart(page)
    await playUntil(page, 3)
    await guess(page, plan[3].wrong[0].typed, plan[3].wrong[0].name)
    await guess(page, plan[3].typed, plan[3].displayName)
    expect((await roundResult(page)).points).toBe(expected[3])
    await nextRound(page)

    // Round 5
    await waitForRoundStart(page)
    await playUntil(page, 5)
    await guess(page, plan[4].typed, plan[4].displayName)
    expect((await roundResult(page)).points).toBe(expected[4])
    await nextRound(page)

    // Game-over scorecard
    const total = expected.reduce((a, b) => a + b, 0)
    await expect(page.getByTestId('wrong-guesses')).toHaveText(WRONG.map(n => (n === 0 ? '0' : `-${n}`)))
    await expect(page.getByText(String(total), { exact: true })).toBeVisible()
    for (const r of plan) await expect(page.getByText(r.displayName, { exact: true })).toBeVisible()

    if (key !== 'daily') return

    // Daily: saved record, share text, and the recap card on the menu.
    const record = await page.evaluate(() => JSON.parse(localStorage.getItem('satgueser.dailyChallenge.v1')!).lastCompleted)
    expect(record).toMatchObject({ dateKey: '2026-11-17', totalScore: total })
    expect(record.rounds.map((r: { wrongGuesses: number }) => r.wrongGuesses)).toEqual(WRONG)
    expect(record.rounds.map((r: { score: number }) => r.score)).toEqual(expected)

    await page.getByRole('button', { name: 'Copy Result' }).click()
    expect(await page.evaluate(() => navigator.clipboard.readText()))
      .toBe(`SatGueser Daily #135 — ${total} pts\n🟩🟩⬛🟩🟩\nhttps://satgueser.app`)

    await page.getByRole('button', { name: 'Back to Menu' }).click()
    await page.getByRole('button', { name: 'Daily Challenge', exact: true }).click()
    await expect(page.getByText("Today's Challenge")).toBeVisible()
    await expect(page.getByTestId('wrong-guesses')).toHaveText(WRONG.map(n => (n === 0 ? '0' : `-${n}`)))
  })

  test(`${tab}: a wrong guess before the round clock starts costs 3⅓s, not the round`, async ({ page }) => {
    const { plan, releaseMap } = await startRun(page, key, { holdMap: true })
    const wrong = plan[0].wrong[0]
    await guess(page, wrong.typed, wrong.name)
    await expect(page.getByPlaceholder(/Type a/)).toBeVisible()
    expect(await timerWidth(page)).toBeCloseTo(100 - PENALTY_PCT, 1)
    await expect(page.getByTestId('direction-hint')).toHaveText([wrong.hint])

    releaseMap()
    await waitForRoundStart(page)
    await playUntil(page, 3)
    await guess(page, plan[0].typed, plan[0].displayName)
    expect((await roundResult(page)).points).toBe(810 * MULTIPLIER[plan[0].difficulty])
  })
}
