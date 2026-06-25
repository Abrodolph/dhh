# Pehchaan (पहचान)

Heardle for Desi Hip-Hop. Hear 1s of a Seedhe Maut track → guess in 5 tries.

**Read `DESIGN.md` first** — it has the full architecture, game design, and (importantly) §4: the manual song-database work you need to do before this runs.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in Supabase / R2 / DAILY_SECRET
npm run dev
```

You must complete these before the game works (details in DESIGN.md §4):

1. Supabase project → run `supabase/schema.sql`
2. Produce 16s clips with `scripts/make_clips.sh` (needs ffmpeg)
3. Upload `clips/` to a public Cloudflare R2 bucket
4. Seed the songs table: `python scripts/manifest-to-sql.py manifest.csv > seed.sql` → run in Supabase
5. Fill `.env.local`

## Structure

```
src/app/page.tsx           game UI (client)
src/app/api/puzzle         GET daily/random puzzle (no answer leaked)
src/app/api/songs          GET catalog for autocomplete
src/app/api/guess          POST guess validation (answer revealed only on win/attempt 5)
src/lib/server.ts          deterministic daily pick, signed tokens, Supabase admin
src/components/            Player (mixtape strip), GuessInput, AttemptRow, ResultCard
scripts/                   clip production + DB seeding
```

## Deploy

Vercel → import repo → add the four env vars → done. Set `EPOCH` in `src/lib/server.ts` to your launch date so puzzle #1 is launch day.
