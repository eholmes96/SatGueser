import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import citiesV2Json from '../src/Cities_v2.json'
import type { CityWithPoints } from '../src/utils/mapboxUtils'
import { buildDailyChallengeCities } from '../src/utils/dailyChallenge'
import { scoreRound, ROUND_DURATION } from '../src/utils/scoring'
import { getEasternDateKey } from '../src/utils/easternDate'

// Server-side writer for a Daily Challenge submission — the trusted half of the
// anti-cheat design. The daily leaderboard is the app's one competitive surface,
// and the schema deliberately gives clients NO way to write public.daily_results
// (see the init migration). This function is that missing writer: it runs with
// the Supabase secret (service_role) key, but it does not trust the caller's
// numbers. It re-derives the score from the day's deterministic city set — the
// exact same buildDailyChallengeCities / scoreRound the browser ran — and only
// the value it computes itself is stored.
//
// Trust model: the client sends only each round's elapsedSeconds. Difficulty
// (and thus the 1x/2x/3x multiplier) is re-derived here from the deterministic
// day, so a tampered client can't claim all-hard rounds; and the score curve is
// recomputed, so it can't inflate the total. What this design canNOT prove is
// that a guess was actually correct (the answers ship in the client bundle, and
// there's no per-guess server round-trip), so a determined reverse-engineer
// could still submit elapsedSeconds=0. That's the inherent ceiling for a
// client-authoritative-answer game; everything short of it is enforced here.

const allCities = citiesV2Json as CityWithPoints[]

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY

interface SubmitBody {
  dateKey: string
  rounds: { elapsedSeconds: number }[]
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    // Misconfiguration, not a client error — surface clearly in logs.
    console.error('submit-daily: missing SUPABASE_URL or SUPABASE_SECRET_KEY')
    return res.status(500).json({ error: 'Server not configured' })
  }

  // --- Authenticate the caller from their Supabase JWT ---------------------
  const authHeader = req.headers.authorization ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' })
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userError } = await admin.auth.getUser(token)
  if (userError || !userData.user) {
    return res.status(401).json({ error: 'Invalid session' })
  }
  const userId = userData.user.id

  // --- Validate the payload ------------------------------------------------
  const body = req.body as SubmitBody | undefined
  const dateKey = body?.dateKey
  const rounds = body?.rounds

  // Submissions are only accepted for the current Eastern day. This both stops
  // back-filling old days and makes the streak math well-defined.
  if (!dateKey || dateKey !== getEasternDateKey()) {
    return res.status(400).json({ error: 'Submission must be for the current daily date' })
  }
  if (!Array.isArray(rounds)) {
    return res.status(400).json({ error: 'rounds must be an array' })
  }

  // Rebuild the exact day the player saw and re-derive each round's difficulty.
  const cities = buildDailyChallengeCities(allCities, dateKey)
  if (rounds.length !== cities.length) {
    return res.status(400).json({ error: `Expected ${cities.length} rounds` })
  }

  // --- Re-score every round server-side ------------------------------------
  const verifiedRounds = cities.map((city, i) => {
    const raw = Number(rounds[i]?.elapsedSeconds)
    const elapsed = Number.isFinite(raw) ? Math.min(Math.max(raw, 0), ROUND_DURATION) : ROUND_DURATION
    // A round that ran the full clock is a timeout (no correct guess) and scores
    // 0 — matching the client, where scoreRound's positive floor is bypassed for
    // an expired round. Anything under the limit is a correct guess, scored on
    // the shared time+difficulty curve.
    const score = elapsed >= ROUND_DURATION ? 0 : scoreRound(elapsed, city.difficulty)
    return { difficulty: city.difficulty, elapsedSeconds: elapsed, score }
  })

  const totalScore = verifiedRounds.reduce((sum, r) => sum + r.score, 0)

  // --- Persist atomically (insert + streak) via the service-role RPC -------
  const { data, error } = await admin.rpc('submit_daily_run', {
    p_user_id: userId,
    p_date_key: dateKey,
    p_total_score: totalScore,
    p_rounds: verifiedRounds,
  })

  if (error) {
    console.error('submit-daily: submit_daily_run failed', error)
    return res.status(500).json({ error: 'Failed to record submission' })
  }

  // The RPC returns a single row: the user's authoritative streak after this run.
  const streak = Array.isArray(data) ? data[0] : data
  return res.status(200).json({
    totalScore,
    rounds: verifiedRounds,
    currentStreak: streak?.current_streak ?? 0,
    bestStreak: streak?.best_streak ?? 0,
  })
}
