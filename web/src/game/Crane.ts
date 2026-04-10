// The crane holds the next ball to drop and moves left/right along a
// rail at the top of the playfield. It is a thin input-driven helper.

import type { Ball } from "./types";

export class Crane {
  x: number;
  /** Current held ball (spawned when the previous one is dropped). */
  held: Ball | null = null;

  constructor(
    x: number,
    readonly y: number,
    readonly minX: number,
    readonly maxX: number,
  ) {
    this.x = x;
  }

  moveBy(dx: number): void {
    this.x = Math.max(this.minX, Math.min(this.maxX, this.x + dx));
  }

  /** Called when the player presses drop. Returns the detached ball. */
  drop(): Ball | null {
    const ball = this.held;
    if (!ball) return null;
    ball.x = this.x;
    ball.y = this.y + 24;
    ball.vx = 0;
    ball.vy = 0;
    this.held = null;
    return ball;
  }

  /** Attach the next ball above the rail. */
  hold(ball: Ball): void {
    this.held = ball;
    ball.x = this.x;
    ball.y = this.y;
    ball.vx = 0;
    ball.vy = 0;
    ball.cell = null;
  }
}
