-- Occasional maintenance, run by hand in the SQL Editor. Not a migration.

-- ============================================================
-- Purge stale anonymous auth users.
--
-- Anonymous sign-ins accrue one auth user per browser that ever started a
-- game; cleared cookies and one-off visitors leave ghosts behind. Deleting
-- an auth user cascades to their account_state row and nulls
-- players.user_id (both defined with the right on-delete behaviour), so
-- nothing of value is lost:
--   - kept: any anonymous user younger than 90 days
--   - kept: any anonymous user still linked to a player identity
--   - Google-linked users are never anonymous, so never touched
--
-- Dry run first:
--   select count(*) from auth.users u
--   where u.is_anonymous
--     and u.created_at < now() - interval '90 days'
--     and not exists (select 1 from public.players p where p.user_id = u.id);
-- ============================================================

delete from auth.users u
where u.is_anonymous
  and u.created_at < now() - interval '90 days'
  and not exists (
    select 1 from public.players p where p.user_id = u.id
  );
