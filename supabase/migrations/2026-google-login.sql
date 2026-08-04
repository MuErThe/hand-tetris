-- Accounts, phase 2: Google log-in.
--
-- Relaxes claim_legacy_player so a name held by an ANONYMOUS auth user can
-- re-link to the caller when the token proves ownership — the cross-device
-- case: play on device A (name linked to A's anonymous user), log in with
-- Google on device B, and the name follows the Google account. A name linked
-- to a real (Google) account is never taken over.
--
-- Dashboard prerequisites:
--   1. Authentication → Providers → Google: enable, paste the GCP OAuth
--      client id + secret (authorised redirect URI is
--      https://<project-ref>.supabase.co/auth/v1/callback).
--   2. Authentication → URL Configuration: site URL + redirect allowlist
--      for https://squint.mdzabeeh.com/** and http://localhost:3000/**.
--   3. Authentication → Settings: enable manual linking (linkIdentity is
--      what upgrades an anonymous user in place).
--
-- Safe to run on the live project. Idempotent.

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

grant execute on function public.claim_legacy_player(text, text) to anon, authenticated;
