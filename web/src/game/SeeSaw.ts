// SeeSaw (German: "Wippe") — the signature mechanic of SWING.
//
// Mechanics (as I read README.TXT):
//   "When a sphere is thrown, the distance it travels will depend on
//    the difference in the weights on the see-saw."
//
// The see-saw sits below the crane and above the board grid. It is a
// stateful launch pad with two weight "memories" — one per pan. A ball
// drop has two effects:
//
//   1. The new ball is launched sideways with a velocity proportional
//      to the weight *difference* between the two pans as they currently
//      stand. That ball then falls freely into the board.
//   2. Afterwards the pan that caught the ball updates its stored
//      weight to the new ball's weight, so the next drop uses fresh
//      values.
//
// This keeps the see-saw as a pure (deterministic) function and avoids
// the need to time-base any rigid-body rotation. Visually we still draw
// a tilted beam so the player sees the imbalance.

import type { Ball, SeeSawState } from "./types";

export interface LaunchResult {
  /** Horizontal launch velocity (px/s) applied to the ball just dropped. */
  vx: number;
  /** Small initial upward velocity so the launch looks like a hop. */
  vy: number;
}

/** How many pixels per second the launch adds per weight-unit of diff. */
const LAUNCH_PX_PER_WEIGHT_UNIT = 70;
/** Small upward hop (px/s) so the ball visibly arcs sideways. */
const HOP_VELOCITY = 180;
/** Max visual tilt of the beam. */
const MAX_TILT = Math.PI / 5;

export class SeeSaw {
  state: SeeSawState;

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

  /**
   * Launch the ball sideways based on the current pan imbalance and then
   * update the stored weight on the side it landed. Returns the launch
   * velocity so the caller can apply it to the ball.
   */
  launch(ball: Ball, side: "left" | "right"): LaunchResult {
    const newWeight = weightOf(ball);
    // Imbalance BEFORE this drop settles — that's what gets launched.
    const beforeDiff = this.state.leftWeight - this.state.rightWeight;
    if (side === "left") {
      this.state.leftWeight = newWeight;
    } else {
      this.state.rightWeight = newWeight;
    }
    this.updateAngle();
    if (this.state.leftWeight === 0 || this.state.rightWeight === 0) {
      // First ball on this see-saw — no launch, just fall straight.
      return { vx: 0, vy: 0 };
    }
    // Positive beforeDiff => left was heavier => right pan was up, so
    // launching from the right side tosses the ball to the right.
    // A ball dropped on the LEFT of a left-heavier saw gets tossed left.
    const dir = side === "left" ? -Math.sign(beforeDiff) : Math.sign(beforeDiff);
    if (dir === 0) return { vx: 0, vy: 0 };
    const magnitude = Math.min(6, Math.abs(beforeDiff)) * LAUNCH_PX_PER_WEIGHT_UNIT;
    return { vx: dir * magnitude, vy: -HOP_VELOCITY };
  }

  /** Wipe the see-saw (e.g. for a new level). */
  reset(): void {
    this.state.leftWeight = 0;
    this.state.rightWeight = 0;
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

  private updateAngle(): void {
    const diff = this.state.leftWeight - this.state.rightWeight;
    const t = Math.max(-1, Math.min(1, diff / 10));
    this.state.angle = t * MAX_TILT;
  }
}

function weightOf(ball: Ball): number {
  return ball.kind.kind === "regular" ? ball.kind.weight : 1;
}
