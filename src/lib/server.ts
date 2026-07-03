// Server-only helpers. Never import this from a client component.
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "crypto";

export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing");
  return createClient(url, key, { auth: { persistSession: false } });
}

const SECRET = () => process.env.DAILY_SECRET ?? "dev-secret";

/** Pehchaan launched on this date; puzzle #1. Change before launch. */
export const EPOCH = "2026-07-01";

/** Today's date string in IST, e.g. "2026-06-10". */
export function todayIST(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());
}

export function puzzleNumber(dateStr: string): number {
  const ms = Date.parse(dateStr) - Date.parse(EPOCH);
  return Math.floor(ms / 86_400_000) + 1;
}

function hmacInt(payload: string): number {
  const h = createHmac("sha256", SECRET()).update(payload).digest();
  return h.readUInt32BE(0);
}

type SongRow = {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  clip_path: string;
  difficulty: number;
  cover_url: string | null;
};

const SONG_COLS = "id,title,artist,album,clip_path,difficulty,cover_url";

async function activeSongs(): Promise<SongRow[]> {
  const { data, error } = await supabaseAdmin()
    .from("songs")
    .select(SONG_COLS)
    .eq("active", true)
    .order("id"); // stable order => deterministic daily pick
  if (error) throw error;
  return data ?? [];
}

/** Deterministic daily song: HMAC(date) % count over a stable ordering. */
export async function dailySong(dateStr: string): Promise<SongRow> {
  const songs = await activeSongs();
  if (songs.length === 0) throw new Error("No active songs in DB");
  return songs[hmacInt(`daily:${dateStr}`) % songs.length];
}

export async function randomSong(): Promise<SongRow> {
  const songs = await activeSongs();
  if (songs.length === 0) throw new Error("No active songs in DB");
  return songs[Math.floor(Math.random() * songs.length)];
}

export function clipUrl(clipPath: string): string {
  const base = (process.env.R2_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
  return `${base}/${clipPath}`;
}

// ---- Opaque puzzle tokens ------------------------------------------------
// daily:  "daily:<date>"            -> answer re-derived server-side
// random: "rand:<songId>.<sig>"     -> songId is in the token but signed;
//          the clip filename is a UUID anyway, so the id reveals nothing.

export function sign(payload: string): string {
  return createHmac("sha256", SECRET()).update(payload).digest("hex").slice(0, 16);
}

export function makeRandomToken(songId: string): string {
  return `rand:${songId}.${sign(`rand:${songId}`)}`;
}

// ---- Round win proofs ----------------------------------------------------
// When /api/guess confirms a correct guess it hands back a signed proof binding
// the song + attempt. /api/score requires these, so a client can't forge how
// fast (or whether) it solved each song. Residual trust: wall-clock time only.

export function makeWinProof(songId: string, attempt: number): string {
  return sign(`win:${songId}:${attempt}`);
}

export function verifyWinProof(songId: string, attempt: number, proof: string): boolean {
  return makeWinProof(songId, attempt) === proof;
}

/** Resolve a puzzleId to the answer song. Throws on tampering. */
export async function resolvePuzzle(puzzleId: string): Promise<SongRow> {
  if (puzzleId.startsWith("daily:")) {
    const date = puzzleId.slice(6);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("bad puzzle id");
    return dailySong(date);
  }
  if (puzzleId.startsWith("rand:")) {
    const [songId, sig] = puzzleId.slice(5).split(".");
    if (sign(`rand:${songId}`) !== sig) throw new Error("bad signature");
    const { data, error } = await supabaseAdmin()
      .from("songs")
      .select(SONG_COLS)
      .eq("id", songId)
      .single();
    if (error || !data) throw new Error("song not found");
    return data;
  }
  throw new Error("unknown puzzle id");
}

/**
 * Pick `count` distinct active songs matching the given filters, for a round.
 * Returns fewer than `count` (possibly 0) if the filter pool is too small —
 * the caller decides how to handle that.
 */
export async function roundSongs(
  count: number,
  filters: { artists?: string[]; difficulty?: number },
): Promise<SongRow[]> {
  let query = supabaseAdmin().from("songs").select(SONG_COLS).eq("active", true);
  if (filters.artists && filters.artists.length) query = query.in("artist", filters.artists);
  if (filters.difficulty === 1 || filters.difficulty === 2 || filters.difficulty === 3) {
    query = query.eq("difficulty", filters.difficulty);
  }
  const { data, error } = await query;
  if (error) throw error;
  const pool = [...(data ?? [])];
  // Fisher–Yates shuffle, take `count`.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
