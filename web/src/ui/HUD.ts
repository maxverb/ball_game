// Heads-up display: score, multiplier lamps, next-ball preview, level,
// high score. Redrawn from state each tick.

import { Container, Graphics, Text } from "pixi.js";
import type { Scoring } from "../game/Scoring";
import type { BallKind } from "../game/types";
import { drawBall } from "../game/sprites";

export interface HudUpdate {
  level: number;
  nextKind: BallKind | null;
  highscore: number;
}

export class HUD {
  readonly root = new Container();
  private readonly scoreText: Text;
  private readonly levelText: Text;
  private readonly highText: Text;
  private readonly lamps: Graphics;
  private readonly lampLabels: Text[] = [];
  private readonly nextBallGfx = new Graphics();
  private readonly nextLabel: Text;
  private lastNextKey = "";

  constructor() {
    const panel = new Graphics()
      .roundRect(0, 0, 150, 364, 8)
      .fill({ color: 0x000014, alpha: 0.6 })
      .stroke({ color: 0x2a4aa0, width: 2 });
    this.root.addChild(panel);

    const scoreLabel = new Text({
      text: "SCORE",
      style: { fontFamily: "monospace", fontSize: 11, fill: 0x9aa0c8 },
    });
    scoreLabel.position.set(12, 8);
    this.root.addChild(scoreLabel);

    this.scoreText = new Text({
      text: "0",
      style: {
        fontFamily: "monospace",
        fontSize: 26,
        fill: 0xf8f8ff,
        fontWeight: "bold",
      },
    });
    this.scoreText.position.set(12, 22);
    this.root.addChild(this.scoreText);

    const bonusLabel = new Text({
      text: "BONUS",
      style: { fontFamily: "monospace", fontSize: 11, fill: 0x9aa0c8 },
    });
    bonusLabel.position.set(12, 60);
    this.root.addChild(bonusLabel);

    this.lamps = new Graphics();
    this.lamps.position.set(12, 74);
    this.root.addChild(this.lamps);

    // Level
    const levelLabel = new Text({
      text: "LEVEL",
      style: { fontFamily: "monospace", fontSize: 11, fill: 0x9aa0c8 },
    });
    levelLabel.position.set(12, 112);
    this.root.addChild(levelLabel);

    this.levelText = new Text({
      text: "1",
      style: {
        fontFamily: "monospace",
        fontSize: 22,
        fill: 0xffd060,
        fontWeight: "bold",
      },
    });
    this.levelText.position.set(12, 126);
    this.root.addChild(this.levelText);

    // High score
    const hsLabel = new Text({
      text: "HIGH",
      style: { fontFamily: "monospace", fontSize: 11, fill: 0x9aa0c8 },
    });
    hsLabel.position.set(12, 162);
    this.root.addChild(hsLabel);

    this.highText = new Text({
      text: "0",
      style: {
        fontFamily: "monospace",
        fontSize: 16,
        fill: 0xf2c848,
      },
    });
    this.highText.position.set(12, 176);
    this.root.addChild(this.highText);

    // Next ball preview
    this.nextLabel = new Text({
      text: "NEXT",
      style: { fontFamily: "monospace", fontSize: 11, fill: 0x9aa0c8 },
    });
    this.nextLabel.position.set(12, 218);
    this.root.addChild(this.nextLabel);

    const nextBox = new Graphics()
      .roundRect(12, 232, 54, 54, 4)
      .fill({ color: 0x0a0e22, alpha: 0.7 })
      .stroke({ color: 0x3a4aa0, width: 1 });
    this.root.addChild(nextBox);

    const nextHolder = new Container();
    nextHolder.position.set(12 + 27, 232 + 27);
    nextHolder.addChild(this.nextBallGfx);
    this.root.addChild(nextHolder);

    const hint = new Text({
      text: "P pause\nM mute",
      style: { fontFamily: "monospace", fontSize: 11, fill: 0x8088b0 },
    });
    hint.position.set(12, 320);
    this.root.addChild(hint);
  }

  update(scoring: Scoring, extra?: HudUpdate): void {
    this.scoreText.text = scoring.score.toLocaleString();
    this.lamps.clear();
    const keys: (2 | 3 | 4)[] = [2, 3, 4];
    keys.forEach((k, i) => {
      const lit = scoring.lamps[k] > 0;
      const x = i * 42;
      this.lamps
        .roundRect(x, 0, 36, 20, 4)
        .fill({
          color: lit
            ? k === 4
              ? 0xffb000
              : k === 3
                ? 0xffd044
                : 0xe8f090
            : 0x15192c,
          alpha: lit ? 1 : 0.55,
        })
        .stroke({ color: 0x2a4aa0, width: 1 });
    });
    if (this.lampLabels.length === 0) {
      for (let i = 0; i < 3; i++) {
        const t = new Text({
          text: `${keys[i]}×`,
          style: {
            fontFamily: "monospace",
            fontSize: 13,
            fill: 0x111122,
            fontWeight: "bold",
          },
        });
        t.position.set(i * 42 + 9, 3);
        this.lamps.addChild(t);
        this.lampLabels.push(t);
      }
    }
    if (extra) {
      this.levelText.text = String(extra.level);
      this.highText.text = extra.highscore.toLocaleString();
      const key = JSON.stringify(extra.nextKind);
      if (key !== this.lastNextKey) {
        this.lastNextKey = key;
        this.nextBallGfx.clear();
        if (extra.nextKind) drawBall(this.nextBallGfx, extra.nextKind);
      }
    }
  }
}
