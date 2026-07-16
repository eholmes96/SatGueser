-- Islands becomes a real game mode. game_results.mode previously allowed only
-- 'us' and 'global'; widen the CHECK constraint to accept 'islands' so finished
-- Islands games can be recorded to personal history (same path as US/Global).
-- The difficulty CHECK is unchanged: Islands reuse easy/medium/hard, and the
-- 'undetermined' bucket is excluded from play (dev sandbox only).

alter table public.game_results drop constraint game_results_mode_check;

alter table public.game_results add constraint game_results_mode_check
  check (mode in ('us', 'global', 'islands'));
