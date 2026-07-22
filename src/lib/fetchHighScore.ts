import { supabase } from './supabase'
import type { Difficulty, GameMode } from '../utils/mapboxUtils'

// Server-side personal best for a mode+difficulty, for signed-in players.
// localStorage-only high scores (see utils/highScores) go stale across
// devices — a score set on a phone isn't visible when the same account
// plays on a laptop. When a session exists, this is the source of truth
// instead; the caller falls back to the localStorage record when it
// returns null (guest, Supabase not configured, or a fetch error).
//
// Best-effort and non-blocking, matching submitDailyRun/submitGameResult:
// any error is swallowed and treated the same as "no session".
export async function fetchServerHighScore(
  mode: GameMode,
  difficulty: Difficulty | null
): Promise<number | null> {
  if (!supabase) return null

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  // Daily Challenge has no difficulty tiers and is validated server-side in
  // daily_results; every other mode's best lives in game_results. Both tables
  // are owner-selectable under RLS, so no explicit user_id filter is needed.
  const query = mode === 'daily'
    ? supabase.from('daily_results').select('total_score')
    : supabase.from('game_results').select('total_score').eq('mode', mode).eq('difficulty', difficulty)

  const { data, error } = await query
    .order('total_score', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.warn('fetchServerHighScore: query failed', error.message)
    return null
  }
  return data ? data.total_score : 0
}
