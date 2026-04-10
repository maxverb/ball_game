import { describe, expect, it } from "vitest";
import { Scoring } from "../src/game/Scoring";

describe("Scoring", () => {
  it("first Dreier scores base, no multiplier consumed", () => {
    const s = new Scoring();
    const gained = s.registerDreier(3, 6);
    expect(gained).toBe(6 * 10 * 1 * 1);
    expect(s.score).toBe(gained);
    // After scoring, all three lamps light up
    expect(s.lamps[2]).toBeGreaterThan(0);
    expect(s.lamps[3]).toBeGreaterThan(0);
    expect(s.lamps[4]).toBeGreaterThan(0);
  });

  it("second Dreier consumes the 4x lamp", () => {
    const s = new Scoring();
    s.registerDreier(3, 10); // lights lamps
    const second = s.registerDreier(3, 10);
    expect(second).toBe(10 * 10 * 1 * 4);
    // 4x used → only 2 and 3 lamps remain from the re-light
    expect(s.lamps[4]).toBeGreaterThan(0); // re-lit after
  });

  it("lamps decay with time", () => {
    const s = new Scoring();
    s.registerDreier(3, 5);
    s.tick(3);
    expect(s.lamps[4]).toBeCloseTo(Scoring.LAMP_SECONDS - 3);
    s.tick(10);
    expect(s.lamps[4]).toBe(0);
    expect(s.lamps[3]).toBe(0);
    expect(s.lamps[2]).toBe(0);
  });

  it("4-in-a-row gets bonus from (ballCount-2) factor", () => {
    const s = new Scoring();
    const g = s.registerDreier(4, 10);
    expect(g).toBe(10 * 10 * 2 * 1);
  });
});
