import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import citiesV2Json from '../src/Cities_v2.json'
import type { CityWithPoints } from '../src/utils/mapboxUtils'
import { buildDailyChallengeCities } from '../src/utils/dailyChallenge'

// /api/submit-daily with Supabase replaced by a stub: no network, but the real
// handler code (auth check, validation, server-side re-scoring, RPC payload).
const getUser = vi.fn()
const rpc = vi.fn()
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { getUser }, rpc }) }))

const TODAY = '2026-11-17'
const MULT = { easy: 1, medium: 2, hard: 3, extreme: 4 } as const
const difficulties = buildDailyChallengeCities(citiesV2Json as CityWithPoints[], TODAY).map(c => c.difficulty)

type Handler = (req: unknown, res: unknown) => Promise<unknown>
let handler: Handler

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(`${TODAY}T17:00:00Z`))
  vi.stubEnv('SUPABASE_URL', 'http://supabase.test')
  vi.stubEnv('SUPABASE_SECRET_KEY', 'test-secret')
  handler = (await import('../functions-src/submit-daily')).default as Handler
})

afterAll(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

beforeEach(() => {
  getUser.mockReset().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  rpc.mockReset().mockResolvedValue({ data: [{ current_streak: 3, best_streak: 5 }], error: null })
})

async function call(body: unknown, { method = 'POST', token = 'jwt' }: { method?: string; token?: string | null } = {}) {
  let status = 0
  let json: Record<string, unknown> = {}
  const res = { status(code: number) { status = code; return { json(b: Record<string, unknown>) { json = b } } } }
  await handler({ method, headers: token ? { authorization: `Bearer ${token}` } : {}, body }, res)
  return { status, json }
}

const rounds = (...r: { elapsedSeconds: unknown; wrongGuesses?: unknown }[]) => ({ dateKey: TODAY, rounds: r })

describe('submit-daily handler', () => {
  it('re-scores every round itself and stores only its own numbers', async () => {
    // Expected scores worked out by hand from the formula, not via scoreRound.
    const base = [1000 - 30 * 3, 1000 - 30 * 5 - 200, 0, 1000 - 30 * 10 - 100, 1000]
    const { status, json } = await call(rounds(
      { elapsedSeconds: 3, wrongGuesses: 0 },
      { elapsedSeconds: 5, wrongGuesses: 2 },
      { elapsedSeconds: 4, wrongGuesses: 8 }, // score clock 30.7s: timed out
      { elapsedSeconds: 10, wrongGuesses: 1 },
      { elapsedSeconds: 0 },
    ))
    const expected = base.map((b, i) => b * MULT[difficulties[i]])
    expect(status).toBe(200)
    expect(json).toMatchObject({ totalScore: expected.reduce((a, b) => a + b, 0), currentStreak: 3, bestStreak: 5 })
    const args = rpc.mock.calls[0]
    expect(args[0]).toBe('submit_daily_run')
    expect(args[1]).toMatchObject({ p_user_id: 'user-1', p_date_key: TODAY, p_total_score: json.totalScore })
    expect(args[1].p_rounds.map((r: { score: number }) => r.score)).toEqual(expected)
    expect(args[1].p_rounds.map((r: { difficulty: string }) => r.difficulty)).toEqual(difficulties)
  })

  it('treats junk wrongGuesses as 0 and clamps elapsed time', async () => {
    const { json } = await call(rounds(
      { elapsedSeconds: 5, wrongGuesses: -5 },
      { elapsedSeconds: 5, wrongGuesses: 'abc' },
      { elapsedSeconds: -3 },
      { elapsedSeconds: 99 },
      { elapsedSeconds: 'fast' },
    ))
    const p = rpc.mock.calls[0][1].p_rounds
    expect(p.map((r: { wrongGuesses: number }) => r.wrongGuesses)).toEqual([0, 0, 0, 0, 0])
    expect(p.map((r: { elapsedSeconds: number }) => r.elapsedSeconds)).toEqual([5, 5, 0, 30, 30])
    expect(p.map((r: { score: number }) => r.score)).toEqual([850, 850, 1000, 0, 0].map((b, i) => b * MULT[difficulties[i]]))
    expect(json.totalScore).toBe(p.reduce((a: number, r: { score: number }) => a + r.score, 0))
  })

  it.each([
    ['a non-POST request', { method: 'GET' }, rounds(), 405],
    ['a missing token', { token: null }, rounds(), 401],
    ['another day', {}, { dateKey: '2026-11-16', rounds: [] }, 400],
    ['rounds that are not an array', {}, { dateKey: TODAY, rounds: 'nope' }, 400],
    ['the wrong number of rounds', {}, rounds({ elapsedSeconds: 1 }), 400],
  ])('rejects %s', async (_label, opts, body, code) => {
    expect((await call(body, opts)).status).toBe(code)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('rejects an invalid session', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad jwt' } })
    expect((await call(rounds())).status).toBe(401)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('reports a failed write as a 500', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'duplicate key' } })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const five = Array.from({ length: 5 }, () => ({ elapsedSeconds: 5 }))
    expect((await call(rounds(...five))).status).toBe(500)
  })
})
