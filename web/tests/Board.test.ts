import { describe, expect, it } from "vitest";
import { Board } from "../src/game/Board";
import type { Ball, BallKind } from "../src/game/types";

let nextId = 1;

function makeBall(kind: BallKind): Ball {
  return {
    id: nextId++,
    kind,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    cell: null,
    passedSeeSaw: false,
  };
}

function placeRow(board: Board, row: number, kinds: BallKind[]): void {
  kinds.forEach((k, c) => {
    if (k) board.set(c, row, makeBall(k));
  });
}

describe("Board", () => {
  it("detects horizontal triple", () => {
    const b = new Board();
    placeRow(b, 5, [
      { kind: "regular", colour: "red", weight: 1 },
      { kind: "regular", colour: "red", weight: 2 },
      { kind: "regular", colour: "red", weight: 3 },
    ]);
    const m = b.findMatches();
    expect(m.size).toBe(3);
    expect(m.has("0,5")).toBe(true);
    expect(m.has("1,5")).toBe(true);
    expect(m.has("2,5")).toBe(true);
  });

  it("does not match different colours", () => {
    const b = new Board();
    placeRow(b, 4, [
      { kind: "regular", colour: "red", weight: 1 },
      { kind: "regular", colour: "blue", weight: 2 },
      { kind: "regular", colour: "red", weight: 3 },
    ]);
    expect(b.findMatches().size).toBe(0);
  });

  it("detects vertical triple", () => {
    const b = new Board();
    b.set(3, 5, makeBall({ kind: "regular", colour: "green", weight: 1 }));
    b.set(3, 6, makeBall({ kind: "regular", colour: "green", weight: 2 }));
    b.set(3, 7, makeBall({ kind: "regular", colour: "green", weight: 3 }));
    const m = b.findMatches();
    expect(m.size).toBe(3);
  });

  it("detects diagonal runs of length 4", () => {
    const b = new Board();
    const c = 2;
    const r = 2;
    for (let i = 0; i < 4; i++) {
      b.set(c + i, r + i, makeBall({ kind: "regular", colour: "yellow", weight: 1 }));
    }
    const m = b.findMatches();
    expect(m.size).toBe(4);
  });

  it("extras are never matched as colours", () => {
    const b = new Board();
    placeRow(b, 5, [
      { kind: "extra", extra: "heart" },
      { kind: "extra", extra: "heart" },
      { kind: "extra", extra: "heart" },
    ]);
    expect(b.findMatches().size).toBe(0);
  });

  it("three-in-a-row silver stars triggers clear", () => {
    const b = new Board();
    placeRow(b, 5, [
      { kind: "extra", extra: "star" },
      { kind: "extra", extra: "star" },
      { kind: "extra", extra: "star" },
    ]);
    expect(b.hasStarTriple()).toBe(true);
  });

  it("dropRowFor reflects gravity", () => {
    const b = new Board();
    expect(b.dropRowFor(0)).toBe(b.rows - 1);
    b.set(0, b.rows - 1, makeBall({ kind: "regular", colour: "red", weight: 1 }));
    expect(b.dropRowFor(0)).toBe(b.rows - 2);
  });
});
