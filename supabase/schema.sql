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
  cover_url text,                   -- album art (iTunes CDN URL); shown only at reveal
  active boolean default true,
  created_at timestamptz default now()
);

-- If migrating an existing DB, also run:
--   alter table songs add column if not exists cover_url text;

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

-- Per-game scores, for leaderboards. Round mode writes here via /api/score.
create table if not exists scores (
  id bigint generated always as identity primary key,
  player_id uuid references players(id),
  mode text not null,                 -- 'daily' | 'round'
  puzzle_date date,
  artists text[],
  difficulty text,                    -- round filter for display: 'easy'|'medium'|'hard'|'mixed'
  songs_total int,
  songs_correct int,
  seconds_used int,
  score int,                          -- computed round score (see src/lib/scoring.ts)
  created_at timestamptz default now()
);

-- Leaderboard is one board per round length (songs_total), ranked by score,
-- wall-clock time as the tiebreaker. Difficulty is NOT bucketed — it folds
-- into `score` via the per-song multiplier.
create index if not exists scores_round_idx
  on scores (mode, songs_total, score desc, seconds_used asc);

-- If migrating an existing DB that had the old column/index, also run:
--   alter table scores add column if not exists score int;
--   drop index if exists scores_leaderboard_idx;

-- Same lockdown as songs: service-role key bypasses RLS server-side.
alter table players enable row level security;
alter table scores enable row level security;
