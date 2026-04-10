// Main game scene. Owns Board, Crane, SeeSaw, Scoring, HUD and the
// state machine (menu / playing / paused / gameover).
//
// Layout on the 640×480 canvas:
//
//   ┌─ HUD ─┐ ┌────── PLAYFIELD ──────┐
//   │ score │ │  crane  ============  │  y ≈ 22 (rail)
//   │ next  │ │     see-saw beam       │  y ≈ 54
//   │ lamps │ │  ┌──────────────────┐  │  y ≈ 80 (board top)
//   │ lvl   │ │  │                  │  │
//   │       │ │  │   10 × 12 grid   │  │
//   │       │ │  │                  │  │
//   └───────┘ │  └──────────────────┘  │  y ≈ 464 (board bottom)
//             └────────────────────────┘

import {
  Application,
  Assets,
  Container,
  Graphics,
  Sprite,
  Text,
  Texture,
} from "pixi.js";
import { AudioManager } from "../audio/AudioManager";
import { HUD } from "../ui/HUD";
import { BOARD_COLS, BOARD_ROWS, Board } from "./Board";
import { Crane } from "./Crane";
import { heartWrappedOut, rollExtra } from "./Extras";
import { stepBall } from "./Physics";
import { Scoring } from "./Scoring";
import { SeeSaw } from "./SeeSaw";
import { BALL_RADIUS, createBallWeightLabel, drawBall } from "./sprites";
import {
  BALL_COLOURS,
  type Ball,
  type BallKind,
  type BallWeight,
} from "./types";

const CANVAS_W = 640;
const CANVAS_H = 480;
const HUD_W = 150;
const HUD_X = 12;
const BOARD_ORIGIN_X = HUD_X + HUD_W + 16; // 178
const BOARD_ORIGIN_Y = 84;
const CELL = 30;
const BOARD_W = BOARD_COLS * CELL; // 300
const BOARD_H = BOARD_ROWS * CELL; // 360
const CRANE_Y = 26;
const SEESAW_Y = 58;
const HIGHSCORE_KEY = "swing-web-highscore";

type SceneState = "menu" | "playing" | "paused" | "gameover";

export class Game {
  readonly app: Application;
  readonly audio = new AudioManager();

  private readonly board = new Board();
  private readonly scoring = new Scoring();
  private readonly crane: Crane;
  private readonly seeSaw: SeeSaw;
  private readonly hud = new HUD();

  private readonly worldLayer = new Container();
  private readonly boardLayer = new Container();
  private readonly ballsLayer = new Container();
  private readonly fxLayer = new Container();
  private readonly menuLayer = new Container();
  private readonly overlayLayer = new Container();
  private readonly backgroundSprite = new Sprite();
  private readonly craneGraphic = new Graphics();
  private readonly seeSawGraphic = new Graphics();

  /** Balls currently in flight (not held, not settled). */
  private readonly airborne: Ball[] = [];
  /** Every ball visual container, keyed by id. */
  private readonly visuals = new Map<number, Container>();
  private nextBallId = 1;
  private nextKind: BallKind | null = null;

  private state: SceneState = "menu";
  private level = 1;
  private linesCleared = 0;
  private highscore = 0;
  private readonly keys = new Set<string>();
  private moveCooldown = 0;
  private rng = Math.random;

  constructor(app: Application) {
    this.app = app;
    this.crane = new Crane(
      BOARD_ORIGIN_X + BOARD_W / 2,
      CRANE_Y,
      BOARD_ORIGIN_X + CELL / 2,
      BOARD_ORIGIN_X + BOARD_W - CELL / 2,
    );
    this.seeSaw = new SeeSaw(
      BOARD_ORIGIN_X + BOARD_W / 2,
      SEESAW_Y,
      BOARD_W / 2 - 14,
    );
  }

