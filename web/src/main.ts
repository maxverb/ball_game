// Entry point: boot Pixi, mount it into #app, hand off to Game.

import { Application } from "pixi.js";
import { Game } from "./game/Game";

const CANVAS_W = 640;
const CANVAS_H = 480;

async function boot(): Promise<void> {
  const app = new Application();
  await app.init({
    width: CANVAS_W,
    height: CANVAS_H,
    background: 0x0c0c14,
    antialias: false,
    autoDensity: true,
    resolution: Math.min(2, window.devicePixelRatio || 1),
  });
  const mount = document.getElementById("app")!;
  mount.appendChild(app.canvas);

  // Scale to viewport while preserving pixel ratio.
  const resize = (): void => {
    const { innerWidth: w, innerHeight: h } = window;
    const scale = Math.max(1, Math.min(w / CANVAS_W, h / CANVAS_H));
    app.canvas.style.width = `${CANVAS_W * scale}px`;
    app.canvas.style.height = `${CANVAS_H * scale}px`;
  };
  window.addEventListener("resize", resize);
  resize();

  const game = new Game(app);
  await game.init();
}

boot().catch((err) => {
  console.error(err);
  document.body.innerHTML = `<pre style="color:#ff7070;padding:20px">Boot error:\n\n${String(
    err?.stack ?? err,
  )}</pre>`;
});
