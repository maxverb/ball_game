// Heads-up display: score, multiplier lamps, next-ball preview.
// Minimal Pixi container, redrawn from state each tick.

import { Container, Graphics, Text } from "pixi.js";
import type { Scoring } from "../game/Scoring";

export class HUD {
  readonly root = new Container();
  private scoreText: Text;
  private lamps: Graphics;

  constructor() {
    const panel = new Graphics()
      .roundRect(0, 0, 180, 90, 8)
      .fill({ color: 0x000010, alpha: 0.55 })
      .stroke({ color: 0x2a4aa0, width: 2 });
    this.root.addChild(panel);

    this.scoreText = new Text({
      text: "0",
      style: {
        fontFamily: "monospace",
        fontSize: 28,
        fill: 0xf8f8ff,
        fontWeight: "bold",
      },
    });
    this.scoreText.position.set(14, 6);
    this.root.addChild(this.scoreText);

    this.lamps = new Graphics();
    this.lamps.position.set(14, 52);
    this.root.addChild(this.lamps);

    const label = new Text({
      text: "BONUS",
      style: { fontFamily: "monospace", fontSize: 11, fill: 0xa0a8c8 },
    });
    label.position.set(14, 38);
    this.root.addChild(label);
  }

  update(scoring: Scoring): void {
    this.scoreText.text = scoring.score.toLocaleString();
    this.lamps.clear();
    const keys: (2 | 3 | 4)[] = [2, 3, 4];
    keys.forEach((k, i) => {
      const lit = scoring.lamps[k] > 0;
      const x = i * 48;
      this.lamps
        .roundRect(x, 0, 40, 22, 4)
        .fill({
          color: lit ? (k === 4 ? 0xffb000 : k === 3 ? 0xffd044 : 0xe8f090) : 0x15192c,
          alpha: lit ? 1 : 0.55,
        })
        .stroke({ color: 0x2a4aa0, width: 1 });
    });
    // labels printed over lamps
    if (this.lampLabels.length === 0) {
      for (let i = 0; i < 3; i++) {
        const t = new Text({
          text: `${keys[i]}×`,
          style: {
            fontFamily: "monospace",
            fontSize: 14,
            fill: 0x111122,
            fontWeight: "bold",
          },
        });
        t.position.set(i * 48 + 11, 3);
        this.lamps.addChild(t);
        this.lampLabels.push(t);
      }
    }
  }

  private lampLabels: Text[] = [];
}