  async init(): Promise<void> {
    await this.loadBackground();

    const frame = new Graphics()
      .roundRect(
        BOARD_ORIGIN_X - 6,
        BOARD_ORIGIN_Y - 6,
        BOARD_W + 12,
        BOARD_H + 12,
        6,
      )
      .fill({ color: 0x000018, alpha: 0.62 })
      .stroke({ color: 0x3a4aa0, width: 2 });
    this.worldLayer.addChild(frame);

    const grid = new Graphics();
    for (let c = 0; c <= BOARD_COLS; c++) {
      grid
        .moveTo(BOARD_ORIGIN_X + c * CELL, BOARD_ORIGIN_Y)
        .lineTo(BOARD_ORIGIN_X + c * CELL, BOARD_ORIGIN_Y + BOARD_H)
        .stroke({ color: 0x26305c, width: 1, alpha: 0.35 });
    }
    for (let r = 0; r <= BOARD_ROWS; r++) {
      grid
        .moveTo(BOARD_ORIGIN_X, BOARD_ORIGIN_Y + r * CELL)
        .lineTo(BOARD_ORIGIN_X + BOARD_W, BOARD_ORIGIN_Y + r * CELL)
        .stroke({ color: 0x26305c, width: 1, alpha: 0.35 });
    }
    this.worldLayer.addChild(grid);
    this.worldLayer.addChild(this.boardLayer);
    this.worldLayer.addChild(this.seeSawGraphic);
    this.worldLayer.addChild(this.craneGraphic);
    this.worldLayer.addChild(this.ballsLayer);
    this.worldLayer.addChild(this.fxLayer);
    this.app.stage.addChild(this.worldLayer);

    this.hud.root.position.set(HUD_X, BOARD_ORIGIN_Y - 2);
    this.app.stage.addChild(this.hud.root);
    this.app.stage.addChild(this.overlayLayer);
    this.app.stage.addChild(this.menuLayer);

    await this.audio.init();
    this.highscore = Number(localStorage.getItem(HIGHSCORE_KEY) ?? "0") || 0;

    this.showMenu();

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    this.app.ticker.add((ticker) => this.tick(ticker.deltaMS / 1000));
  }

  destroy(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }

  // ---------------------------------------------------------------- scenes
  private showMenu(): void {
    this.state = "menu";
    this.menuLayer.removeChildren();
    const bg = new Graphics()
      .rect(0, 0, CANVAS_W, CANVAS_H)
      .fill({ color: 0x000018, alpha: 0.72 });
    this.menuLayer.addChild(bg);

    const title = new Text({
      text: "SWING",
      style: {
        fontFamily: "monospace",
        fontSize: 80,
        fill: 0xe8edff,
        stroke: { color: 0x223080, width: 6 },
        fontWeight: "bold",
      },
    });
    title.anchor.set(0.5);
    title.position.set(CANVAS_W / 2, 140);
    this.menuLayer.addChild(title);

    const subtitle = new Text({
      text: "web remake · after Software 2000, 1997",
      style: { fontFamily: "monospace", fontSize: 14, fill: 0x9aa0c8 },
    });
    subtitle.anchor.set(0.5);
    subtitle.position.set(CANVAS_W / 2, 190);
    this.menuLayer.addChild(subtitle);

    const help = new Text({
      text:
        "← → move crane     ↓ / Enter drop     P pause     M mute\n\n" +
        "Match three spheres of the same colour to clear them.\n" +
        "Heavier spheres tilt the see-saw and launch the next ball\n" +
        "sideways on its way down.",
      style: {
        fontFamily: "monospace",
        fontSize: 14,
        fill: 0xc8d0ee,
        align: "center",
        lineHeight: 20,
      },
    });
    help.anchor.set(0.5);
    help.position.set(CANVAS_W / 2, 270);
    this.menuLayer.addChild(help);

    const hs = new Text({
      text: `high score: ${this.highscore.toLocaleString()}`,
      style: { fontFamily: "monospace", fontSize: 14, fill: 0xf2c848 },
    });
    hs.anchor.set(0.5);
    hs.position.set(CANVAS_W / 2, 360);
    this.menuLayer.addChild(hs);

    const prompt = new Text({
      text: "press SPACE or ENTER to play",
      style: {
        fontFamily: "monospace",
        fontSize: 18,
        fill: 0xffffff,
        fontWeight: "bold",
      },
    });
    prompt.anchor.set(0.5);
    prompt.position.set(CANVAS_W / 2, 410);
    this.menuLayer.addChild(prompt);
    this.menuBlink = prompt;
  }
  private menuBlink: Text | null = null;

