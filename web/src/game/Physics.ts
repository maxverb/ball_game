// Simple deterministic ball physics. Gravity + side walls + grid snap.
// The see-saw launch vectors are produced by SeeSaw.ts and injected here.

import type { Ball } from "./types";

export const GRAVITY = 1200; // px/s²
export const WALL_BOUNCE = 0.35; // energy kept on wall hit

export function stepBall(ball: Ball, dt: number, leftWall: number, rightWall: number): void {
  ball.vy += GRAVITY * dt;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  // Side walls keep the ball inside the playfield rectangle.
  if (ball.x < leftWall) {
    ball.x = leftWall;
    ball.vx = -ball.vx * WALL_BOUNCE;
  } else if (ball.x > rightWall) {
    ball.x = rightWall;
    ball.vx = -ball.vx * WALL_BOUNCE;
  }
}
