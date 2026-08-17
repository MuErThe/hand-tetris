-- ============================================================
-- SQUINT: the whole database, in one file
-- ============================================================
-- This replaces every earlier schema and migration snippet. Keep this one
-- saved in the SQL Editor and delete the others.
--
-- SAFE ON LIVE DATA. It creates only what is missing, migrates the old
-- Tetris-only `scores` shape forward, and replaces function bodies in
-- place. It contains no drop table, no delete and no truncate, so no score
-- row and no player can be lost by running it.
--
-- Old Tetris scores are kept in full. If this project still has the
-- original `lines` and `level` columns, each row's values are folded into
-- its `meta` blob BEFORE those columns go, so nothing is thrown away: a
-- run that read 88 lines at level 9 comes out as
-- meta = {"lines": 88, "level": 9} and keeps its score, name and date.
--
-- Safe to re-run at any time, and re-running is how you apply changes:
-- edit this file, paste the whole thing, run it.
--
-- WANT A SAFETY NET FIRST? Run this one line on its own, before the rest.
-- It photocopies the score table, costs nothing, and can be dropped later:
--
--   create table if not exists public.scores_backup as select * from public.scores;
--
-- To check afterwards that everything came through:
--
--   select (select count(*) from public.scores_backup) as before,
--          (select count(*) from public.scores)        as after;
--
-- Dashboard prerequisites, one time, outside SQL:
--   1. Authentication > Sign In / Up: enable "Allow anonymous sign-ins".
--      Until that is on, signInAnonymously() fails and the client falls
--      back to the legacy name+token flow.
--   2. Authentication > Providers > Google: enable it and paste the GCP
--      OAuth client id and secret. The authorised redirect URI is
--      https://<project-ref>.supabase.co/auth/v1/callback
--   3. Authentication > URL Configuration: set the site URL and allow
--      redirects to https://squint.mdzabeeh.com/** and
--      http://localhost:3000/**
--   4. Authentication > Settings: enable manual linking, which is what
--      lets linkIdentity upgrade an anonymous user in place.
--
-- Renaming the Supabase project changes none of the above. The project
-- ref, the API URL and the anon key are fixed at creation.
-- ============================================================


-- ============================================================
-- 1. Tables
--    `players` is one arcade identity (name + secret token) shared across
--    every game, optionally linked to a Supabase auth user. `scores` is
--    generic: each row belongs to a `game` and carries a `meta` blob of
--    that game's own stats.
-- ============================================================

create table if not exists public.players (
  -- Stored as TEXT (case-preserving display). Uniqueness is enforced
  -- case-insensitively via the index below, so "ZAB" and "zab" collide.
  name        text primary key,
  token       text not null,
  -- Optional link to a Supabase auth user (anonymous, upgraded to Google
  -- on log-in), so a player's history follows their account.
  user_id     uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  constraint players_name_len check (char_length(name) between 3 and 16),
  constraint players_name_charset check (name ~ '^[A-Za-z0-9_-]+$')
);

-- Present on projects created before accounts existed.
alter table public.players
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create table if not exists public.scores (
  id            uuid primary key default gen_random_uuid(),
  name          text  not null references public.players(name) on delete cascade,
  game          text  not null,
  score         int   not null check (score >= 0),
  meta          jsonb not null default '{}'::jsonb,
  play_time_ms  int   not null check (play_time_ms >= 0),
  created_at    timestamptz not null default now()
);

create table if not exists public.account_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  -- { name, token }: the arcade identity this account plays as.
  player     jsonb,
  -- { count, lastDay }: mirrors arcade/v1/warmup-streak.
  streak     jsonb not null default '{}'::jsonb,
  -- { [gameId]: SessionRecord[] }: mirrors arcade/v1/progress/<game>.
  progress   jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  -- Sanity caps: this mirrors small local state, not a dumping ground.
  constraint account_state_player_size   check (pg_column_size(player)   <= 2048),
  constraint account_state_streak_size   check (pg_column_size(streak)   <= 2048),
  constraint account_state_progress_size check (pg_column_size(progress) <= 262144)
);


-- ============================================================
-- 2. Forward migration from the Tetris-only shape
--    A no-op on any project already carrying `game` and `meta`. On the
--    original board it adds the two columns, folds lines/level into meta,
--    stamps every existing row as Tetris, and drops the dead columns.
--    Existing scores are preserved throughout.
-- ============================================================

-- The Tetris-only RPCs are superseded by the generic pair below. No CASCADE:
-- if anything unexpected ever depended on them, this should stop and say so
-- rather than quietly drop it.
drop function if exists public.submit_score(text, text, int, int, int, int);
drop function if exists public.top_scores(int);

alter table public.scores add column if not exists game text;
alter table public.scores
  add column if not exists meta jsonb not null default '{}'::jsonb;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'scores'
      and column_name = 'lines'
  ) then
    update public.scores
      set game = coalesce(game, 'tetris'),
          meta = case
                   when meta = '{}'::jsonb
                   then jsonb_build_object('lines', lines, 'level', level)
                   else meta
                 end
      where game is null or meta = '{}'::jsonb;
  else
    update public.scores set game = 'tetris' where game is null;
  end if;