  private startGame(): void {
    this.menuLayer.removeChildren();
    this.menuBlink = null;
    this.overlayLayer.removeChildren();

    // Wipe game state
    for (const [id, cont] of this.visuals) {
      cont.destroy({ children: true });
      this.visuals.delete(id);
    }
    this.airborne.length = 0;
    for (let r = 0; r < this.board.rows; r++) {
      for (let c = 0; c < this.board.cols; c++) this.board.clearCell(c, r);
    }
    this.seeSaw.reset();
    this.scoring.score = 0;
    this.scoring.lamps = { 2: 0, 3: 0, 4: 0 };
    this.level = 1;
    this.linesCleared = 0;
    this.state = "playing";

    // Seed the queue: next then held
    this.nextKind = this.randomBallKind();
    this.spawnNextBall();
    this.audio.play("start");
  }

  private async loadBackground(): Promise<void> {
    try {
      const tex = await Assets.load<Texture>("assets/backgrounds/grf_hinterh.png");
      this.backgroundSprite.texture = tex;
      this.backgroundSprite.width = CANVAS_W;
      this.backgroundSprite.height = CANVAS_H;
      this.worldLayer.addChild(this.backgroundSprite);
    } catch {
      const g = new Graphics().rect(0, 0, CANVAS_W, CANVAS_H).fill({ color: 0x0a0c1a });
      this.worldLayer.addChild(g);
    }
  }

  // ------------------------------------------------------------------ tick
  private tick(dt: number): void {
    if (this.menuBlink) {
      this.menuBlink.alpha = 0.5 + Math.sin(performance.now() / 250) * 0.5;
    }
    if (this.state !== "playing") return;

    this.scoring.tick(dt);

    // Crane input with auto-repeat
    this.moveCooldown -= dt;
    if (this.moveCooldown <= 0) {
      if (this.keys.has("ArrowLeft")) {
        this.crane.moveBy(-CELL);
        this.moveCooldown = 0.09;
      } else if (this.keys.has("ArrowRight")) {
        this.crane.moveBy(CELL);
        this.moveCooldown = 0.09;
      }
    }
    // Keep held ball glued to the crane
    if (this.crane.held) {
      this.crane.held.x = this.crane.x;
      this.crane.held.y = this.crane.y;
    }

    // Airborne physics
    const leftWall = BOARD_ORIGIN_X + BALL_RADIUS;
    const rightWall = BOARD_ORIGIN_X + BOARD_W - BALL_RADIUS;
    for (let i = this.airborne.length - 1; i >= 0; i--) {
      const ball = this.airborne[i];
      stepBall(ball, dt, leftWall, rightWall);

      // Heart → bomb wrap-around
      if (
        ball.kind.kind === "extra" &&
        ball.kind.extra === "heart" &&
        heartWrappedOut(ball.x, leftWall - 24, rightWall + 24)
      ) {
        ball.kind = { kind: "extra", extra: "bomb" };
        ball.x = ball.x < leftWall ? rightWall : leftWall;
        ball.vx = -ball.vx * 0.3;
        this.refreshVisual(ball);
      }

      // See-saw launch (once per ball, while it's travelling down)
      if (!ball.passedSeeSaw && ball.vy > 0 && ball.y >= SEESAW_Y) {
        const side = ball.x < this.seeSaw.state.pivotX ? "left" : "right";
        const vec = this.seeSaw.launch(ball, side);
        ball.vx = vec.vx;
        ball.vy = Math.max(vec.vy, 40);
        ball.passedSeeSaw = true;
        if (vec.vx !== 0) this.audio.play("wupp");
      }
    }

    // Settle into the board
    let dirty = false;
    for (let i = this.airborne.length - 1; i >= 0; i--) {
      const ball = this.airborne[i];
      if (!ball.passedSeeSaw || ball.vy <= 0) continue;
      const col = this.colAt(ball.x);
      if (col < 0 || col >= BOARD_COLS) continue;
      const dropRow = this.board.dropRowFor(col);
      if (dropRow < 0) continue;
      const targetY = BOARD_ORIGIN_Y + dropRow * CELL + CELL / 2;
      if (ball.y >= targetY) {
        ball.x = BOARD_ORIGIN_X + col * CELL + CELL / 2;
        ball.y = targetY;
        ball.vx = 0;
        ball.vy = 0;
        this.board.set(col, dropRow, ball);
        this.airborne.splice(i, 1);
        this.audio.play("klack");
        dirty = true;
      }
    }

    if (dirty) this.resolveMatches();

    if (this.board.isGameOver()) {
      this.onGameOver();
      return;
    }

    this.drawCrane();
    this.drawSeeSaw();
    this.syncVisuals();
    this.hud.update(this.scoring, {
      level: this.level,
      nextKind: this.nextKind,
      highscore: this.highscore,
    });
  }

