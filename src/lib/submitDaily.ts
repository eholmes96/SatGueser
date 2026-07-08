import { supabase } from './supabase'
import type { DailyRoundResult } from '../utils/dailyChallengeStorage'

// Client half of the daily submission. Sends the finished run to the
// /api/submit-daily Vercel Function, which authenticates the user, re-derives
// the score, and writes the leaderboard row + streak. We deliberately send only
// each round's elapsedSeconds — the server recomputes difficulty and score, so
// there's no point shipping (or trusting) the client's own totals.
//
// This is best-effort and non-blocking: guests (no Supabase session) simply
// skip it and keep their localStorage record, and a network/one-per-day error
// is swallowed so a failed sync never breaks the end-of-game UI.

export interface DailySubmitResult {
  totalScore: number
  currentStreak: number
  bestStreak: number
}

export async function submitDailyRun(
  dateKey: string,
  rounds: DailyRoundResult[]
): Promise<DailySubmitResult | null> {
  if (!supabase) return null

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  try {
    const res = await fetch('/api/submit-daily', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        dateKey,
        rounds: rounds.map(r => ({ elapsedSeconds: r.elapsedSeconds })),
      }),
    })
    if (!res.ok) {
      console.warn('submitDailyRun: server rejected submission', res.status)
      return null
    }
    return (await res.json()) as DailySubmitResult
  } catch (err) {
    console.warn('submitDailyRun: network error', err)
    return null
  }
}
