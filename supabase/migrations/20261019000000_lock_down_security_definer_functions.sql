-- Locks down the SECURITY DEFINER functions flagged by the Supabase Security
-- Advisor ("Public / Signed-In Users Can Execute SECURITY DEFINER Function").
--
-- Supabase grants EXECUTE on every new public-schema function to anon and
-- authenticated by default, which makes it callable by anyone holding the
-- (browser-shipped) publishable key at /rest/v1/rpc/<name>. A definer function
-- runs with its owner's rights and bypasses RLS, so only functions that are
-- meant to be a public API should keep that grant. Postgres also grants
-- EXECUTE to PUBLIC by default, which anon/authenticated inherit, so each
-- revoke covers all three. service_role and the owner keep access.

-- Signup trigger only; never meant to be called directly. The trigger keeps
-- working: Postgres checks EXECUTE when a trigger is created, not when it fires.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Not created by these migrations (it exists in the hosted project, outside
-- version control), hence the guard. Same reasoning as above: it's a trigger
-- function, not an API.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;

-- Leaderboards: granted to anon/authenticated by the init migration, but no
-- client code calls them yet, and display_name defaults to the player's email
-- prefix (handle_new_user) with no way to change it in the UI. Left public,
-- anyone could list the email usernames of every player with a score or
-- streak. Locked down until a leaderboard UI exists; re-grant then with
--   grant execute on function public.daily_leaderboard(text) to anon, authenticated;
--   grant execute on function public.streak_leaderboard()     to anon, authenticated;
revoke execute on function public.daily_leaderboard(text) from public, anon, authenticated;
revoke execute on function public.streak_leaderboard()     from public, anon, authenticated;
