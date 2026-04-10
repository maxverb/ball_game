#!/usr/bin/env node
// Scratchpad: try to render WIPPE.RES as a raw RGB565 sprite strip.
// Writes several candidate PNGs at different offsets so we can eyeball
// which one corresponds to the real see-saw beam.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { encodePng, rgb565ToRgba } from "./png.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, "..", "SWING", "GRF", "WIPPE.RES");
const OUT = join(here, "..", "docs", "wippe-candidates");
mkdirSync(OUT, { recursive: true });

const buf = readFileSync(SRC);
const W = 56;
const H = 6;
const FRAMES = 3;
const FRAME_BYTES = W * H * 2; // 672

console.log("WIPPE.RES", buf.length, "bytes");
console.log("w x h =", W, "x", H, "per-frame bytes =", FRAME_BYTES);

// Try several plausible start offsets.
const offsets = [0x10, 0x14, 0x18, 0x1c, 0x20];
for (const off of offsets) {
  if (off + FRAMES * FRAME_BYTES > buf.length) continue;
  // stack 3 frames horizontally into a 168 x 6 sheet
  const sheet = new Uint8Array(W * FRAMES * H * 2);
  for (let f = 0; f < FRAMES; f++) {
    const frameSrc = buf.slice(off + f * FRAME_BYTES, off + (f + 1) * FRAME_BYTES);
    for (let y = 0; y < H; y++) {
      const srcRow = frameSrc.slice(y * W * 2, (y + 1) * W * 2);
      const dstOff = (y * W * FRAMES + f * W) * 2;
      srcRow.copy(Buffer.from(sheet.buffer), dstOff);
    }
  }
  const rgba = rgb565ToRgba(sheet, W * FRAMES, H, { transparentColor: 0 });
  const png = encodePng(W * FRAMES, H, rgba);
  const name = `off_0x${off.toString(16)}.png`;
  writeFileSync(join(OUT, name), png);
  console.log("  ->", name);
}

// And a second variant: treat the file as a transposed/row-major dump of
// 3 frames packed sequentially as flat pixel arrays with no header at all.
{
  const flat = buf.slice(0x10, 0x10 + FRAMES * FRAME_BYTES);
  const rgba = rgb565ToRgba(flat, W, H * FRAMES, { transparentColor: 0 });
  const png = encodePng(W, H * FRAMES, rgba);
  writeFileSync(join(OUT, "stacked_0x10.png"), png);
  console.log("  -> stacked_0x10.png (frames stacked vertically)");
}
