import { supabase } from './supabase'
import type { Difficulty, Mode } from '../utils/mapboxUtils'
import type { DailyRoundResult } from '../utils/dailyChallengeStorage'

// Records a finished US or Global game to the player's personal history.
//
// Unlike the Daily Challenge, these modes draw random cities, so a score can't
// be re-derived or validated server-side — they're personal stats, never a
// leaderboard (see the game_results design note in the init migration). So the
// client inserts its own row directly under RLS (the game_results_insert_own
// policy checks auth.uid() = user_id); no Edge Function is involved.
//
// Best-effort and non-blocking: guests (no session) skip it, and any error is
// swallowed so a failed sync never disrupts the end-of-game screen.

export async function submitGameResult(
  mode: Mode,
  difficulty: Difficulty,
  totalScore: number,
  rounds: DailyRoundResult[]
): Promise<void> {
  if (!supabase) return

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return

  const { error } = await supabase.from('game_results').insert({
    user_id: session.user.id,
    mode,
    difficulty,
    total_score: totalScore,
    rounds,
  })
  if (error) console.warn('submitGameResult: insert failed', error.message)
}
