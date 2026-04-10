// SeeSaw (German: "Wippe") — the signature mechanic of SWING.
//
// Behaviour:
//   * An incoming ball lands on one side of the see-saw.
//   * The other side holds a previously-placed ball (or is empty).
//   * The weight difference tilts the see-saw and, as it swings down on
//     the heavier side, the previously-resting ball gets launched into
//     the air with a horizontal velocity proportional to the weight
//     difference, then falls again into the board grid.
//
// We implement this with deterministic arithmetic instead of Matter.js —
// it gives much finer control over the "feel" and matches how the
// original handled it according to the README (the distance is an
// explicit function of the weight difference, not a rigid-body sim).

import type { Ball, SeeSawState } from "./types";

export interface LaunchResult {
  /** Horizontal launch velocity (px/s) applied to the resting ball. */
  vx: number;
  /** Small initial upward velocity so the launch looks like a hop. */
  vy: number;
}

const LAUNCH_PX_PER_WEIGHT_UNIT = 80; // tuned: 1 weight unit ≈ 80 px/s
const HOP_VELOCITY = 220; // upward jolt when launched
const MAX_TILT = Math.PI / 5; // 36°

export class SeeSaw {
  state: SeeSawState;
  /** Ball currently at rest on the left pan. */
  left: Ball | null = null;
  /** Ball currently at rest on the right pan. */
  right: Ball | null = null;

  constructor(pivotX: number, pivotY: number, halfLen = 48) {
    this.state = {
      pivotX,
      pivotY,
      halfLen,
      leftWeight: 0,
      rightWeight: 0,
      angle: 0,
    };
  }

  /** Called when a ball lands on one pan. Returns the launch vector
   *  that should be applied to the ball currently on the *opposite* pan
   *  (or null if nothing should launch). */
  place(ball: Ball, side: "left" | "right"): { launched: Ball | null; vector: LaunchResult } {
    const w = weightOf(ball);
    if (side === "left") {
      const opposite = this.right;
      this.left = ball;
      this.state.leftWeight = w;
      const result = this.computeLaunch(opposite, w, this.state.rightWeight);
      if (opposite && result.vx !== 0) {
        this.right = null;
        this.state.rightWeight = 0;
      }
      this.updateAngle();
      return { launched: result.vx !== 0 ? opposite : null, vector: result };
    } else {
      const opposite = this.left;
      this.right = ball;
      this.state.rightWeight = w;
      const result = this.computeLaunch(opposite, this.state.leftWeight, w);
      if (opposite && result.vx !== 0) {
        this.left = null;
        this.state.leftWeight = 0;
      }
      this.updateAngle();
      return { launched: result.vx !== 0 ? opposite : null, vector: result };
    }
  }

  /** Remove the ball from a pan (e.g. when consumed by a Dreier). */
  remove(side: "left" | "right"): void {
    if (side === "left") {
      this.left = null;
      this.state.leftWeight = 0;
    } else {
      this.right = null;
      this.state.rightWeight = 0;
    }
    this.updateAngle();
  }

  /** Left-pan world position accounting for current tilt. */
  leftPan(): { x: number; y: number } {
    const { pivotX, pivotY, halfLen, angle } = this.state;
    return {
      x: pivotX - Math.cos(angle) * halfLen,
      y: pivotY + Math.sin(angle) * halfLen,
    };
  }

  /** Right-pan world position accounting for current tilt. */
  rightPan(): { x: number; y: number } {
    const { pivotX, pivotY, halfLen, angle } = this.state;
    return {
      x: pivotX + Math.cos(angle) * halfLen,
      y: pivotY - Math.sin(angle) * halfLen,
    };
  }

  private computeLaunch(
    opposite: Ball | null,
    incomingLeft: number,
    incomingRight: number,
  ): LaunchResult {
    if (!opposite) return { vx: 0, vy: 0 };
    const diff = incomingLeft - incomingRight;
    // Positive diff => left is heavier => right pan goes up => ball on right
    // flies to the right. Negative diff => ball on left flies to the left.
    const magnitude = Math.abs(diff) * LAUNCH_PX_PER_WEIGHT_UNIT;
    if (magnitude < 1) return { vx: 0, vy: 0 };
    const dir = diff > 0 ? +1 : -1;
    // If the opposite side is on the *heavier* side, the launch is in that
    // direction. The pan we launch from is on the lighter side.
    // Actually: the lighter pan goes up, so the ball on the lighter pan is
    // the one that flies off in the direction away from the heavier pan.
    // diff > 0 => left heavier => right pan up => right-pan ball flies right.
    return { vx: dir * magnitude, vy: -HOP_VELOCITY };
  }

  private updateAngle(): void {
    const diff = this.state.leftWeight - this.state.rightWeight;
    // Clamp tilt; the direction matches the sign of (left - right).
    const t = Math.max(-1, Math.min(1, diff / 10));
    this.state.angle = t * MAX_TILT;
  }
}

function weightOf(ball: Ball): number {
  return ball.kind.kind === "regular" ? ball.kind.weight : 1;
}
