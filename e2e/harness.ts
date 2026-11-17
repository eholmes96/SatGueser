import { expect, type Page } from '@playwright/test'

// Shared setup for the browser tests. Three things make a run deterministic:
// - Playwright's fake clock, paused: game time only moves when a test calls
//   page.clock.runFor, so elapsed times and scores are exact.
// - Math.random pinned to 0.999, which makes every shuffle the identity and
//   every point pick the last one, so a game draws the first five Easy
//   entries of its mode in data-file order.
// - The Mapbox style request answered with an empty style and every other
//   Mapbox request with an empty 204, so the map "loads" with no network.

export type ModeKey = 'us' | 'global' | 'islands' | 'airports' | 'daily'

export const MODES: { key: ModeKey; tab: string }[] = [
  { key: 'us', tab: 'US Cities' },
  { key: 'global', tab: 'Global' },
  { key: 'islands', tab: 'Islands' },
  { key: 'airports', tab: 'Airports' },
  { key: 'daily', tab: 'Daily Challenge' },
]

// Noon Eastern on 17 Nov 2026, i.e. Daily puzzle #135.
export const START = new Date('2026-11-17T17:00:00Z')

export const MULTIPLIER = { easy: 1, medium: 2, hard: 3, extreme: 4 } as const
export type Difficulty = keyof typeof MULTIPLIER

const EMPTY_STYLE = { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#234' } }] }

export interface WrongGuess { name: string; typed: string; hint: string }
export interface RoundPlan { displayName: string; typed: string; difficulty: Difficulty; wrong: WrongGuess[] }

// Opens the game and starts a run in `mode`. With holdMap, the map's style
// request is held until the returned releaseMap() is called, so the round
// clock can't start (used to test guesses made before it does).
export async function startRun(page: Page, mode: ModeKey, { holdMap = false } = {}) {
  let releaseMap = () => {}
  const mapReleased = holdMap ? new Promise<void>(resolve => { releaseMap = resolve }) : Promise.resolve()

  await page.clock.install({ time: START })
  await page.addInitScript(() => { Math.random = () => 0.999 })
  await page.route(/mapbox\.com/, async route => {
    if (!route.request().url().includes('/styles/')) return route.fulfill({ status: 204, body: '' })
    await mapReleased
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(EMPTY_STYLE) })
  })
  await page.goto('/')
  // The clock runs in real time until paused; a minute ahead leaves room for
  // a slow page load (nothing on the menu is time-sensitive).
  await page.clock.pauseAt(new Date(START.getTime() + 60_000))

  const plan = await planRun(page, mode)

  await page.getByRole('button', { name: 'Start Game' }).click()
  await page.getByRole('button', { name: MODES.find(m => m.key === mode)!.tab, exact: true }).click()
  if (mode === 'daily') await page.getByRole('button', { name: 'Play Daily Challenge' }).click()
  else await page.getByRole('button', { name: /^Easy/ }).click()

  return { plan, releaseMap }
}

// Works out, inside the page, what the run will draw and what each wrong
// guess's hint should say. Runs the app's own modules (served by Vite), so it
// checks the UI is wired to them; the logic itself is covered by the unit
// tests. Passed as a string so Playwright doesn't transpile the dynamic
// imports.
async function planRun(page: Page, mode: ModeKey): Promise<RoundPlan[]> {
  return page.evaluate(`(async (mode) => {
    const cities = (await import('/src/Cities_v2.json?import')).default
    const { playableIslands, ISLAND_NAMES } = await import('/src/utils/islands.ts')
    const { playableAirports, AIRPORT_SUGGESTIONS } = await import('/src/utils/airports.ts')
    const { US_CITIES } = await import('/src/data/usCities.ts')
    const { GLOBAL_CITIES } = await import('/src/data/globalCities.ts')
    const { buildDailyChallengeCities } = await import('/src/utils/dailyChallenge.ts')
    const { getEasternDateKey } = await import('/src/utils/easternDate.ts')
    const { getSuggestions } = await import('/src/utils/suggestionMatching.ts')
    const { getGuessCoords } = await import('/src/utils/guessCoords.ts')
    const { buildDirectionalHint } = await import('/src/utils/geo.ts')

    const lastPoint = c => ({ displayName: c.displayName, difficulty: c.difficulty, ...c.points[c.points.length - 1] })
    const sources = { us: cities, global: cities, islands: playableIslands, airports: playableAirports }
    const pools = { us: US_CITIES, global: GLOBAL_CITIES, islands: ISLAND_NAMES, airports: AIRPORT_SUGGESTIONS, daily: [...US_CITIES, ...GLOBAL_CITIES] }

    const answers = mode === 'daily'
      ? buildDailyChallengeCities(cities, getEasternDateKey())
      : sources[mode].filter(c => c.mode === mode && c.difficulty === 'easy').slice(0, 5).map(lastPoint)
    const pool = pools[mode]
    const names = pool.map(p => typeof p === 'string' ? p : p.display)
    const typed = n => mode === 'airports' ? n.match(/\\(([A-Z]{3})\\)$/)[1] : n
    const pickable = n => getSuggestions(typed(n), pool).includes(n) && getGuessCoords(n)

    return answers.map(a => ({
      displayName: a.displayName,
      typed: typed(a.displayName),
      difficulty: a.difficulty,
      wrong: names.filter(n => n !== a.displayName && pickable(n)).slice(0, 2)
        .map(n => ({ name: n, typed: typed(n), hint: buildDirectionalHint(getGuessCoords(n), a, n) })),
    }))
  })(${JSON.stringify(mode)})`)
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Types a guess and picks the exact matching suggestion.
export async function guess(page: Page, typed: string, name: string) {
  const input = page.getByPlaceholder(/Type a/)
  await input.fill('')
  await input.fill(typed)
  await page.locator('li').filter({ hasText: new RegExp(`^${escapeRegExp(name)}$`) }).first().dispatchEvent('mousedown')
}

export const timerWidth = (page: Page) =>
  page.getByTestId('timer-fill').evaluate(el => parseFloat((el as HTMLElement).style.width))

// Advances game time until the round clock has started, then leaves the
// clock exactly 200ms into the round (the timer's first tick), within 10ms.
export async function waitForRoundStart(page: Page) {
  const before = await timerWidth(page)
  for (let i = 0; i < 400; i++) {
    await page.clock.runFor(10)
    if ((await timerWidth(page)) < before - 0.01) return
  }
  throw new Error('round clock never started')
}

// Plays forward to `seconds` into the round (call right after waitForRoundStart).
export const playUntil = (page: Page, seconds: number) => page.clock.runFor(seconds * 1000 - 200)

export async function roundResult(page: Page) {
  const card = page.locator('p')
  await expect(card.filter({ hasText: / pts/ })).toBeVisible()
  const text = (await card.allTextContents()).join(' | ')
  const pts = text.match(/\+(\d+) pts/)
  return { text, points: pts ? Number(pts[1]) : 0, timedOut: (await page.getByText("Time's Up").count()) > 0 }
}

export const nextRound = (page: Page) => page.getByRole('button', { name: /Next Round|Summary/ }).click()
