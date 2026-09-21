-- Airports becomes a real game mode. game_results.mode previously allowed
-- only 'us', 'global', and 'islands'; widen the CHECK constraint to accept
-- 'airports' so finished Airports games can be recorded to personal history
-- (same path as US/Global/Islands). The difficulty CHECK is unchanged:
-- Airports reuse easy/medium/hard.

alter table public.game_results drop constraint game_results_mode_check;

alter table public.game_results add constraint game_results_mode_check
  check (mode in ('us', 'global', 'islands', 'airports'));