  // ---------------------------------------------------------------- helpers
  private colAt(x: number): number {
    return Math.floor((x - BOARD_ORIGIN_X) / CELL);
  }

  private spawnNextBall(): void {
    const kind = this.nextKind ?? this.randomBallKind();
    const ball: Ball = {
      id: this.nextBallId++,
      kind,
      x: this.crane.x,
      y: this.crane.y,
      vx: 0,
      vy: 0,
      cell: null,
      passedSeeSaw: false,
    };
    const container = new Container();
    const gfx = new Graphics();
    container.addChild(gfx);
    drawBall(gfx, kind);
    const label = createBallWeightLabel(kind);
    if (label) container.addChild(label);
    this.ballsLayer.addChild(container);
    this.visuals.set(ball.id, container);
    this.crane.hold(ball);
    this.nextKind = this.randomBallKind();
  }

  private refreshVisual(ball: Ball): void {
    const cont = this.visuals.get(ball.id);
    if (!cont) return;
    cont.removeChildren();
    const gfx = new Graphics();
    cont.addChild(gfx);
    drawBall(gfx, ball.kind);
    const label = createBallWeightLabel(ball.kind);
    if (label) cont.addChild(label);
  }

  private randomBallKind(): BallKind {
    const extra = rollExtra(this.rng, 0.06 + this.level * 0.005);
    if (extra) return { kind: "extra", extra };
    const colour = BALL_COLOURS[Math.floor(this.rng() * BALL_COLOURS.length)];
    const weight = (1 + Math.floor(this.rng() * 9)) as BallWeight;
    return { kind: "regular", colour, weight };
  }

  private drawCrane(): void {
    const g = this.craneGraphic;
    g.clear();
    g.moveTo(BOARD_ORIGIN_X, this.crane.y - 14)
      .lineTo(BOARD_ORIGIN_X + BOARD_W, this.crane.y - 14)
      .stroke({ color: 0x6080c0, width: 3 });
    g.rect(this.crane.x - 18, this.crane.y - 22, 36, 9).fill({ color: 0x8a9ad8 });
    g.rect(this.crane.x - 14, this.crane.y - 13, 28, 3).fill({ color: 0x6080c0 });
    g.rect(this.crane.x - 2, this.crane.y - 10, 4, 14).fill({ color: 0x6080c0 });
  }

