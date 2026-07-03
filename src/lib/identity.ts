const KEY = "hook_player_id";
const NAME_KEY = "hook_username";

/** Stable anonymous player id. Generated once, reused forever. */
export function getPlayerId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

/** Locally-cached leaderboard name (source of truth is players.username). */
export function getUsername(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

/** Persist the name locally and push it to the server. Fire-and-forget. */
export async function setUsername(name: string): Promise<string> {
  const clean = name.trim().slice(0, 24);
  const id = getPlayerId();
  try {
    localStorage.setItem(NAME_KEY, clean);
  } catch {}
  if (id && clean) {
    try {
      await fetch("/api/player", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, username: clean }),
      });
    } catch {}
  }
  return clean;
}