end $$;

alter table public.scores alter column game set not null;
alter table public.scores drop column if exists lines;
alter table public.scores drop column if exists level;


-- ============================================================
-- 3. Indexes
-- ============================================================

create unique index if not exists players_name_ci
  on public.players ((lower(name)));

-- At most one player identity per auth user.
create unique index if not exists players_user_id_unique
  on public.players (user_id) where user_id is not null;

-- The old single-game ordering index, replaced by the per-game one.
drop index if exists public.scores_top;

create index if not exists scores_game_top
  on public.scores (game, score desc, created_at desc);
create index if not exists scores_by_name
  on public.scores (name);


-- ============================================================
-- 4. Row-level security
--    Anyone may READ players and scores. Every write goes through a
--    security-definer RPC, so direct writes with the anon key are blocked.
--    account_state is user-owned, so plain RLS guards it and the anon role
--    gets no access at all.
-- ============================================================

alter table public.players       enable row level security;
alter table public.scores        enable row level security;
alter table public.account_state enable row level security;

drop policy if exists "players_read" on public.players;
drop policy if exists "scores_read"  on public.scores;

create policy "players_read" on public.players for select using (true);
create policy "scores_read"  on public.scores  for select using (true);

-- No insert/update/delete policies, so only definer functions can write.

drop policy if exists "account_state_select" on public.account_state;
drop policy if exists "account_state_insert" on public.account_state;
drop policy if exists "account_state_update" on public.account_state;

create policy "account_state_select" on public.account_state
  for select using (auth.uid() = user_id);
create policy "account_state_insert" on public.account_state
  for insert with check (auth.uid() = user_id);
create policy "account_state_update" on public.account_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ============================================================
-- 5. RPC: reserve_name(name) returns token
--    One identity used across all games. Links the fresh name to the
--    caller's auth user when there is a session and that user does not
--    already own a name.
-- ============================================================

create or replace function public.reserve_name(p_name text)
returns text
language plpgsql
security definer
-- `extensions` is on the path so gen_random_bytes (pgcrypto) resolves.
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
-- 6. RPC: claim_legacy_player(name, token) returns linked?
--    Links a pre-auth identity to the caller's auth user so history
--    survives a log-in. True when the link is in place after the call,
--    including "was already linked to this user".
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

  -- The caller already owns a name: true only if it is this one.
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
  -- session (pre-upgrade, possibly from another device), where the token is
  -- the proof of ownership. Never take a name off a real account.
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
-- 7. RPC: submit_game_score(name, token, game, score, meta, play_time_ms)
--    Authenticates the name via its token, validates plausibility per game
--    (Tetris tight, the rest relaxed), and rate-limits to one submission
--    per player per game per 10 seconds.
--
--    ADDING A GAME: add its id to the whitelist below and re-run this file.
--    Until it is listed, that game's submissions fail with 'unknown_game'
--    and its board stays empty, though the game still plays and still
--    records local progress.
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
  if p_game not in (
    'tetris', 'eyeball-it', 'kern-combat', 'colour-forge',
    'double-take', 'contrast-call', 'steady-hand', 'cutout'
  ) then
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
    -- The legal max per locked piece is a 4-line clear at the current
    -- level (800 * level). This bound leaves headroom for drop bonuses.
    v_max_plausible := (v_lines + 4) * 800 * v_level + (v_level * 1000);
    if p_score > v_max_plausible then
      raise exception 'implausible_score';
    end if;
    if p_play_time_ms < v_lines * 600 then
      raise exception 'implausible_time';
    end if;
  else
    -- The judgement games score a few thousand points at most.
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
-- 8. RPC: top_game_scores(game, limit)
--    Each player's BEST score for that game, one row per name.
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
-- 9. Triggers
--    Dedup drops an older row from the same player and game with identical
--    (score, meta), so the table stays tidy without ever touching another
--    player's rows. account_state stamps its own updated_at.
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

create or replace function public.touch_account_state()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists account_state_touch on public.account_state;
create trigger account_state_touch
  before update on public.account_state
  for each row execute function public.touch_account_state();


-- ============================================================
-- 10. Permissions
--     A session flips PostgREST from `anon` to `authenticated`, so every
--     function must be executable by BOTH roles. Without this, submissions
--     start failing silently the moment sessions exist.
-- ============================================================

grant execute on function public.reserve_name(text)                                   to anon, authenticated;
grant execute on function public.claim_legacy_player(text, text)                      to anon, authenticated;
grant execute on function public.submit_game_score(text, text, text, int, jsonb, int) to anon, authenticated;
grant execute on function public.top_game_scores(text, int)                           to anon, authenticated;

grant select, insert, update on public.account_state to authenticated;

-- ============================================================
-- Done. Fresh project or live one, the result is the same shape.
-- ============================================================
