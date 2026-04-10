// Tiny particle system used for match explosions, sparkles on level
// up, and dust on ball landings. Each particle is a short-lived
// `Graphics` primitive drawn directly — no sprite sheet needed.

import { Container, Graphics } from "pixi.js";

interface Particle {
  gfx: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: number;
  size: number;
  fade: boolean;
  gravity: number;
}

export class ParticleSystem {
  readonly root = new Container();
  private readonly pool: Particle[] = [];

  /** Burst N particles outwards from (x, y) with a given palette. */
  burst(
    x: number,
    y: number,
    count: number,
    {
      speed = 140,
      life = 0.55,
      colors = [0xffffff],
      size = 3,
      gravity = 260,
      fade = true,
    }: {
      speed?: number;
      life?: number;
      colors?: number[];
      size?: number;
      gravity?: number;
      fade?: boolean;
    } = {},
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = speed * (0.5 + Math.random() * 0.8);
      const color = colors[Math.floor(Math.random() * colors.length)];
      const gfx = new Graphics().circle(0, 0, size).fill({ color });
      gfx.position.set(x, y);
      this.root.addChild(gfx);
      this.pool.push({
        gfx,
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - spd * 0.3,
        life,
        maxLife: life,
        color,
        size,
        fade,
        gravity,
      });
    }
  }

  /** Upward confetti used for level-up and Dreier chains. */
  confetti(x: number, y: number, count: number, colors: number[]): void {
    for (let i = 0; i < count; i++) {
      const vx = (Math.random() - 0.5) * 240;
      const vy = -(180 + Math.random() * 180);
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = 2 + Math.random() * 3;
      const gfx = new Graphics().rect(-size, -size, size * 2, size * 2).fill({ color });
      gfx.position.set(x, y);
      this.root.addChild(gfx);
      this.pool.push({
        gfx,
        x,
        y,
        vx,
        vy,
        life: 1.2,
        maxLife: 1.2,
        color,
        size,
        fade: true,
        gravity: 520,
      });
    }
  }

  update(dt: number): void {
    for (let i = this.pool.length - 1; i >= 0; i--) {
      const p = this.pool[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.root.removeChild(p.gfx);
        p.gfx.destroy();
        this.pool.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.gfx.position.set(p.x, p.y);
      if (p.fade) p.gfx.alpha = Math.max(0, p.life / p.maxLife);
    }
  }
}
