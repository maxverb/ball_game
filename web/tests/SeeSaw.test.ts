import { describe, expect, it } from "vitest";
import { SeeSaw } from "../src/game/SeeSaw";
import type { Ball, BallKind } from "../src/game/types";

let nextId = 1;
function mkBall(weight: number): Ball {
  const kind: BallKind = { kind: "regular", colour: "red", weight: weight as 1 };
  return { id: nextId++, kind, x: 0, y: 0, vx: 0, vy: 0, cell: null };
}

describe("SeeSaw", () => {
  it("empty seesaw accepts first ball with no launch", () => {
    const s = new SeeSaw(100, 100);
    const first = mkBall(3);
    const r = s.place(first, "left");
    expect(r.launched).toBeNull();
    expect(s.left).toBe(first);
  });

  it("heavier incoming launches the lighter resting ball outward", () => {
    const s = new SeeSaw(100, 100);
    const resting = mkBall(1);
    s.place(resting, "right");
    const heavy = mkBall(5);
    const { launched, vector } = s.place(heavy, "left");
    expect(launched).toBe(resting);
    // diff = 5 - 1 = 4 positive => right pan up => rightward launch
    expect(vector.vx).toBeGreaterThan(0);
    expect(vector.vy).toBeLessThan(0); // hop upward
  });

  it("equal weights produce no launch", () => {
    const s = new SeeSaw(100, 100);
    s.place(mkBall(3), "left");
    const r = s.place(mkBall(3), "right");
    expect(r.launched).toBeNull();
    expect(r.vector.vx).toBe(0);
  });
});
