-- Atomic writer for a validated Daily Challenge submission.
--
-- This is the ONLY thing that writes public.daily_results and the streak
-- columns on public.profiles. It is called exclusively by the /api/submit-daily
-- Vercel Function *after* that function has authenticated the user and
-- re-derived the score server-side from the day's deterministic city set — so
-- p_total_score here is already trusted. Execute is granted to service_role
-- only: the anon/authenticated client can never reach it directly, which is
-- what forces every daily score to go through server-side re-derivation instead
-- of being injected straight into the leaderboard.
--
-- Runs security definer (as the table owner) so it can insert into
-- daily_results and bump the streak columns despite the RLS lockdown in the
-- init migration. The whole body is one statement batch inside a single
-- function call, so the insert and the streak update commit together or not at
-- all.
create function public.submit_daily_run(
  p_user_id     uuid,
  p_date_key    text,
  p_total_score int,
  p_rounds      jsonb
)
returns table (current_streak int, best_streak int)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_last text;
  v_cur  int;
  v_best int;
  v_next int;
begin
  -- Insert the verified result. The unique (user_id, date_key) constraint from
  -- the init migration makes a second submission for the same day a no-op.
  insert into public.daily_results (user_id, date_key, total_score, rounds)
  values (p_user_id, p_date_key, p_total_score, p_rounds)
  on conflict (user_id, date_key) do nothing;

  -- Duplicate submission: nothing was inserted, so leave the streak untouched
  -- and just report the current values back to the caller.
  if not found then
    select p.current_streak, p.best_streak
      into v_cur, v_best
      from public.profiles p
     where p.id = p_user_id;
    current_streak := coalesce(v_cur, 0);
    best_streak    := coalesce(v_best, 0);
    return next;
    return;
  end if;

  select p.last_daily_date_key, p.current_streak, p.best_streak
    into v_last, v_cur, v_best
    from public.profiles p
   where p.id = p_user_id;

  -- Consecutive if the previous completion was the calendar day immediately
  -- before this one (matches the client's previousDateKey math in easternDate).
  if v_last = to_char((to_date(p_date_key, 'YYYY-MM-DD') - 1), 'YYYY-MM-DD') then
    v_next := coalesce(v_cur, 0) + 1;
  else
    v_next := 1;
  end if;

  update public.profiles
     set current_streak      = v_next,
         best_streak         = greatest(coalesce(v_best, 0), v_next),
         last_daily_date_key = p_date_key
   where id = p_user_id;

  current_streak := v_next;
  best_streak    := greatest(coalesce(v_best, 0), v_next);
  return next;
end;
$$;

-- Lock it to the service role: no client key (anon or authenticated) may call
-- it, so the Vercel Function's re-derivation can't be bypassed.
revoke all on function public.submit_daily_run(uuid, text, int, jsonb) from public;
revoke all on function public.submit_daily_run(uuid, text, int, jsonb) from anon, authenticated;
grant execute on function public.submit_daily_run(uuid, text, int, jsonb) to service_role;
