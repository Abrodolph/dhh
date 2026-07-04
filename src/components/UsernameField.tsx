"use client";

import { useEffect, useState } from "react";
import { getUsername, setUsername } from "@/lib/identity";

type Props = {
  /** Fired after a successful save with the cleaned name. */
  onSaved?: (name: string) => void;
  /** Force the input open even when a name already exists. */
  startEditing?: boolean;
};

/** Editable leaderboard name. Free text, ≤24 chars. */
export default function UsernameField({ onSaved, startEditing }: Props) {
  const [name, setName] = useState("");
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const n = getUsername();
    setName(n);
    setDraft(n);
    setEditing(startEditing || !n);
  }, [startEditing]);

  async function save() {
    const clean = draft.trim().slice(0, 24);
    if (!clean || saving) return;
    setSaving(true);
    const saved = await setUsername(clean);
    setName(saved);
    setEditing(false);
    setSaving(false);
    onSaved?.(saved);
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-center gap-2 text-sm text-smoke">
        <span>
          Playing as <span className="text-paper">{name}</span>
        </span>
        <button
          onClick={() => setEditing(true)}
          className="font-condensed text-xs uppercase tracking-wider text-accent hover:underline"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <input
        value={draft}
        maxLength={24}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && void save()}
        placeholder="Your leaderboard name"
        className="min-h-[48px] flex-1 rounded-sm border-2 border-paper/70 bg-ink px-4 py-3 text-base text-paper placeholder-smoke focus:border-accent focus:shadow-[3px_3px_0_rgba(18,194,233,0.4)]"
        autoComplete="off"
        spellCheck={false}
        aria-label="Leaderboard name"
      />
      <button
        onClick={() => void save()}
        disabled={saving || !draft.trim()}
        className="min-h-[48px] rounded-sm border border-accent px-5 font-condensed text-sm uppercase tracking-wider text-accent hover:bg-accent/10 disabled:opacity-40"
      >
        {saving ? "…" : "Save"}
      </button>
    </div>
  );
}
