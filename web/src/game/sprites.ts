// Procedural sprite factory. Since the original `.SET`/`.RES` decoders
// are still WIP (see docs/ASSETS.md), the initial playable build draws
// the balls, crane and see-saw from code. Once the decoders are done
// these functions get replaced with real PixiJS textures loaded from
// `/assets/sprites/`.

import { Graphics, Text } from "pixi.js";
import type { BallColour, BallKind, BallWeight, ExtraKind } from "./types";

export const BALL_RADIUS = 16;

const COLOUR_HEX: Record<BallColour, number> = {
  red: 0xe04a3a,
  yellow: 0xf2d13b,
  green: 0x47c04a,
  blue: 0x4a7ce0,
  purple: 0xa35be0,
  orange: 0xe89a3c,
};

const COLOUR_SHADE: Record<BallColour, number> = {
  red: 0x8a1e16,
  yellow: 0x8c7410,
  green: 0x1d6f21,
  blue: 0x1d3d8a,
  purple: 0x53207c,
  orange: 0x8a5615,
};

export function drawBall(g: Graphics, kind: BallKind): void {
  g.clear();
  if (kind.kind === "regular") {
    drawRegular(g, kind.colour, kind.weight);
  } else {
    drawExtra(g, kind.extra);
  }
}

function drawRegular(g: Graphics, colour: BallColour, _weight: BallWeight): void {
  // radial-ish: outer ring (shade), inner (colour), highlight
  g.circle(0, 0, BALL_RADIUS).fill({ color: COLOUR_SHADE[colour] });
  g.circle(0, 0, BALL_RADIUS - 2).fill({ color: COLOUR_HEX[colour] });
  g.circle(-5, -5, 4).fill({ color: 0xffffff, alpha: 0.55 });
  // weight number is rendered as a Text in createBallWeightLabel — we keep
  // the Graphics node a pure shape so it can be updated without a re-layout.
}

function drawExtra(g: Graphics, extra: ExtraKind): void {
  switch (extra) {
    case "heart":
      g.circle(0, 0, BALL_RADIUS).fill({ color: 0x2a0c14 });
      drawHeart(g, 0xff4b6e);
      break;
    case "bomb":
      g.circle(0, 0, BALL_RADIUS).fill({ color: 0x000000 });
      g.circle(0, 2, BALL_RADIUS - 4).fill({ color: 0x1a1a1a });
      g.circle(-5, -5, 3).fill({ color: 0xffffff, alpha: 0.35 });
      // fuse
      g.moveTo(0, -BALL_RADIUS + 2)
        .lineTo(4, -BALL_RADIUS - 4)
        .stroke({ color: 0x887744, width: 2 });
      break;
    case "star":
      g.circle(0, 0, BALL_RADIUS).fill({ color: 0x1a1b24 });
      drawStar(g, 0xe9e9f0);
      break;
    case "bonus2":
    case "bonus3":
    case "bonus4":
      g.circle(0, 0, BALL_RADIUS).fill({ color: 0x111122 });
      g.circle(0, 0, BALL_RADIUS - 3).fill({ color: 0xffc040 });
      // number gets drawn via the label helper
      break;
  }
}

function drawHeart(g: Graphics, color: number): void {
  const r = BALL_RADIUS - 5;
  g.moveTo(0, r * 0.9)
    .bezierCurveTo(r * 1.2, r * 0.1, r * 0.9, -r, 0, -r * 0.4)
    .bezierCurveTo(-r * 0.9, -r, -r * 1.2, r * 0.1, 0, r * 0.9)
    .fill({ color });
}

function drawStar(g: Graphics, color: number): void {
  const outer = BALL_RADIUS - 3;
  const inner = outer * 0.45;
  const points: number[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    points.push(Math.cos(a) * r, Math.sin(a) * r);
  }
  g.poly(points).fill({ color });
}

export function createBallWeightLabel(kind: BallKind): Text | null {
  if (kind.kind !== "regular") {
    if (kind.kind === "extra" && kind.extra.startsWith("bonus")) {
      const n = kind.extra.replace("bonus", "");
      return new Text({
        text: `${n}×`,
        style: { fontFamily: "monospace", fontSize: 14, fill: 0x111122, fontWeight: "bold" },
        anchor: 0.5,
      });
    }
    return null;
  }
  return new Text({
    text: String(kind.kind === "regular" ? kind.weight : ""),
    style: {
      fontFamily: "monospace",
      fontSize: 14,
      fill: 0xffffff,
      stroke: { color: 0x000000, width: 3 },
    },
    anchor: 0.5,
  });
}