  private drawSeeSaw(): void {
    const g = this.seeSawGraphic;
    g.clear();
    const { pivotX, pivotY, halfLen, angle } = this.seeSaw.state;
    g.rect(pivotX - 3, pivotY, 6, 18).fill({ color: 0x3a4466 });
    g.circle(pivotX, pivotY, 4).fill({ color: 0x7a88aa });
    const lx = pivotX - Math.cos(angle) * halfLen;
    const ly = pivotY + Math.sin(angle) * halfLen;
    const rx = pivotX + Math.cos(angle) * halfLen;
    const ry = pivotY - Math.sin(angle) * halfLen;
    g.moveTo(lx, ly)
      .lineTo(rx, ry)
      .stroke({ color: 0xc0c8e0, width: 5, cap: "round" });
    // Weight bubbles at the ends
    const labelAt = (x: number, y: number, w: number, dimmed: boolean): void => {
      if (w === 0) return;
      g.circle(x, y, 6).fill({ color: dimmed ? 0x303860 : 0xffd060 });
    };
    labelAt(lx, ly - 3, this.seeSaw.state.leftWeight, false);
    labelAt(rx, ry - 3, this.seeSaw.state.rightWeight, false);
  }

  private syncVisuals(): void {
    const held = this.crane.held;
    if (held) {
      const cont = this.visuals.get(held.id);
      if (cont) cont.position.set(held.x, held.y);
    }
    for (const b of this.airborne) {
      const cont = this.visuals.get(b.id);
      if (cont) cont.position.set(b.x, b.y);
    }
    for (let r = 0; r < this.board.rows; r++) {
      for (let c = 0; c < this.board.cols; c++) {
        const b = this.board.get(c, r);
        if (!b) continue;
        const cont = this.visuals.get(b.id);
        if (cont) cont.position.set(b.x, b.y);
      }
    }
  }

  private resolveMatches(): void {
    if (this.board.hasStarTriple()) {
      this.audio.play("star");
      const remaining = this.board.countWhere(() => true);
      this.scoring.registerStarClear(remaining);
      this.linesCleared += remaining;
      this.clearEntireBoard();
    }

    let safety = 0;
    while (safety++ < 6) {
      const matched = this.board.findMatches();
      if (matched.size === 0) break;
      this.audio.play("dreier");
      let weightSum = 0;
      for (const key of matched) {
        const [cs, rs] = key.split(",");
        const c = Number(cs);
        const r = Number(rs);
        const b = this.board.get(c, r);
        if (b && b.kind.kind === "regular") weightSum += b.kind.weight;
        if (b) {
          const cont = this.visuals.get(b.id);
          if (cont) cont.destroy({ children: true });
          this.visuals.delete(b.id);
        }
        this.board.clearCell(c, r);
      }
      this.scoring.registerDreier(matched.size, weightSum);
      this.linesCleared++;
      this.applyGravity();
    }

    // Level up every 8 matches cleared
    const targetLevel = 1 + Math.floor(this.linesCleared / 8);
    if (targetLevel > this.level) {
      this.level = targetLevel;
      this.audio.play("huhu");
    }

    if (this.scoring.score > this.highscore) {
      this.highscore = this.scoring.score;
      localStorage.setItem(HIGHSCORE_KEY, String(this.highscore));
    }

    if (!this.crane.held && this.state === "playing") {
      this.spawnNextBall();
    }
  }

  private clearEntireBoard(): void {
    for (let r = 0; r < this.board.rows; r++) {
      for (let c = 0; c < this.board.cols; c++) {
        const b = this.board.get(c, r);
        if (!b) continue;
        const cont = this.visuals.get(b.id);
        if (cont) cont.destroy({ children: true });
        this.visuals.delete(b.id);
        this.board.clearCell(c, r);
      }
    }
  }

