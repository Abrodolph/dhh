/**
 * Album cover shown faded behind a reveal card's contents. Renders nothing when
 * there's no cover URL. The parent must be `relative overflow-hidden`, and the
 * card's real content should sit in a `relative` wrapper so it stays above this.
 *
 * The cover only ever arrives in the gated reveal payload, so this never leaks
 * the answer mid-game.
 */
export default function CoverBackdrop({ coverUrl }: { coverUrl?: string | null }) {
  if (!coverUrl) return null;
  return (
    <>
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center opacity-40"
        style={{ backgroundImage: `url(${coverUrl})` }}
      />
      {/* Dark wash so the title stays legible over any artwork. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-ink/75 via-ink/60 to-ink/85"
      />
    </>
  );
}
