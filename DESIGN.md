# Pehchaan (पहचान) — Design Document

> A Heardle-style daily game for Desi Hip-Hop. Hear 1 second of a Seedhe Maut track, guess the song. Every wrong guess unlocks more audio. 5 attempts. New song every day.

**Name:** "Pehchaan" = recognition / identity. You're literally being asked: *pehchaan kaun?*

---

## 1. Game Design

### Core loop
1. Page loads → today's mystery song (same for every player worldwide, resets at midnight IST).
2. Player presses play → hears the **first 1 second** of the clip.
3. Player either **guesses** (searchable autocomplete of all songs in the DB) or **skips**.
4. Wrong guess or skip = attempt consumed → unlocked duration increases.
5. Win → celebration + share card. Lose after 5 → answer revealed + full 16s clip plays.

### Attempt → duration ladder

| Attempt | Unlocked audio |
|---------|---------------|
| 1       | 1s            |
| 2       | 2s            |
| 3       | 4s            |
| 4       | 8s            |
| 5       | 16s           |

Doubling (Heardle-proven) feels fairer than linear: 1s → 2s is a big perceptual jump, and 16s almost always contains a hook or a recognizable Encore/Calm verse entry.

### Feedback per guess
- ❌ Wrong song, wrong artist → red row
- 🟡 Wrong song, **correct artist** → amber row (matters once multiple DHH artists are in; with Seedhe Maut only, every wrong guess from their catalog is amber — still useful signal that the player is "warm")
- ✅ Correct → green row

### Share card (the growth engine)
Wordle-style emoji grid, e.g.:

```
Pehchaan #41
🔇🟥🟨✅⬜
pehchaan.fun
```

🔇 = skip, 🟥 = wrong, 🟨 = right artist, ✅ = solved, ⬜ = unused attempts.

### Modes
- **Daily** (v1): one global song/day. Scarcity = retention + shareability.
- **Practice / Unlimited** (v1, simple): random song, no streak impact. Keeps people on the site after the daily.
- **Artist packs** (v2): "Seedhe Maut only", "All DHH", "Gully era", etc.

### Stats (localStorage, no accounts in v1)
Games played, win %, current streak, max streak, guess distribution (1–5).

---

## 2. Architecture

```
┌──────────────┐     audio clips      ┌─────────────────┐
│   Browser    │◄────────────────────│  Cloudflare R2   │
│  (Next.js)   │                      │  (public bucket) │
└──────┬───────┘                      └─────────────────┘
       │ /api/puzzle  /api/songs  /api/guess
       ▼
┌──────────────┐      metadata        ┌─────────────────┐
│ Next.js API  │◄────────────────────│    Supabase      │
│ (Vercel)     │                      │   (Postgres)     │
└──────────────┘                      └─────────────────┘
```

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend + API | **Next.js 14 (App Router, TS)** | One deploy on Vercel free tier; API routes keep the answer server-side |
| DB | **Supabase Postgres** | Free tier, you already know it; songs table + RLS |
| Audio storage | **Cloudflare R2** | Zero egress fees (critical — audio is your bandwidth cost), free 10GB |
| Styling | **Tailwind** | Fast iteration |
| Search | **Client-side fuzzy match** over song list | Catalog is small (<500 songs); no server round-trip per keystroke |

### Anti-cheat / answer protection
- The client **never receives the song title** until the game ends.
- Clip files are named by **UUID** (`a3f9…e2.mp3`), not song name — DevTools network tab reveals nothing.
- Daily song selection happens **server-side**: `HMAC(date, DAILY_SECRET) % activeSongCount`. Deterministic (no cron needed), unguessable without the secret.
- Guess validation via `POST /api/guess` — server compares IDs and returns `correct` / `artistMatch` flags only.
- The answer is revealed by `POST /api/guess` **only when** the server sees a winning guess or the final (5th) attempt. A motivated user could lie about attempt count via curl — acceptable for v1; hardening options: signed session token counting attempts server-side (Upstash Redis), or just don't worry because it's a free game.

### API surface

| Route | Method | Returns |
|-------|--------|---------|
| `/api/puzzle?mode=daily\|random` | GET | `{ puzzleId, puzzleNumber, clipUrl, durations: [1,2,4,8,16] }` |
| `/api/songs` | GET | `[{ id, title, artist }]` — full catalog for autocomplete (cached, revalidates hourly) |
| `/api/guess` | POST | `{ correct, artistMatch, answer? }` — `answer` only on win or attempt 5 |

`puzzleId` is an opaque token (`daily:2026-06-10` or `rand:<songId-signed>`) so the same endpoints serve both modes.

---

## 3. Database Schema

```sql
-- see supabase/schema.sql for the runnable version
create table songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text not null,            -- "Seedhe Maut", later "DIVINE", "KR$NA"...
  album text,
  release_year int,
  clip_path text not null,         -- "clips/<uuid>.mp3" in R2
  difficulty smallint default 2,   -- 1 easy (Nanchaku) … 3 deep cut; future curation
  active boolean default true,     -- pool toggle without deleting
  created_at timestamptz default now()
);
```

`active` lets you stage songs (upload clip → verify → flip to true) and run artist packs later via `where artist = ...`.

---

## 4. ⚠️ The Song Database — YOUR MANUAL WORK

This is the part the code can't do for you. Three sub-tasks: **pick songs → produce clips → upload + register**.

### 4a. Curate the song list (start: 60–80 Seedhe Maut tracks)

