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
