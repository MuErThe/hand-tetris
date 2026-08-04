-- CREATIVE ARCADE leaderboard schema (multi-game)
-- Run this once in the Supabase SQL Editor for a FRESH project.
-- Idempotent: safe to re-run (drops + recreates) — but on a project that
-- already has live scores, run supabase/migrations/2026-add-game-column.sql
-- instead, which preserves existing rows.

-- ============================================================
-- 1. Schema reset
-- ============================================================

drop function if exists public.submit_game_score(text, text, text, int, jsonb, int) cascade;
drop function if exists public.reserve_name(text) cascade;
drop function if exists public.top_game_scores(text, int) cascade;
drop function if exists public.claim_legacy_player(text, text) cascade;
drop function if exists public.touch_account_state() cascade;
drop table if exists public.scores cascade;
drop table if exists public.players cascade;
drop table if exists public.account_state cascade;

-- ============================================================
-- 2. Tables
--    `players` is a single arcade identity (name + secret token) shared
--    across every game. `scores` is generic: each row belongs to a `game`
--    and carries a `meta` blob of that game's stats.
-- ============================================================

create table public.players (
  -- Stored as TEXT (case-preserving display). Uniqueness is enforced
  -- case-insensitively via the unique index below so "ZAB" and "zab" collide.
  name        text primary key,
  token       text not null,
  -- Optional link to a Supabase auth user (anonymous, upgraded to Google on
  -- log-in), so a player's history follows their account. One name per user.
  user_id     uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  constraint players_name_len check (char_length(name) between 3 and 16),
  constraint players_name_charset check (name ~ '^[A-Za-z0-9_-]+$')
);

create unique index players_name_ci on public.players ((lower(name)));
create unique index players_user_id_unique
  on public.players (user_id) where user_id is not null;

create table public.scores (
  id            uuid primary key default gen_random_uuid(),
  name          text  not null references public.players(name) on delete cascade,
  game          text  not null,
  score         int   not null check (score >= 0),
  meta          jsonb not null default '{}'::jsonb,
  play_time_ms  int   not null check (play_time_ms >= 0),
  created_at    timestamptz not null default now()
);

create index scores_game_top on public.scores (game, score desc, created_at desc);
create index scores_by_name on public.scores (name);

-- ============================================================
-- 3. Row-level security
--    Public can READ both tables. All writes go through RPC functions
--    that run with elevated privilege (security definer), so direct
--    INSERT/UPDATE/DELETE from the anon key is blocked.
-- ============================================================

alter table public.players enable row level security;
alter table public.scores  enable row level security;

drop policy if exists "players_read"  on public.players;
drop policy if exists "scores_read"   on public.scores;

create policy "players_read" on public.players for select using (true);
create policy "scores_read"  on public.scores  for select using (true);

-- No INSERT/UPDATE/DELETE policies → only definer functions can write.

-- ============================================================
-- 4. RPC: reserve_name(name) → token
--    One identity used across all games.
-- ============================================================

create or replace function public.reserve_name(p_name text)
returns text
language plpgsql
security definer
-- `extensions` is on the path so we can call gen_random_bytes (pgcrypto).
set search_path = public, extensions
as $$
declare
  v_token text;
  v_lower text;
  v_bad   text;
  v_uid   uuid;
begin
  if p_name is null then
    raise exception 'name_required';
  end if;

  p_name := trim(p_name);

  if char_length(p_name) < 3 or char_length(p_name) > 16 then
    raise exception 'name_length';
  end if;

  if p_name !~ '^[A-Za-z0-9_-]+$' then
    raise exception 'name_charset';
  end if;

  v_lower := lower(p_name);

  -- Profanity blocklist (substring match, case-insensitive).
  for v_bad in
    select unnest(array[
      'fuck','shit','bitch','asshole','dick','cunt','nigger','nigga',
      'faggot','retard','slut','whore','rape','bastard','nazi','pussy'
    ])
  loop
    if position(v_bad in v_lower) > 0 then
      raise exception 'name_profanity';
    end if;
  end loop;

  if exists (select 1 from public.players where lower(name) = v_lower) then
    raise exception 'name_taken';
  end if;

  -- One identity per account: link the fresh name to the caller's auth user
  -- unless that user already owns another name.
  v_uid := auth.uid();
  if v_uid is not null
     and exists (select 1 from public.players where user_id = v_uid) then
    v_uid := null;
  end if;

  v_token := encode(gen_random_bytes(16), 'hex');
  insert into public.players (name, token, user_id) values (p_name, v_token, v_uid);
  return v_token;
end;
$$;

-- ============================================================
-- 4b. RPC: claim_legacy_player(name, token) → linked?
--     Links a pre-auth identity to the caller's auth user so history
--     survives a log-in. True when the link is in place after the call.
-- ============================================================

