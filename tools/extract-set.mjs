#!/usr/bin/env node
// Analyzer + best-effort extractor for KUGELN/*.SET sphere-skin files.
//
// Header layout we've confirmed across NORMAL / GEOMET / PLASTIC / KUGEL6:
//   0x00..0x13  magic "Gib mir 'ne Kugel\n\0\x1A"     (20 bytes)
//   0x14..0x23  set name, null-padded ASCII           (16 bytes)
//                 e.g. "standard", "Geometrik", "plastic", "Atome"
//   0x24..0x27  u32  timestamp / hash
//   0x28..0x2B  u32  zero
//   0x2C..0x2F  u32  data length
//   0x30..0x31  u16  0x0014 (20, probably header-size marker)
//   0x32..0x33  u16  flags  (0x0F01 or 0x0F04)
//   0x34..0x35  u16  frame width   = 0x001E (30)
//   0x36..0x37  u16  frame height  = 0x001E (30)
//   0x38..0x3B  u32  something per-frame (812 or 784)
//   0x3C..0x3F  u32  always 3    (group count? colour count?)
//   0x40..0x43  u32  zero
//   0x44..      start of per-scanline RLE-ish payload
//
// The payload uses a "(skip_left u16, draw_count u16, pixels[count])"
// per-scanline format, but frame delimiters are still being worked out.
// For now this tool:
//   1. validates the header,
//   2. writes `docs/set-header-dump.txt` with everything we learned,
//   3. emits a best-effort sprite-sheet PNG per set — if the payload
//      decoder desyncs we still produce a partial sheet for inspection.

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { encodePng, rgb565ToRgba } from "./png.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, "..", "SWING", "KUGELN");
const SPRITE_DST = join(here, "..", "web", "public", "assets", "sprites", "kugeln");
const DOC = join(here, "..", "docs", "set-header-dump.txt");

mkdirSync(SPRITE_DST, { recursive: true });
mkdirSync(dirname(DOC), { recursive: true });

const MAGIC = Buffer.from("Gib mir 'ne Kugel\n\0\x1A", "binary");

const lines = [];
function log(s) {
  lines.push(s);
  console.log(s);
}

function readCString(buf, off, max) {
  let end = off;
  while (end < off + max && buf[end] !== 0) end++;
  return buf.slice(off, end).toString("ascii");
}

function parse(setPath) {
  const buf = readFileSync(setPath);
  const name = basename(setPath);

  if (buf.slice(0, MAGIC.length).compare(MAGIC) !== 0) {
    log(`${name}: BAD MAGIC`);
    return null;
  }

  const setName = readCString(buf, 0x14, 16);
  const header = {
    name: setName,
    hash: buf.readUInt32LE(0x24).toString(16),
    dataLen: buf.readUInt32LE(0x2c),
    headerMarker: buf.readUInt16LE(0x30),
    flags: buf.readUInt16LE(0x32).toString(16),
    frameW: buf.readUInt16LE(0x34),
    frameH: buf.readUInt16LE(0x36),
    perFrame: buf.readUInt32LE(0x38),
    groupCount: buf.readUInt32LE(0x3c),
    fileSize: buf.length,
    payloadStart: 0x44,
  };
  log(
    `${name.padEnd(13)} "${setName.padEnd(11)}" ` +
      `${header.frameW}x${header.frameH} ` +
      `flags=0x${header.flags} perFrame=${header.perFrame} ` +
      `groups=${header.groupCount} data=${header.dataLen} total=${header.fileSize}`,
  );
  return { buf, header };
}

// Best-effort payload walker. It treats every scanline as
//   u16 x_skip, u16 draw_count, pixels[draw_count * 2 bytes each].
// If the stream desyncs (which it might for frame separators we don't
// understand yet) we stop and emit whatever we decoded so the user can
// visually eyeball the result.
function decodePayload(buf, header, maxFrames = 96) {
  const { frameW, frameH, payloadStart } = header;
  const frames = [];
  let p = payloadStart;
  const limit = buf.length - 4;

  for (let f = 0; f < maxFrames && p < limit; f++) {
    const frame = new Uint8Array(frameW * frameH * 2); // filled 0 = transparent
    let y = 0;
    let decodedAny = false;
    while (y < frameH && p + 4 <= buf.length) {
      const x = buf.readUInt16LE(p);
      const w = buf.readUInt16LE(p + 2);
      p += 4;
      if (w === 0) {
        // empty scanline -> advance y only
        y++;
        continue;
      }
      if (x + w > frameW || p + w * 2 > buf.length) {
        // desync: back off by 4 and break out of this frame
        p -= 4;
        break;
      }
      for (let i = 0; i < w; i++) {
        const off = (y * frameW + x + i) * 2;
        frame[off] = buf[p + i * 2];
        frame[off + 1] = buf[p + i * 2 + 1];
      }
      p += w * 2;
      decodedAny = true;
      y++;
    }
    if (!decodedAny) break;
    frames.push(frame);
    // skip any padding bytes until we see a plausible new strip header
    // (payloads of adjacent frames appear contiguous in our samples).
  }
  return frames;
}

function writeSheet(frames, header, pngPath) {
  if (frames.length === 0) return;
  const cols = Math.min(12, frames.length);
  const rows = Math.ceil(frames.length / cols);
  const w = cols * header.frameW;
  const h = rows * header.frameH;
  const rgba = new Uint8Array(w * h * 4);
  // init transparent
  rgba.fill(0);
  for (let i = 0; i < frames.length; i++) {
    const cx = (i % cols) * header.frameW;
    const cy = Math.floor(i / cols) * header.frameH;
    const frameRgba = rgb565ToRgba(frames[i], header.frameW, header.frameH, {
      transparentColor: 0,
    });
    for (let y = 0; y < header.frameH; y++) {
      for (let x = 0; x < header.frameW; x++) {
        const s = (y * header.frameW + x) * 4;
        const d = ((cy + y) * w + cx + x) * 4;
        rgba[d + 0] = frameRgba[s + 0];
        rgba[d + 1] = frameRgba[s + 1];
        rgba[d + 2] = frameRgba[s + 2];
        rgba[d + 3] = frameRgba[s + 3];
      }
    }
  }
  writeFileSync(pngPath, encodePng(w, h, rgba));
}

log("SWING sphere set (.SET) header analysis");
log("---------------------------------------");

const setFiles = readdirSync(SRC)
  .filter((f) => f.toUpperCase().endsWith(".SET"))
  .sort();

for (const f of setFiles) {
  const parsed = parse(join(SRC, f));
  if (!parsed) continue;
  const frames = decodePayload(parsed.buf, parsed.header);
  const pngPath = join(SPRITE_DST, f.toLowerCase().replace(".set", ".png"));
  writeSheet(frames, parsed.header, pngPath);
  log(`    -> decoded ${frames.length} candidate frames -> ${basename(pngPath)}`);
}

writeFileSync(DOC, lines.join("\n") + "\n");
log(`\nWrote header analysis to ${DOC}`);
