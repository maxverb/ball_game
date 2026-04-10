// Shared types for the SWING web port.

/**
 * The playable ball colours. Real SWING ships with visual "sphere sets"
 * that each provide 6-ish colours (per README.TXT the default set has
 * red, yellow, green, blue, violet and "special" variants). For v1 we
 * pick 6 distinct hues that survive on a pixel-art background.
 */
export const BALL_COLOURS = [
  "red",
  "yellow",
  "green",
  "blue",
  "purple",
  "orange",
] as const;
export type BallColour = (typeof BALL_COLOURS)[number];

/**
 * Weight stamped on every regular ball. Drives how the see-saw behaves:
 * the sideways launch velocity is proportional to the weight difference.
 * README mentions visible weight numbers, so v1 also draws the number.
 */
export type BallWeight = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** Non-colour "extra" balls from the README. */
export type ExtraKind = "heart" | "star" | "bomb" | "bonus2" | "bonus3" | "bonus4";

export type BallKind =
  | { kind: "regular"; colour: BallColour; weight: BallWeight }
  | { kind: "extra"; extra: ExtraKind };

export interface Ball {
  id: number;
  kind: BallKind;
  /** World position in pixels (centre of the sprite). */
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Grid cell once settled, or null while airborne. */
  cell: { col: number; row: number } | null;
  /** Flip-once flag: set when the ball has already traversed the see-saw. */
  passedSeeSaw: boolean;
}

/**
 * A see-saw sits between the crane (top) and the board. It tilts based
 * on the weight memory of its two pans. README quote:
 *   "When a sphere is thrown, the distance it travels will depend on the
 *    difference in the weights on the see-saw."
 */
export interface SeeSawState {
  /** World x of the pivot (centre of the see-saw). */
  pivotX: number;
  /** World y of the pivot. */
  pivotY: number;
  /** Half-length in pixels, i.e. distance from pivot to each end. */
  halfLen: number;
  /** Current left/right weights remembered from previous drops. */
  leftWeight: number;
  rightWeight: number;
  /** Tilt angle in radians, positive = right side up. */
  angle: number;
}
