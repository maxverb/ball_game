// Extras (power-ups). The README enumerates three:
//
//   * Heart — "When a Heart is thrown outside the playing area, it
//     appears on the other side as a bomb."
//   * Bonus  — multiplier lamps (handled in Scoring.ts).
//   * Star   — "When three silver stars are lying next to each other,
//     the whole playing area will be cleared."
//
// This module only owns the spawn probability + the heart→bomb wrap
// detection. Clearing the board and crediting the multiplier is the
// responsibility of Game.ts / Scoring.ts.

import type { ExtraKind } from "./types";

const EXTRA_SPAWN_WEIGHTS: Record<ExtraKind, number> = {
  heart: 4,
  star: 2,
  bomb: 0, // only produced by heart wrap-around
  bonus2: 0,
  bonus3: 0,
  bonus4: 0,
};

/** Roll a d100 to decide whether to spawn an extra instead of a regular
 *  ball. Returns null (= regular ball) or an extra kind. */
export function rollExtra(rng: () => number, extraChance = 0.07): ExtraKind | null {
  if (rng() >= extraChance) return null;
  const entries = Object.entries(EXTRA_SPAWN_WEIGHTS).filter(
    ([, w]) => w > 0,
  ) as [ExtraKind, number][];
  const total = entries.reduce((a, [, w]) => a + w, 0);
  let roll = rng() * total;
  for (const [kind, w] of entries) {
    roll -= w;
    if (roll <= 0) return kind;
  }
  return null;
}

/** True if a heart has flown past the left or right wall. */
export function heartWrappedOut(x: number, leftWall: number, rightWall: number): boolean {
  return x < leftWall - 8 || x > rightWall + 8;
}