create or replace function public.claim_legacy_player(p_name text, p_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_linked uuid;
begin
  if v_uid is null or p_name is null or p_token is null then
    return false;
  end if;

  -- The caller already owns a name: true only if it's this one.
  if exists (select 1 from public.players where user_id = v_uid) then
    return exists (
      select 1 from public.players where name = p_name and user_id = v_uid
    );
  end if;

  select user_id into v_linked
    from public.players
    where name = p_name and token = p_token;
  if not found then
    return false;  -- unknown name or wrong token
  end if;

  -- Link when free, or re-link when the current holder is an anonymous
  -- session (pre-upgrade, possibly from another device) — the token is the
  -- proof of ownership. Never take a name off a real account.
  if v_linked is null
     or v_linked = v_uid
     or exists (
       select 1 from auth.users u where u.id = v_linked and u.is_anonymous
     ) then
    update public.players
      set user_id = v_uid
      where name = p_name and token = p_token;
    return true;
  end if;

  return false;
end;
$$;

-- ============================================================
-- 5. RPC: submit_game_score(name, token, game, score, meta, play_time_ms)
--    - authenticates name via token
--    - validates plausibility per game (Tetris tight; others relaxed)
--    - 10-second per-player-per-game rate limit
-- ============================================================

create or replace function public.submit_game_score(
  p_name          text,
  p_token         text,
  p_game          text,
  p_score         int,
  p_meta          jsonb,
  p_play_time_ms  int
)
returns void
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
  if p_game not in ('tetris', 'eyeball-it', 'kern-combat', 'colour-forge', 'double-take', 'contrast-call', 'steady-hand', 'cutout') then
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

-- ============================================================
-- 6. RPC: top_game_scores(game, limit) → ordered list
--    Returns each player's BEST score for that game (one row per name).
-- ============================================================

create or replace function public.top_game_scores(p_game text, p_limit int default 10)
returns table (
  rank        int,
  name        text,
  score       int,
  meta        jsonb,
  created_at  timestamptz
)
language sql
security definer
set search_path = public
as $$
  with best as (
    select distinct on (s.name)
      s.name, s.score, s.meta, s.created_at
    from public.scores s
    where s.game = p_game
    order by s.name, s.score desc, s.created_at asc
  )
  select
    cast(row_number() over (order by b.score desc, b.created_at asc) as int) as rank,
    b.name, b.score, b.meta, b.created_at
  from best b
  order by b.score desc, b.created_at asc
  limit greatest(1, least(coalesce(p_limit, 10), 100));
$$;

-- ============================================================
-- 7. Auto-dedup trigger
--    When a new row is inserted, drop any older row from the SAME player
--    and SAME game with identical (score, meta). Keeps the table tidy
--    without ever touching another player's rows.
-- ============================================================

create or replace function public.dedup_score_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.scores
  where id <> new.id
    and name = new.name
    and game = new.game
    and score = new.score
    and meta = new.meta
    and created_at < new.created_at;
  return new;
end;
$$;

drop trigger if exists scores_dedup_after_insert on public.scores;
create trigger scores_dedup_after_insert
  after insert on public.scores
  for each row execute function public.dedup_score_after_insert();

-- ============================================================
-- 8. Permissions. A session flips PostgREST from `anon` to `authenticated`,
--    so every function must be executable by BOTH roles — without this,
--    submissions would silently fail the moment sessions exist.
-- ============================================================

grant execute on function public.reserve_name(text)                                    to anon, authenticated;
grant execute on function public.submit_game_score(text, text, text, int, jsonb, int) to anon, authenticated;
grant execute on function public.top_game_scores(text, int)                            to anon, authenticated;
grant execute on function public.claim_legacy_player(text, text)                       to anon, authenticated;

-- ============================================================
-- 9. Cross-device sync: one account_state row per auth user carries the
--    arcade identity, warm-up streak and per-game progress. User-owned
--    data, so plain RLS does the guarding; the anon role gets no access.
-- ============================================================

create table public.account_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  -- { name, token } — the arcade identity this account plays as.
  player     jsonb,
  -- { count, lastDay } — mirrors arcade/v1/warmup-streak.
  streak     jsonb not null default '{}'::jsonb,
  -- { [gameId]: SessionRecord[] } — mirrors arcade/v1/progress/<game>.
  progress   jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  -- Sanity caps: this mirrors small local state, not a dumping ground.
  constraint account_state_player_size   check (pg_column_size(player)   <= 2048),
  constraint account_state_streak_size   check (pg_column_size(streak)   <= 2048),
  constraint account_state_progress_size check (pg_column_size(progress) <= 262144)
);

alter table public.account_state enable row level security;

create policy "account_state_select" on public.account_state
  for select using (auth.uid() = user_id);
create policy "account_state_insert" on public.account_state
  for insert with check (auth.uid() = user_id);
create policy "account_state_update" on public.account_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update on public.account_state to authenticated;

create or replace function public.touch_account_state()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger account_state_touch
  before update on public.account_state
  for each row execute function public.touch_account_state();

-- Done. From a fresh Supabase project: open SQL Editor, paste, run.
