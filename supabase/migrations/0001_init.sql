-- Core schema — spec section 5.1. Field names must match the spec exactly.
create extension if not exists "pgcrypto";

create table league (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  settings jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'expired', 'archived')),
  created_at timestamptz not null default now()
);

create table season (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references league(id) on delete cascade,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'upcoming' check (status in ('upcoming', 'active', 'complete'))
);

create table team (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references season(id) on delete cascade,
  name text not null,
  short_name text not null,
  logo_url text
);

create table player (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references league(id) on delete cascade,
  full_name text not null,
  nickname text not null check (char_length(nickname) <= 10),
  photo_url text,
  is_minor boolean not null default false,
  consent_flags jsonb not null default '{}'::jsonb
);

create table roster_entry (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references season(id) on delete cascade,
  team_id uuid not null references team(id) on delete cascade,
  player_id uuid not null references player(id) on delete cascade,
  jersey_number text not null,
  is_active boolean not null default true,
  unique (team_id, player_id)
);

create table venue (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references league(id) on delete cascade,
  name text not null,
  address text
);

create table device (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references league(id) on delete cascade,
  label text not null,
  assigned_to_name text,
  paired_at timestamptz,
  last_seen_at timestamptz,
  status text not null default 'active' check (status in ('active', 'unpaired'))
);

create table user_account (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  role text not null check (role in ('operator', 'organizer', 'tracker')),
  league_id uuid references league(id) on delete cascade
);

create table game (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references season(id) on delete cascade,
  home_team_id uuid not null references team(id),
  away_team_id uuid not null references team(id),
  venue_id uuid references venue(id),
  court_label text,
  scheduled_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'in_progress', 'finalized')),
  locked_by_device_id uuid references device(id),
  lock_expires_at timestamptz,
  finalized_at timestamptz,
  finalized_by uuid references user_account(id)
);

create table game_event (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references game(id) on delete cascade,
  sequence integer not null,
  event_type text not null,
  team_id uuid references team(id),
  player_id uuid references player(id),
  period integer not null,
  clock_ms integer,
  payload jsonb not null default '{}'::jsonb,
  recorded_by_device_id uuid not null references device(id),
  recorded_by_user_id uuid references user_account(id),
  client_uuid text not null unique,
  created_at timestamptz not null default now(),
  voided_by_event_id uuid references game_event(id),
  unique (game_id, sequence)
);

create index game_event_game_id_sequence_idx on game_event (game_id, sequence);

create table game_lineup (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references game(id) on delete cascade,
  team_id uuid not null references team(id),
  player_id uuid not null references player(id),
  period integer not null,
  on_court boolean not null,
  effective_sequence integer not null
);

-- League isolation (spec 11.4): every league-scoped table is reachable only
-- through a join back to league_id, enforced with RLS, not interface filtering.
alter table league enable row level security;
alter table season enable row level security;
alter table team enable row level security;
alter table player enable row level security;
alter table roster_entry enable row level security;
alter table venue enable row level security;
alter table device enable row level security;
alter table user_account enable row level security;
alter table game enable row level security;
alter table game_event enable row level security;
alter table game_lineup enable row level security;

-- Phase 1 policy set: public read of everything (the website requires no
-- account to view, spec 8), service-role key used for all writes (mobile
-- sync and seeding go through a server-side API in later phases; Phase 1
-- seeds directly with the service role key, which bypasses RLS).
create policy "public read league" on league for select using (true);
create policy "public read season" on season for select using (true);
create policy "public read team" on team for select using (true);
create policy "public read player" on player for select using (true);
create policy "public read roster_entry" on roster_entry for select using (true);
create policy "public read venue" on venue for select using (true);
create policy "public read game" on game for select using (true);
create policy "public read game_event" on game_event for select using (true);
create policy "public read game_lineup" on game_lineup for select using (true);
