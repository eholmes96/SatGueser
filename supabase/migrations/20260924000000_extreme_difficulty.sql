-- Airports gains a fourth "extreme" difficulty tier. game_results.difficulty
-- previously allowed only 'easy', 'medium', and 'hard' (inline CHECK from
-- backend_init, auto-named game_results_difficulty_check); widen it so
-- finished Extreme Airports games can be recorded to personal history.

alter table public.game_results drop constraint if exists game_results_difficulty_check;

alter table public.game_results add constraint game_results_difficulty_check
  check (difficulty in ('easy', 'medium', 'hard', 'extreme'));
