// Scoring + chain multiplier state.
//
// From README.TXT:
//   "After a Three is thrown, the bonus lights 4x, 3x and 2x will light
//    up. If you then throw another Three, the points will be multiplied
//    by the amount shown by the lights."
//
// The exact decay timing is not documented; we approximate: the next
// Dreier consumes the strongest lit lamp and halves the rest.

export type MultiplierLamp = 2 | 3 | 4;

export class Scoring {
  score = 0;
  /** Seconds remaining on each lamp; 0 = not lit. */
  lamps: Record<MultiplierLamp, number> = { 2: 0, 3: 0, 4: 0 };

  static readonly LAMP_SECONDS = 6;

  /** Call when a Dreier is cleared. Returns the points earned. */
  registerDreier(ballCount: number, ballWeightSum: number): number {
    const mult = this.consumeBestLamp();
    // base score: sum of weights, × 10, × (ballCount-2) to reward 4+ chains.
    const base = ballWeightSum * 10 * Math.max(1, ballCount - 2);
    const gained = base * mult;
    this.score += gained;
    // After the Dreier resolves, light all three lamps fresh. The "strongest"
    // lamp is the one that gets consumed on the next Dreier.
    this.lightLamps();
    return gained;
  }

  /** Called when a star-triple clears the board. */
  registerStarClear(remaining: number): number {
    const gained = remaining * 200 * this.consumeBestLamp();
    this.score += gained;
    this.lightLamps();
    return gained;
  }

  tick(dt: number): void {
    for (const k of [2, 3, 4] as MultiplierLamp[]) {
      if (this.lamps[k] > 0) this.lamps[k] = Math.max(0, this.lamps[k] - dt);
    }
  }

  private consumeBestLamp(): number {
    if (this.lamps[4] > 0) {
      this.lamps[4] = 0;
      return 4;
    }
    if (this.lamps[3] > 0) {
      this.lamps[3] = 0;
      return 3;
    }
    if (this.lamps[2] > 0) {
      this.lamps[2] = 0;
      return 2;
    }
    return 1;
  }

  private lightLamps(): void {
    this.lamps[2] = Scoring.LAMP_SECONDS;
    this.lamps[3] = Scoring.LAMP_SECONDS;
    this.lamps[4] = Scoring.LAMP_SECONDS;
  }
}
