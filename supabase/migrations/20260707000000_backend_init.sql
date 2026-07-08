-- SatGueser backend: schema, row-level security, and public leaderboard RPCs.
--
-- Design notes:
--  * daily_results is written ONLY by the submit-daily Edge Function (service
--    role, which bypasses RLS). There is deliberately no client insert policy,
--    so a validated daily score cannot be injected with the anon key.
--  * Streak fields on profiles are server-authoritative: clients may edit only
--    display_name (enforced by column-level grants below), never their streak.
--  * Leaderboards are exposed as security-definer functions returning only
--    non-PII columns (display_name + scores), so no email / user_id / raw
--    round data ever leaves the database. Email lives in auth.users, never here.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- One row per authenticated user. display_name is the only publicly exposed
-- field (via the leaderboard functions).
create table public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  display_name       text,
  current_streak     int  not null default 0,
  best_streak        int  not null default 0,
  last_daily_date_key text,
  created_at         timestamptz not null default now()
);

-- One row per user per Eastern calendar day. Written only by the Edge Function.
create table public.daily_results (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  date_key     text not null,
  total_score  int  not null,
  rounds       jsonb not null,
  created_at   timestamptz not null default now(),
  unique (user_id, date_key)
);
create index daily_results_date_key_idx on public.daily_results (date_key);
create index daily_results_user_idx     on public.daily_results (user_id);

-- US / Global mode history: personal stats only, never leaderboard. These are
-- non-deterministic (random city draw) so scores are trust-the-client; the
-- owner inserts them directly under RLS.
create table public.game_results (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  mode         text not null check (mode in ('us', 'global')),
  difficulty   text not null check (difficulty in ('easy', 'medium', 'hard')),
  total_score  int  not null,
  rounds       jsonb not null,
  created_at   timestamptz not null default now()
);
create index game_results_user_idx on public.game_results (user_id);

-- ---------------------------------------------------------------------------
-- Auto-create a profile row on signup
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.daily_results enable row level security;
alter table public.game_results  enable row level security;

-- profiles: a user sees and edits only their own row. (Row insert is done by
-- the signup trigger, which runs as definer.)
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Column-level lockdown: clients may edit ONLY display_name. Streak fields are
-- written exclusively by the Edge Function (service role), so a user can't bump
-- their own best_streak via the anon key and top the streak leaderboard.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

-- daily_results: owner may read own rows. No insert/update/delete policy exists,
-- so RLS blocks every client write; only the service-role Edge Function writes.
create policy "daily_results_select_own" on public.daily_results
  for select using (auth.uid() = user_id);

-- game_results: owner may read and insert their own rows.
create policy "game_results_select_own" on public.game_results
  for select using (auth.uid() = user_id);
create policy "game_results_insert_own" on public.game_results
  for insert with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Public leaderboards (security-definer RPCs — expose only non-PII columns)
-- ---------------------------------------------------------------------------

-- Top scores for a given Eastern date. Callable by signed-out visitors.
create function public.daily_leaderboard(p_date_key text)
returns table (display_name text, total_score int)
language sql
security definer set search_path = ''
stable
as $$
  select p.display_name, d.total_score
  from public.daily_results d
  join public.profiles p on p.id = d.user_id
  where d.date_key = p_date_key
  order by d.total_score desc, d.created_at asc
  limit 100;
$$;

-- All-time streak leaderboard.
create function public.streak_leaderboard()
returns table (display_name text, current_streak int, best_streak int)
language sql
security definer set search_path = ''
stable
as $$
  select p.display_name, p.current_streak, p.best_streak
  from public.profiles p
  where p.best_streak > 0
  order by p.best_streak desc, p.current_streak desc
  limit 100;
$$;

grant execute on function public.daily_leaderboard(text) to anon, authenticated;
grant execute on function public.streak_leaderboard()     to anon, authenticated;
