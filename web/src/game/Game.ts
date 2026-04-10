// The main game scene. Owns the Board, Crane, SeeSaw, Scoring and HUD
// and implements the update loop.
//
// Coordinate system: the playfield is a 640×480 canvas with the board
// occupying the centre and a 90px wide HUD strip on the right.

import {
  Application,
  Assets,
  Container,
  Graphics,
  Sprite,
  Text,
  Texture,
} from "pixi.js";
import { BOARD_COLS, BOARD_ROWS, Board } from "./Board";
import { Crane } from "./Crane";
import { heartWrappedOut, rollExtra } from "./Extras";
import { stepBall } from "./Physics";
import { Scoring } from "./Scoring";
import { SeeSaw } from "./SeeSaw";
import { BALL_RADIUS, createBallWeightLabel, drawBall } from "./sprites";
import { BALL_COLOURS, type Ball, type BallKind, type BallWeight } from "./types";
import { AudioManager } from "../audio/AudioManager";
import { HUD } from "../ui/HUD";

const CANVAS_W = 640;
const CANVAS_H = 480;
const BOARD_ORIGIN_X = 150;
const BOARD_ORIGIN_Y = 56;
const CELL = 32;
const BOARD_W = BOARD_COLS * CELL;
const BOARD_H = BOARD_ROWS * CELL;

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
  private readonly backgroundSprite = new Sprite();
  private readonly craneGraphic = new Graphics();
  private readonly seeSawGraphic = new Graphics();

  /** Balls currently in flight (not held, not settled). */
  private readonly airborne: Ball[] = [];
  /** Every ball we ever created, mapped id → visual container. */
  private readonly visuals = new Map<number, Container>();
  private nextBallId = 1;

  private readonly keys = new Set<string>();
  private moveCooldown = 0;
  private paused = false;
  private gameOver = false;
  private rng = Math.random;

  constructor(app: Application) {
    this.app = app;
    this.crane = new Crane(
      BOARD_ORIGIN_X + BOARD_W / 2,
      BOARD_ORIGIN_Y - 18,
      BOARD_ORIGIN_X + CELL / 2,
      BOARD_ORIGIN_X + BOARD_W - CELL / 2,
    );
    this.seeSaw = new SeeSaw(
      BOARD_ORIGIN_X + BOARD_W / 2,
      BOARD_ORIGIN_Y + BOARD_H + 22,
      BOARD_W / 2 - 24,
    );
  }

  async init(): Promise<void> {
    // Background — first extracted SWG that looks game-y. Falls back to a
    // solid colour if loading fails (e.g. when assets were not extracted).
    try {
      const tex = await Assets.load<Texture>("assets/backgrounds/grf_hinterh.png");
      this.backgroundSprite.texture = tex;
      this.backgroundSprite.width = CANVAS_W;
      this.backgroundSprite.height = CANVAS_H;
    } catch {
      const g = new Graphics().rect(0, 0, CANVAS_W, CANVAS_H).fill({ color: 0x0c0e1a });
      this.worldLayer.addChild(g);
    }
    this.worldLayer.addChild(this.backgroundSprite);

    // Board frame
    const frame = new Graphics()
      .roundRect(BOARD_ORIGIN_X - 6, BOARD_ORIGIN_Y - 6, BOARD_W + 12, BOARD_H + 12, 8)
      .fill({ color: 0x000014, alpha: 0.6 })
      .stroke({ color: 0x3a4aa0, width: 3 });
    this.worldLayer.addChild(frame);

    // grid guides
    const grid = new Graphics();
    for (let c = 0; c <= BOARD_COLS; c++) {
      grid
        .moveTo(BOARD_ORIGIN_X + c * CELL, BOARD_ORIGIN_Y)
        .lineTo(BOARD_ORIGIN_X + c * CELL, BOARD_ORIGIN_Y + BOARD_H)
        .stroke({ color: 0x25305a, width: 1, alpha: 0.4 });
    }
    for (let r = 0; r <= BOARD_ROWS; r++) {
      grid
        .moveTo(BOARD_ORIGIN_X, BOARD_ORIGIN_Y + r * CELL)
        .lineTo(BOARD_ORIGIN_X + BOARD_W, BOARD_ORIGIN_Y + r * CELL)
        .stroke({ color: 0x25305a, width: 1, alpha: 0.4 });
    }
    this.worldLayer.addChild(grid);
    this.worldLayer.addChild(this.boardLayer);
    this.worldLayer.addChild(this.seeSawGraphic);
    this.worldLayer.addChild(this.craneGraphic);
    this.worldLayer.addChild(this.ballsLayer);
    this.worldLayer.addChild(this.fxLayer);

    this.app.stage.addChild(this.worldLayer);

    // HUD panel to the left of the board
    this.hud.root.position.set(16, BOARD_ORIGIN_Y);
    this.app.stage.addChild(this.hud.root);

    await this.audio.init();
    this.audio.play("start");

    // Spawn first ball
    this.spawnNextBall();

    // Key handlers
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);

    this.app.ticker.add((ticker) => this.tick(ticker.deltaMS / 1000));
  }

  destroy(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }

  // --------------------------------------------------------------------- tick
  private tick(dt: number): void {
    if (this.paused || this.gameOver) return;
    this.scoring.tick(dt);

    // crane input
    this.moveCooldown -= dt;
    if (this.moveCooldown <= 0) {
      if (this.keys.has("ArrowLeft")) {
        this.crane.moveBy(-CELL / 2);
        this.moveCooldown = 0.09;
      } else if (this.keys.has("ArrowRight")) {
        this.crane.moveBy(CELL / 2);
        this.moveCooldown = 0.09;
      }
    }

    // airborne balls
    const leftWall = BOARD_ORIGIN_X + BALL_RADIUS;
    const rightWall = BOARD_ORIGIN_X + BOARD_W - BALL_RADIUS;
    for (let i = this.airborne.length - 1; i >= 0; i--) {
      const ball = this.airborne[i];
      stepBall(ball, dt, leftWall, rightWall);

      // Heart wrap-around → bomb
      if (
        ball.kind.kind === "extra" &&
        ball.kind.extra === "heart" &&
        heartWrappedOut(ball.x, leftWall - 20, rightWall + 20)
      ) {
        ball.kind = { kind: "extra", extra: "bomb" } as BallKind;
        ball.x = ball.x < leftWall ? rightWall : leftWall;
        ball.vx = -ball.vx * 0.3;
        this.refreshVisual(ball);
      }

      // Reached see-saw height?
      const seeSawY = this.seeSaw.state.pivotY - 8;
      if (ball.vy > 0 && ball.y >= seeSawY) {
        this.handleSeeSawLanding(ball);
        this.airborne.splice(i, 1);
        continue;
      }
    }

    // Settle / match detection (all cleared in discrete ticks so physics
    // and logic don't fight each other)
    let dirty = false;
    // anything that was launched *back onto* the grid is handled by
    // handleSeeSawLaunch; here we also catch balls that should settle when
    // they enter an empty column.
    for (let i = this.airborne.length - 1; i >= 0; i--) {
      const ball = this.airborne[i];
      const col = this.colAt(ball.x);
      if (col < 0 || col >= BOARD_COLS) continue;
      // If below the board top and there's a cell under it, stop.
      const cellTop = BOARD_ORIGIN_Y + this.board.dropRowFor(col) * CELL + BALL_RADIUS;
      if (ball.vy > 0 && ball.y >= cellTop && this.board.dropRowFor(col) >= 0) {
        const row = this.board.dropRowFor(col);
        if (row >= 0) {
          ball.x = BOARD_ORIGIN_X + col * CELL + CELL / 2;
          ball.y = BOARD_ORIGIN_Y + row * CELL + CELL / 2;
          ball.vx = 0;
          ball.vy = 0;
          this.board.set(col, row, ball);
          this.airborne.splice(i, 1);
          this.audio.play("klack");
          dirty = true;
        }
      }
    }

    if (dirty) {
      this.resolveMatches();
    }

    if (this.board.isGameOver()) {
      this.onGameOver();
    }

    // redraw dynamic visuals
    this.drawCrane();
    this.drawSeeSaw();
    this.syncVisuals();
    this.hud.update(this.scoring);
  }

  // ----------------------------------------------------------------- helpers
  private colAt(x: number): number {
    return Math.floor((x - BOARD_ORIGIN_X) / CELL);
  }

  private handleSeeSawLanding(ball: Ball): void {
    const side = ball.x < this.seeSaw.state.pivotX ? "left" : "right";
    const { launched, vector } = this.seeSaw.place(ball, side);
    // The ball that *arrived* sits on the pan; the previously-resting
    // opposite ball gets launched back into the air.
    ball.vx = 0;
    ball.vy = 0;
    const pan = side === "left" ? this.seeSaw.leftPan() : this.seeSaw.rightPan();
    ball.x = pan.x;
    ball.y = pan.y - BALL_RADIUS;

    if (launched) {
      launched.vx = vector.vx;
      launched.vy = vector.vy;
      this.airborne.push(launched);
      this.audio.play("wupp");
    }
    // After a brief settle, drop the newly-placed ball back into the
    // nearest column so the player sees gravity work. We achieve that by
    // giving it a small downward velocity next frame; the settle handler
    // then takes over.
    setTimeout(() => {
      ball.vy = 10;
      this.airborne.push(ball);
    }, 120);
  }

  private spawnNextBall(): void {
    const kind = this.randomBallKind();
    const ball: Ball = {
      id: this.nextBallId++,
      kind,
      x: this.crane.x,
      y: this.crane.y,
      vx: 0,
      vy: 0,
      cell: null,
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
    const extra = rollExtra(this.rng);
    if (extra) return { kind: "extra", extra };
    const colour = BALL_COLOURS[Math.floor(this.rng() * BALL_COLOURS.length)];
    const weight = (1 + Math.floor(this.rng() * 9)) as BallWeight;
    return { kind: "regular", colour, weight };
  }

  private drawCrane(): void {
    const g = this.craneGraphic;
    g.clear();
    // rail
    g.moveTo(BOARD_ORIGIN_X, this.crane.y - 18)
      .lineTo(BOARD_ORIGIN_X + BOARD_W, this.crane.y - 18)
      .stroke({ color: 0x6080c0, width: 3 });
    // carriage
    g.rect(this.crane.x - 18, this.crane.y - 24, 36, 10).fill({ color: 0x8a9ad8 });
    g.rect(this.crane.x - 2, this.crane.y - 14, 4, 16).fill({ color: 0x6080c0 });
  }

  private drawSeeSaw(): void {
    const g = this.seeSawGraphic;
    g.clear();
    const { pivotX, pivotY, halfLen, angle } = this.seeSaw.state;
    // pivot post
    g.rect(pivotX - 4, pivotY, 8, 40).fill({ color: 0x3a4466 });
    g.circle(pivotX, pivotY, 5).fill({ color: 0x7a88aa });
    // beam
    const lx = pivotX - Math.cos(angle) * halfLen;
    const ly = pivotY + Math.sin(angle) * halfLen;
    const rx = pivotX + Math.cos(angle) * halfLen;
    const ry = pivotY - Math.sin(angle) * halfLen;
    g.moveTo(lx, ly)
      .lineTo(rx, ry)
      .stroke({ color: 0xc0c8e0, width: 6, cap: "round" });
  }

  private syncVisuals(): void {
    const held = this.crane.held;
    if (held) {
      const cont = this.visuals.get(held.id);
      if (cont) cont.position.set(held.x, held.y);
    }
    // airborne
    for (const b of this.airborne) {
      const cont = this.visuals.get(b.id);
      if (cont) cont.position.set(b.x, b.y);
    }
    // settled balls
    for (let r = 0; r < this.board.rows; r++) {
      for (let c = 0; c < this.board.cols; c++) {
        const b = this.board.get(c, r);
        if (!b) continue;
        const cont = this.visuals.get(b.id);
        if (cont) cont.position.set(b.x, b.y);
      }
    }
    // see-saw pan balls
    const pans: ("left" | "right")[] = ["left", "right"];
    for (const side of pans) {
      const ball = side === "left" ? this.seeSaw.left : this.seeSaw.right;
      if (!ball) continue;
      const pos = side === "left" ? this.seeSaw.leftPan() : this.seeSaw.rightPan();
      ball.x = pos.x;
      ball.y = pos.y - BALL_RADIUS;
      const cont = this.visuals.get(ball.id);
      if (cont) cont.position.set(ball.x, ball.y);
    }
  }

  private resolveMatches(): void {
    // Star extras: three in a row clears the board
    if (this.board.hasStarTriple()) {
      this.audio.play("star");
      const remaining = this.board.countWhere(() => true);
      this.scoring.registerStarClear(remaining);
      for (let r = 0; r < this.board.rows; r++) {
        for (let c = 0; c < this.board.cols; c++) {
          const b = this.board.get(c, r);
          if (!b) continue;
          this.board.clearCell(c, r);
          const cont = this.visuals.get(b.id);
          if (cont) cont.destroy({ children: true });
          this.visuals.delete(b.id);
        }
      }
      return;
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
      this.applyGravity();
    }

    // after clearing, spawn a new ball if the crane is empty
    if (!this.crane.held && !this.gameOver) {
      this.spawnNextBall();
    }
  }

  /** After a match, remaining balls above empty spots fall down. */
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
    if (this.gameOver) return;
    this.gameOver = true;
    this.audio.play("grExplo");
    const overlay = new Graphics()
      .rect(0, 0, CANVAS_W, CANVAS_H)
      .fill({ color: 0x000014, alpha: 0.75 });
    const label = new Text({
      text: `GAME OVER\n\nScore: ${this.scoring.score.toLocaleString()}\n\nreload to play again`,
      style: {
        fontFamily: "monospace",
        fontSize: 28,
        fill: 0xffffff,
        align: "center",
      },
    });
    label.anchor.set(0.5);
    label.position.set(CANVAS_W / 2, CANVAS_H / 2);
    this.app.stage.addChild(overlay);
    this.app.stage.addChild(label);
  }

  // ------------------------------------------------------------ input
  private onKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.key);
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      this.dropHeldBall();
    } else if (e.key === "p" || e.key === "P") {
      this.paused = !this.paused;
    } else if (e.key === "m" || e.key === "M") {
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
    ball.vy = 30;
    this.airborne.push(ball);
    this.spawnNextBall();
  }
}
