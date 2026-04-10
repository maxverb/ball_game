#!/usr/bin/env node
// Decodes every .SWG file found in the original SWING install into a PNG.
//
// An .SWG is a raw 640x480 framebuffer dump at 16 bits per pixel.
// 640 * 480 * 2 = 614400 bytes (we sanity-check this on every file).
// The pixel format is RGB565 little-endian; we tested this visually against
// the original LOAD screens and it matches (RGB555 renders too blue/green).

import { readFileSync, writeFileSync, readdirSync, mkdirSync, statSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { encodePng, rgb565ToRgba } from "./png.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, "..", "SWING");
const DST = join(here, "..", "web", "public", "assets", "backgrounds");

const W = 640;
const H = 480;
const EXPECTED = W * H * 2;

mkdirSync(DST, { recursive: true });

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (name.toUpperCase().endsWith(".SWG")) out.push(p);
  }
  return out;
}

const files = walk(ROOT);
let ok = 0;
let skipped = 0;

for (const f of files) {
  const buf = readFileSync(f);
  if (buf.length !== EXPECTED) {
    console.warn(`  skip ${basename(f)}: size ${buf.length} != ${EXPECTED}`);
    skipped++;
    continue;
  }
  const rgba = rgb565ToRgba(buf, W, H);
  const png = encodePng(W, H, rgba);
  const rel = f.replace(ROOT + "/", "").replace(/\//g, "_");
  const name = rel.replace(/\.SWG$/i, ".png").toLowerCase();
  writeFileSync(join(DST, name), png);
  console.log(`  ${name}`);
  ok++;
}

console.log(`\nDecoded ${ok} .SWG backgrounds; skipped ${skipped}.`);
