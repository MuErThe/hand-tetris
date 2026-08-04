-- Accounts, phase 3: cross-device sync.
--
-- One account_state row per auth user carries the arcade identity
-- (name + token), the warm-up streak and per-game progress, so logging in
-- with Google on another device restores all three. User-owned data, so
-- plain RLS does the guarding — no definer functions needed. The anon role
-- gets no access at all.
--
-- Safe to run on the live project. Idempotent.

create table if not exists public.account_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  -- { name, token } — the arcade identity this account plays as.
  player     jsonb,
  -- { count, lastDay } — mirrors arcade/v1/warmup-streak.
  streak     jsonb not null default '{}'::jsonb,
  -- { [gameId]: SessionRecord[] } — mirrors arcade/v1/progress/<game>.
  progress   jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  -- Sanity caps: this is a mirror of small local state, not a dumping
  -- ground. Sizes are far above legitimate use.
  constraint account_state_player_size   check (pg_column_size(player)   <= 2048),
  constraint account_state_streak_size   check (pg_column_size(streak)   <= 2048),
  constraint account_state_progress_size check (pg_column_size(progress) <= 262144)
);

alter table public.account_state enable row level security;

drop policy if exists "account_state_select" on public.account_state;
drop policy if exists "account_state_insert" on public.account_state;
drop policy if exists "account_state_update" on public.account_state;

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

drop trigger if exists account_state_touch on public.account_state;
create trigger account_state_touch
  before update on public.account_state
  for each row execute function public.touch_account_state();
