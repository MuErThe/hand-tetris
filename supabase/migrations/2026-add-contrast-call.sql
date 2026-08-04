-- ============================================================
-- Migration: allow Contrast Call scores
-- ============================================================
-- Adds 'contrast-call' to the game whitelist in submit_game_score.
-- SAFE ON LIVE DATA: replaces one function body, touches no rows.
--
-- SUPERSEDES 2026-add-double-take.sql — this replaces the whole function
-- and whitelists BOTH new games, so running only this one is enough.
-- Running both, in order, is also fine.
--
-- Until this runs, Double Take and Contrast Call submissions are rejected
-- with 'unknown_game' and their boards stay empty. Both games still play
-- and still record local progress.
--
-- Run ONCE in the Supabase SQL Editor.
-- ============================================================

create or replace function public.submit_game_score(
  p_name          text,
  p_token         text,
  p_game          text,
  p_score         int,
  p_meta          jsonb,
  p_play_time_ms  int
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stored_token  text;
  v_recent        int;
  v_lines         int;
  v_level         int;
  v_max_plausible int;
begin
  if p_game not in ('tetris', 'eyeball-it', 'kern-combat', 'colour-forge', 'double-take', 'contrast-call') then
    raise exception 'unknown_game';
  end if;

  select token into v_stored_token
    from public.players
    where name = p_name;
  if v_stored_token is null then
    raise exception 'unknown_name';
  end if;
  if v_stored_token != p_token then
    raise exception 'bad_token';
  end if;

  if p_score < 0 or p_play_time_ms < 0 then
    raise exception 'invalid_range';
  end if;

  if p_game = 'tetris' then
    v_lines := coalesce((p_meta->>'lines')::int, 0);
    v_level := coalesce((p_meta->>'level')::int, 1);
    if v_level < 1 or v_lines < 0 then
      raise exception 'invalid_range';
    end if;
    v_max_plausible := (v_lines + 4) * 800 * v_level + (v_level * 1000);
    if p_score > v_max_plausible then
      raise exception 'implausible_score';
    end if;
    if p_play_time_ms < v_lines * 600 then
      raise exception 'implausible_time';
    end if;
  else
    if p_score > 100000 then
      raise exception 'implausible_score';
    end if;
    if p_play_time_ms < 2000 then
      raise exception 'implausible_time';
    end if;
  end if;

  select count(*) into v_recent
    from public.scores
    where name = p_name
      and game = p_game
      and created_at > now() - interval '10 seconds';
  if v_recent > 0 then
    raise exception 'rate_limited';
  end if;

  insert into public.scores (name, game, score, meta, play_time_ms)
    values (p_name, p_game, p_score, coalesce(p_meta, '{}'::jsonb), p_play_time_ms);
end;
$$;
