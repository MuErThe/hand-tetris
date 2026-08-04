-- Accounts, phase 1: the anonymous-auth substrate.
--
-- Adds an optional link from a player identity to a Supabase auth user, so
-- logging in with Google (phase 2) upgrades the anonymous user in place and
-- inherits the player's history instead of starting over. The name+token
-- submission path keeps working exactly as before.
--
-- Dashboard prerequisites: enable "Allow anonymous sign-ins"
-- (Authentication → Sign In / Up). Until that is on, the client's
-- signInAnonymously() fails and everything degrades to the legacy flow.
-- For phase 2 (not needed to run this): configure the Google provider
-- under Authentication → Providers.
--
-- Safe to run on the live project. Idempotent.

-- ============================================================
-- 1. players.user_id — at most one player identity per auth user.
-- ============================================================

alter table public.players
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create unique index if not exists players_user_id_unique
  on public.players (user_id) where user_id is not null;

-- ============================================================
-- 2. reserve_name — stamp the caller's auth uid on a fresh identity, when a
--    session exists and that uid isn't already linked to another name.
-- ============================================================

create or replace function public.reserve_name(p_name text)
returns text
language plpgsql
security definer
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
-- 3. claim_legacy_player — link a pre-auth identity (name + token) to the
--    caller's auth user. Returns true when the link is in place after the
--    call (including "was already linked to this user"). A no-op without a
--    session, with a wrong token, or when the user already owns another name.
-- ============================================================

create or replace function public.claim_legacy_player(p_name text, p_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or p_name is null or p_token is null then
    return false;
  end if;

  -- Already linked, possibly by an earlier call from another tab or device.
  if exists (select 1 from public.players where user_id = v_uid) then
    return exists (
      select 1 from public.players where name = p_name and user_id = v_uid
    );
  end if;

  update public.players
    set user_id = v_uid
    where name = p_name and token = p_token and user_id is null;
  return found;
end;
$$;

-- ============================================================
-- 4. Grants. A session flips PostgREST from `anon` to `authenticated`, so
--    every function must be executable by BOTH roles — without this,
--    submissions would silently start failing the moment sessions exist.
-- ============================================================

grant execute on function public.reserve_name(text)                                    to anon, authenticated;
grant execute on function public.submit_game_score(text, text, text, int, jsonb, int) to anon, authenticated;
grant execute on function public.top_game_scores(text, int)                            to anon, authenticated;
grant execute on function public.claim_legacy_player(text, text)                       to anon, authenticated;
