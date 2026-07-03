// Slug -> display name. `artist` is stored as a lowercase-hyphenated slug in the
// DB (so filtering/matching stay stable); this is purely for what users see.
const ARTIST_NAMES: Record<string, string> = {
  "seedhe-maut": "Seedhe Maut",
  raftaar: "Raftaar",
  krsna: "KR$NA",
  emiway: "EMIWAY BANTAI",
  yashraj: "Yashraj",
  "chaar-diwari": "Chaar Diwari",
  divine: "DIVINE",
};

/** Pretty artist label for a stored slug; unknown slugs title-case gracefully. */
export function artistLabel(slug: string): string {
  return (
    ARTIST_NAMES[slug] ??
    slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}
