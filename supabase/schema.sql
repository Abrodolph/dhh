-- Pehchaan schema. Run once in Supabase SQL editor.
create extension if not exists pgcrypto;

create table if not exists songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text not null,
  album text,
  release_year int,
  clip_path text not null,          -- e.g. clips/a3f9....mp3 (path inside R2 bucket)
  difficulty smallint default 2,    -- 1 easy / 2 normal / 3 deep cut
  active boolean default true,
  created_at timestamptz default now()
);

create index if not exists songs_active_idx on songs (active);

-- RLS: lock the table down. The app uses the service-role key server-side,
-- which bypasses RLS, so no public policies are needed.
alter table songs enable row level security;

-- Anonymous players. id is minted client-side (crypto.randomUUID) and posted
-- to /api/player; username is optional and set later. See src/lib/identity.ts.
create table if not exists players (
  id uuid primary key,
  username text,
  created_at timestamptz default now()
);

-- Per-game scores, for leaderboards. Not yet written by the app.
create table if not exists scores (
  id bigint generated always as identity primary key,
  player_id uuid references players(id),
  mode text not null,                 -- 'daily' | 'round'
  puzzle_date date,
  artists text[],
  difficulty text,                    -- 'easy' | 'medium' | 'hard' | 'mixed'
  songs_total int,
  songs_correct int,
  seconds_used int,
  created_at timestamptz default now()
);

create index if not exists scores_leaderboard_idx
  on scores (mode, difficulty, songs_correct desc, seconds_used asc);

-- Same lockdown as songs: service-role key bypasses RLS server-side.
alter table players enable row level security;
alter table scores enable row level security;
