// Board = the grid of settled balls. Pure data + helpers; no rendering.
// Unit-tested separately so that match detection is independent of Pixi.

import type { Ball, BallColour, BallKind } from "./types";

/** Grid dimensions (columns × rows). Classic SWING uses 12×12-ish. */
export const BOARD_COLS = 10;
export const BOARD_ROWS = 12;

export class Board {
  readonly cols = BOARD_COLS;
  readonly rows = BOARD_ROWS;
  /** cells[row][col]; null = empty. Row 0 is the **top** of the playfield. */
  readonly cells: (Ball | null)[][] = [];

  constructor() {
    for (let r = 0; r < BOARD_ROWS; r++) {
      this.cells.push(new Array(BOARD_COLS).fill(null));
    }
  }

  get(col: number, row: number): Ball | null {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return null;
    return this.cells[row][col];
  }

  set(col: number, row: number, ball: Ball | null): void {
    this.cells[row][col] = ball;
    if (ball) ball.cell = { col, row };
  }

  clearCell(col: number, row: number): void {
    this.cells[row][col] = null;
  }

  /**
   * Find the lowest empty row in a column, simulating gravity. Returns -1
   * if the column is completely full (→ game over trigger).
   */
  dropRowFor(col: number): number {
    for (let r = this.rows - 1; r >= 0; r--) {
      if (this.cells[r][col] === null) return r;
    }
    return -1;
  }

  /** True if the top row has any occupant — the game is lost. */
  isGameOver(): boolean {
    return this.cells[0].some((c) => c !== null);
  }

  /**
   * Find every "Dreier" (run of ≥3 same-colour regular balls, horizontally,
   * vertically, or diagonally). Returns the set of cells to clear.
   * Extra balls are treated as wildcards that do NOT participate in runs
   * (they have their own triggers).
   */
  findMatches(): Set<string> {
    const toClear = new Set<string>();
    const directions: ReadonlyArray<readonly [number, number]> = [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, -1],
    ];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const start = this.get(c, r);
        if (!start || start.kind.kind !== "regular") continue;
        const colour = start.kind.colour;
        for (const [dc, dr] of directions) {
          // only start a run when the previous cell in the direction is NOT
          // the same colour — avoids re-checking sub-runs.
          const prev = this.get(c - dc, r - dr);
          if (prev && sameColour(prev.kind, colour)) continue;

          const run: [number, number][] = [[c, r]];
          let cc = c + dc;
          let rr = r + dr;
          while (true) {
            const cell = this.get(cc, rr);
            if (!cell || !sameColour(cell.kind, colour)) break;
            run.push([cc, rr]);
            cc += dc;
            rr += dr;
          }
          if (run.length >= 3) {
            for (const [x, y] of run) toClear.add(`${x},${y}`);
          }
        }
      }
    }
    return toClear;
  }

  /**
   * Same detection logic but for silver-star extras — three in a row of
   * extra.star clears the whole board.
   */
  hasStarTriple(): boolean {
    const dirs: ReadonlyArray<readonly [number, number]> = [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, -1],
    ];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.get(c, r);
        if (!cell || cell.kind.kind !== "extra" || cell.kind.extra !== "star") continue;
        for (const [dc, dr] of dirs) {
          let count = 1;
          let cc = c + dc;
          let rr = r + dr;
          while (true) {
            const nxt = this.get(cc, rr);
            if (!nxt || nxt.kind.kind !== "extra" || nxt.kind.extra !== "star") break;
            count++;
            if (count >= 3) return true;
            cc += dc;
            rr += dr;
          }
        }
      }
    }
    return false;
  }

  /** Count of balls matching a predicate (for score calculations). */
  countWhere(pred: (b: Ball) => boolean): number {
    let n = 0;
    for (const row of this.cells) for (const c of row) if (c && pred(c)) n++;
    return n;
  }
}

function sameColour(kind: BallKind, colour: BallColour): boolean {
  return kind.kind === "regular" && kind.colour === colour;
}
