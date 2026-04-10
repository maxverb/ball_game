#!/usr/bin/env node
// Exploratory / work-in-progress decoder for WIPPE.RES — the SWING
// see-saw beam animation sprite.
//
// What we know:
//
//   Header (16 bytes):
//     u16 0x0014 magic
//     u8  subtype 2
//     u8  0x0f
//     u16 width  = 56
//     u16 height = 6
//     u32 dataLen = 336 (= w*h, pixel count per frame)
//     u32 frames = 3
//   0x10..0x11  u16 0x0070 = 112 = bytesPerScanline (56 * 2)
//   0x12..0x13  u16 0x0006 = height repeat
//
//   0x14..      interleaved (marker run, pixel row) pairs.
//     First marker at 0x14 is 8 bytes of 0x0003 (four u16 "3"s).
//     Subsequent markers are 16 bytes of 0x0003 (eight u16 "3"s).
//     Pixel runs between markers are 96 bytes = 48 pixels = 4 fewer
//     than the declared 56px width (so every beam has an implicit 4-pixel
//     margin on each side). We have not worked out how the marker/row
//     format encodes the 3 logical frames, how many rows each frame has
//     (4? 6?), or why the file is 17 KB for what would nominally be
//     3 * 6 * 56 * 2 = 2 KB of raw pixel data — almost certainly the
//     file holds many sub-frames for a smooth tilt animation on top of
//     the 3 "main" frames declared in the header.
//
// Until we have the full layout the web game draws the beam
// procedurally (see game/Game.ts → drawSeeSaw). This script renders
// the first guess at 48×6 frames as a PNG for visual inspection.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { encodePng, rgb565ToRgba } from "./png.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, "..", "SWING", "GRF", "WIPPE.RES");
const DST = join(here, "..", "docs", "wippe-candidates");
mkdirSync(DST, { recursive: true });

const buf = readFileSync(SRC);
const DRAWN_W = 48; // 56 declared - 4 on each side
const FRAME_H = 6;

console.log(
  `WIPPE.RES  ${buf.length} bytes  w=${buf.readUInt16LE(4)} h=${buf.readUInt16LE(6)} frames=${buf.readUInt32LE(12)}`,
);

// Candidate A: each row = 8-byte marker + 96 bytes pixels, stacked.
// Render up to 8 frames of 6 rows each.
{
  const frameCount = 8;
  const sheetW = DRAWN_W;
  const sheetH = FRAME_H * frameCount;
  const raw = new Uint8Array(sheetW * sheetH * 2);
  let p = 0x14;
  let outRow = 0;
  for (let f = 0; f < frameCount && p < buf.length; f++) {
    for (let y = 0; y < FRAME_H && p < buf.length; y++) {
      // Skip leading 0x0003 runs
      while (p + 2 < buf.length && buf.readUInt16LE(p) === 0x0003) p += 2;
      // Copy 96 bytes of pixel data, if they fit
      if (p + 96 > buf.length) break;
      const rowOff = (outRow * DRAWN_W) * 2;
      for (let i = 0; i < 96; i++) raw[rowOff + i] = buf[p + i];
      p += 96;
      outRow++;
    }
  }
  const rgba = rgb565ToRgba(raw, sheetW, sheetH, { transparentColor: 0 });
  const png = encodePng(sheetW, sheetH, rgba);
  writeFileSync(join(DST, "marker-strip.png"), png);
  console.log(`  -> marker-strip.png  ${sheetW}x${sheetH}`);
}

// Candidate B: raw 56x6 RGB565 every ~600 bytes, starting at 0x1C.
// Dumps the first few candidate frames side by side.
{
  const w = 56, h = 6;
  const frameBytes = w * h * 2;
  const frameCount = 8;
  const sheetW = w * frameCount;
  const raw = new Uint8Array(sheetW * h * 2);
  for (let f = 0; f < frameCount; f++) {
    const srcOff = 0x1c + f * frameBytes;
    if (srcOff + frameBytes > buf.length) break;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const s = srcOff + (y * w + x) * 2;
        const d = (y * sheetW + (f * w + x)) * 2;
        raw[d] = buf[s];
        raw[d + 1] = buf[s + 1];
      }
    }
  }
  const rgba = rgb565ToRgba(raw, sheetW, h, { transparentColor: 0 });
  const png = encodePng(sheetW, h, rgba);
  writeFileSync(join(DST, "raw-56x6.png"), png);
  console.log(`  -> raw-56x6.png  ${sheetW}x${h}`);
}