  private applyGravity(): void {
    for (let c = 0; c < this.board.cols; c++) {
      const stack: Ball[] = [];
      for (let r = this.board.rows - 1; r >= 0; r--) {
        const b = this.board.get(c, r);
        if (b) stack.push(b);
        this.board.clearCell(c, r);
      }
      let row = this.board.rows - 1;
      for (const b of stack) {
        this.board.set(c, row, b);
        b.x = BOARD_ORIGIN_X + c * CELL + CELL / 2;
        b.y = BOARD_ORIGIN_Y + row * CELL + CELL / 2;
        row--;
      }
    }
  }

  private onGameOver(): void {
    if (this.state === "gameover") return;
    this.state = "gameover";
    this.audio.play("grExplo");
    if (this.scoring.score > this.highscore) {
      this.highscore = this.scoring.score;
      localStorage.setItem(HIGHSCORE_KEY, String(this.highscore));
    }
    this.overlayLayer.removeChildren();
    const bg = new Graphics()
      .rect(0, 0, CANVAS_W, CANVAS_H)
      .fill({ color: 0x000018, alpha: 0.78 });
    this.overlayLayer.addChild(bg);
    const title = new Text({
      text: "GAME OVER",
      style: {
        fontFamily: "monospace",
        fontSize: 54,
        fill: 0xff8090,
        fontWeight: "bold",
        stroke: { color: 0x400810, width: 4 },
      },
    });
    title.anchor.set(0.5);
    title.position.set(CANVAS_W / 2, 170);
    this.overlayLayer.addChild(title);

    const info = new Text({
      text:
        `Score: ${this.scoring.score.toLocaleString()}\n` +
        `High score: ${this.highscore.toLocaleString()}\n` +
        `Level reached: ${this.level}\n\n` +
        `press SPACE to play again`,
      style: {
        fontFamily: "monospace",
        fontSize: 18,
        fill: 0xf0f2ff,
        align: "center",
        lineHeight: 26,
      },
    });
    info.anchor.set(0.5);
    info.position.set(CANVAS_W / 2, 280);
    this.overlayLayer.addChild(info);
  }

  private showPause(): void {
    this.overlayLayer.removeChildren();
    const bg = new Graphics()
      .rect(0, 0, CANVAS_W, CANVAS_H)
      .fill({ color: 0x000018, alpha: 0.68 });
    const t = new Text({
      text: "PAUSED\n\npress P to resume",
      style: {
        fontFamily: "monospace",
        fontSize: 32,
        fill: 0xffffff,
        align: "center",
        fontWeight: "bold",
      },
    });
    t.anchor.set(0.5);
    t.position.set(CANVAS_W / 2, CANVAS_H / 2);
    this.overlayLayer.addChild(bg);
    this.overlayLayer.addChild(t);
  }

  // ------------------------------------------------------------------ input
  private onKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.key);
    const k = e.key;
    if (this.state === "menu") {
      if (k === " " || k === "Enter") this.startGame();
      return;
    }
    if (this.state === "gameover") {
      if (k === " " || k === "Enter") {
        this.startGame();
      }
      return;
    }
    if (this.state === "paused") {
      if (k === "p" || k === "P") {
        this.state = "playing";
        this.overlayLayer.removeChildren();
      }
      return;
    }
    // playing
    if (k === "ArrowDown" || k === "Enter" || k === " ") {
      this.dropHeldBall();
    } else if (k === "p" || k === "P") {
      this.state = "paused";
      this.showPause();
    } else if (k === "m" || k === "M") {
      this.audio.toggleMute();
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key);
  };

  private dropHeldBall(): void {
    const ball = this.crane.drop();
    if (!ball) return;
    this.audio.play("kran");
    ball.vy = 60 + this.level * 8; // initial nudge scales with level
    ball.passedSeeSaw = false;
    this.airborne.push(ball);
    this.spawnNextBall();
  }
}
