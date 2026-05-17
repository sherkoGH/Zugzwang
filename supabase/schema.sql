-- ============================================================================
-- Zugzwang — Supabase schema (run this in Supabase SQL Editor)
-- ============================================================================
-- This script creates all tables, RLS policies, and helper functions needed
-- by the Zugzwang client. Run it once in a fresh Supabase project.
-- Auth: rely on Supabase's built-in `auth.users`; we mirror minimal profile data
-- into `public.profiles` for queries that don't need elevated privileges.
-- ============================================================================

-- 1. PROFILES ----------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  city        text not null default 'Almaty',
  elo         integer not null default 1200,
  is_pro      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists profiles_elo_idx   on public.profiles (elo desc);
create index if not exists profiles_city_idx  on public.profiles (city);

-- 2. MATCH HISTORY -----------------------------------------------------------
create table if not exists public.matches (
  id            uuid primary key default gen_random_uuid(),
  white_id      uuid references public.profiles(id) on delete set null,
  black_id      uuid references public.profiles(id) on delete set null,
  variant       text not null check (variant in ('american','russian','giveaway','sandbox')),
  time_control  text not null,
  result        text not null check (result in ('white-wins','black-wins','draw','active')),
  moves         jsonb not null default '[]'::jsonb,
  elo_change    integer not null default 0,
  played_at     timestamptz not null default now()
);

create index if not exists matches_white_idx on public.matches (white_id);
create index if not exists matches_black_idx on public.matches (black_id);
create index if not exists matches_date_idx  on public.matches (played_at desc);

-- 3. BADGES ------------------------------------------------------------------
create table if not exists public.user_badges (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  badge_id    text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

-- 4. PUZZLE PROGRESS ---------------------------------------------------------
create table if not exists public.puzzle_attempts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  puzzle_id   text not null,
  solved      boolean not null default false,
  attempts    integer not null default 1,
  solved_at   timestamptz,
  created_at  timestamptz not null default now(),
  unique (user_id, puzzle_id)
);

-- 5. MULTIPLAYER ROOMS (for realtime channels) ------------------------------
create table if not exists public.rooms (
  id            text primary key,
  variant       text not null check (variant in ('american','russian','giveaway','sandbox')),
  time_control  text not null,
  white_id      uuid references public.profiles(id) on delete set null,
  black_id      uuid references public.profiles(id) on delete set null,
  status        text not null default 'waiting' check (status in ('waiting','active','finished')),
  board_state   jsonb not null default '[]'::jsonb,
  to_move       text not null default 'white' check (to_move in ('white','black')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.profiles        enable row level security;
alter table public.matches         enable row level security;
alter table public.user_badges     enable row level security;
alter table public.puzzle_attempts enable row level security;
alter table public.rooms           enable row level security;

-- Profiles: anyone can read (for leaderboard), only owner can write.
drop policy if exists "profiles read all"    on public.profiles;
drop policy if exists "profiles owner write" on public.profiles;
create policy "profiles read all"    on public.profiles for select using (true);
create policy "profiles owner write" on public.profiles for update using (auth.uid() = id);
create policy "profiles owner insert" on public.profiles for insert with check (auth.uid() = id);

-- Matches: participants can read; the system inserts on game finish (any auth user).
drop policy if exists "matches participants read" on public.matches;
drop policy if exists "matches participant insert" on public.matches;
create policy "matches participants read"
  on public.matches for select
  using (auth.uid() = white_id or auth.uid() = black_id or true); -- public-readable for leaderboard
create policy "matches participant insert"
  on public.matches for insert
  with check (auth.uid() = white_id or auth.uid() = black_id);

-- Badges
drop policy if exists "badges owner read" on public.user_badges;
drop policy if exists "badges owner write" on public.user_badges;
create policy "badges owner read"  on public.user_badges for select using (auth.uid() = user_id);
create policy "badges owner write" on public.user_badges for insert with check (auth.uid() = user_id);

-- Puzzle attempts
drop policy if exists "puzzles owner all" on public.puzzle_attempts;
create policy "puzzles owner all"
  on public.puzzle_attempts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Rooms: anyone can read open rooms; participants can update.
drop policy if exists "rooms read"   on public.rooms;
drop policy if exists "rooms insert" on public.rooms;
drop policy if exists "rooms update" on public.rooms;
create policy "rooms read"   on public.rooms for select using (true);
create policy "rooms insert" on public.rooms for insert with check (auth.uid() is not null);
create policy "rooms update" on public.rooms for update
  using (auth.uid() = white_id or auth.uid() = black_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Auto-create a profile row when a new auth.user is inserted.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, city, elo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'city', 'Almaty'),
    1200
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at fresh.
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists rooms_touch on public.rooms;
create trigger rooms_touch before update on public.rooms
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- REALTIME
-- ============================================================================
-- Enable Realtime on the `rooms` table (Supabase Dashboard -> Database -> Replication -> public.rooms).
-- After running this SQL, go to:
--   Settings -> API -> "Realtime" section -> enable for `rooms` table.
-- The client subscribes to row-level changes via supabase.channel('rooms').
