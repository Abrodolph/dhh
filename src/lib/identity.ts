const KEY = "hook_player_id";

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