Spreadsheet columns: `title, album, release_year, difficulty, clip_start_seconds`.

Suggested pool, roughly by recognizability:
- **Difficulty 1 (anthems):** Nanchaku, Namastute, 101, Shaktimaan, Kyu, Maina, Batti, Hola Amigo, Do Guna
- **Difficulty 2:** most of न (Nayaab), Bayaan deep-er cuts, Lunch Break tracks (decide if mixtape counts — recommend yes, it's beloved)
- **Difficulty 3:** features, OG SoundCloud-era, interludes

**Important curation rule:** pick the `clip_start_seconds` yourself per song. The 16s window should start at a *fair but not instantly-giveaway* point — usually the start of verse 1 or the beat drop, **not** the intro (often silence/skit) and **not** the hook (too easy at 1s). Listen to each song once and note the timestamp. This is ~2 hours of work for 70 songs and it is THE quality lever of the whole game.

### 4b. Produce the clips (legal note first)

**Copyright reality check:** these recordings belong to labels (Azadi Records etc.). Short clips for a free fan game sit in a grey zone — Heardle itself got acquired by Spotify partly to solve this. Mitigations: keep clips ≤16s, no downloads, free game, credit + link out to the full song on streaming ("Listen on Spotify/JioSaavn" button after reveal — this actually *drives* streams, which is your good-faith argument). If it grows, email Azadi Records — small indie labels often say yes to fan projects that funnel streams. Do **not** build automated scrapers against streaming services; rip from sources you have legitimate access to (e.g., your own purchased files, or YouTube where the label uploaded it, accepting the ToS risk is your call).

**Clip production with ffmpeg** (one 16s file per song; the app gates playback client-side at 1/2/4/8s):

```bash
# single song: start at 42s, take 16s, mono, 96kbps (small + plenty for phone speakers)
ffmpeg -ss 42 -t 16 -i "namastute_full.mp3" -ac 1 -b:a 96k -af "afade=t=in:d=0.05,afade=t=out:st=15.7:d=0.3" clips/$(uuidgen).mp3
```

Batch script (reads your spreadsheet exported as CSV) — see `scripts/make_clips.sh` in the repo. It outputs `clips/<uuid>.mp3` **and** a `manifest.csv` mapping uuid → title so you can seed the DB.

Target: ~190KB per clip × 70 songs ≈ 13MB total. Trivial.

### 4c. Upload to R2 + seed Supabase

1. **R2:** Cloudflare dashboard → R2 → create bucket `pehchaan-clips` → enable public access via custom domain or `r2.dev` URL → drag the `clips/` folder in (or `rclone copy clips/ r2:pehchaan-clips/clips/`).
2. **Supabase:** create project → SQL editor → paste `supabase/schema.sql` → then seed. Use `scripts/seed.sql` generated from your manifest, or the provided `scripts/manifest-to-sql.py`:

```bash
python scripts/manifest-to-sql.py manifest.csv > seed.sql
# paste seed.sql into Supabase SQL editor
```

3. Set env vars (`.env.local`, and later in Vercel):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...        # server-only, never NEXT_PUBLIC
R2_PUBLIC_BASE_URL=https://clips.pehchaan.fun   # or https://pub-xxx.r2.dev
DAILY_SECRET=any-long-random-string      # changing this changes all future daily picks
```

### 4d. Adding more DHH artists later
Zero code changes: insert rows with `artist = 'DIVINE'` etc. The amber "right artist" feedback automatically becomes meaningful. For artist-pack modes, add a `?artist=` filter to `/api/puzzle` (15-line change, noted in code comments).

---

## 5. Visual Direction

Not the portfolio's acid-green — this is its own thing, grounded in DHH visual culture: **Indian street-poster / cassette-era aesthetic**. Think Seedhe Maut's न era meets old Bollywood audio-cassette inlays.

- **Palette:** ink `#121010`, aged paper `#F2EDE3`, sindoor red `#E8402A`, cassette amber `#E9A23B`, smoke `#7A716A`.
- **Type:** Devanagari display for the wordmark **पहचान** (Tiro Devanagari Hindi), *Space Grotesk* for UI.
- **Signature element:** the progress bar is a **mixtape strip** — five segments sized proportionally to 1/2/4/8/16s, filling like tape spooling as audio plays. It's the game mechanic made visible.
- Mobile-first (DHH audience is overwhelmingly phone), respects `prefers-reduced-motion`, visible focus rings.

---

## 6. Build Phases

| Phase | Scope | Status |
|-------|-------|--------|
| **0** | This scaffold: schema, API routes, full game UI, daily logic | ✅ built (this repo) |
| **1** | You: clips + seed DB + env vars + `npm run dev` works end-to-end | ⬜ your move |
| **2** | Deploy: Vercel + custom domain; OG image for share card | ⬜ |
| **3** | Practice mode polish, stats modal, countdown to next puzzle | partially built |
| **4** | More artists, artist packs, leaderboard (needs auth — Supabase Auth) | ⬜ |

## 7. Known gaps / decisions deferred
- **Timezone:** daily resets at **midnight IST** (hardcoded `Asia/Kolkata`) since the audience is Indian. Global players get IST days — fine.
- **iOS Safari autoplay:** audio only plays after a user gesture — the play button satisfies this; never autoplay.
- **Answer reveal trust:** see anti-cheat section; v1 trusts the client's attempt count on the final reveal call.
- **Analytics:** add Vercel Analytics or Plausible in phase 2; track daily players + win rate per song (tells you which clips are mis-timed).
