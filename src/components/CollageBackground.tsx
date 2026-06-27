/**
 * CollageBackground — tiled poster-wall image behind the game.
 *
 * Purely decorative: the user-supplied /collage.jpg repeated across the full
 * viewport at very low opacity. Sits BEHIND everything (-z-10), ignores pointer
 * + focus, so it never interferes with the app or its buttons.
 *
 * Intensity knob: `strength` (0–1) drives the layer opacity. `tile` sets the
 * repeat size in px (smaller = more repeats).
 */
type Props = {
  /** Overall opacity of the background, 0–1. Default 0.08 (really light). */
  strength?: number;
  /** Tile width in px; height scales to keep the image's aspect ratio. */
  tile?: number;
};

export default function CollageBackground({ strength = 0.08, tile = 360 }: Props) {
  return (
    <div
      aria-hidden
      className="collage-root pointer-events-none fixed inset-0 -z-10"
      style={{
        opacity: strength,
        backgroundImage: "url(/collage.jpg)",
        backgroundRepeat: "repeat",
        backgroundSize: `${tile}px auto`,
      }}
    />
  );
}
