#!/usr/bin/env node
// Analyzer for GRF/*.RES resource files.
//
// Common header we've observed across WIPPE, BUTTON, BLOCK, BLATT, CD, FLASH,
// FLARE, FUNKEN, SKALA, KRANMSK and friends:
//
//   u16  0x0014         header-size marker
//   u8   subtype        1,2,3,4,7 (controls payload layout)
//   u8   0x0F           constant
//   u16  width
//   u16  height
//   u32  data length
//   u32  frame count (or 0 for single-frame resources)
//   ...payload (RLE scanlines similar to KUGELN/*.SET, but the frame
//      separator varies per subtype)
//
// FONTS.RES is a different container entirely (char table + glyph strips)
// and is handled separately.
//
// Full per-subtype decoding is a follow-up job — for now we produce a
// human-readable inventory at docs/res-header-dump.txt so we know exactly
// which file holds which sprite and how big each sprite is. The web game
// falls back to procedural sprites until all families are decoded.

import { readFileSync, writeFileSync, readdirSync, mkdirSync, statSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SRC_GRF = join(here, "..", "SWING", "GRF");
const SRC_DATEN = join(here, "..", "SWING", "DATEN", "GRAFIK");
const DOC = join(here, "..", "docs", "res-header-dump.txt");

mkdirSync(dirname(DOC), { recursive: true });

const SUBTYPE_NOTES = {
  1: "single-frame big sprite (KRANMSK, NORMAL?)",
  2: "multi-frame animation (WIPPE, BUTTON)",
  3: "meter / gauge (SKALA)",
  4: "small iconic sprite (BLATT, BLOCK, CD)",
  7: "particle / fx (FUNKEN, FLASH, FLARE)",
};

const out = [];
function log(s) {
  out.push(s);
}

log("SWING .RES resource inventory");
log("==============================");
log("");
log(
  "file".padEnd(16) +
    "size".padStart(10) +
    "  sub  " +
    "w".padStart(5) +
    " x " +
    "h".padStart(4) +
    "  dataLen   frames  notes",
);
log("-".repeat(80));

function inspect(path) {
  const buf = readFileSync(path);
  const name = basename(path);
  const magic = buf.readUInt16LE(0);
  if (magic !== 0x0014) {
    // FONTS.RES and some others
    log(
      name.padEnd(16) +
        buf.length.toString().padStart(10) +
        "   -   " +
        "      (non-standard header, magic=0x" +
        magic.toString(16).padStart(4, "0") +
        ")",
    );
    return;
  }
  const subtype = buf[2];
  const constByte = buf[3];
  const width = buf.readUInt16LE(4);
  const height = buf.readUInt16LE(6);
  const dataLen = buf.readUInt32LE(8);
  const frames = buf.readUInt32LE(12);
  const note = SUBTYPE_NOTES[subtype] || "?";
  log(
    name.padEnd(16) +
      buf.length.toString().padStart(10) +
      "   " +
      subtype.toString().padStart(2) +
      "   " +
      width.toString().padStart(4) +
      " x " +
      height.toString().padStart(4) +
      "  " +
      dataLen.toString().padStart(8) +
      "  " +
      frames.toString().padStart(5) +
      "  " +
      note +
      (constByte !== 0x0f ? `  [const=${constByte.toString(16)}]` : ""),
  );
}

function walk(dir) {
  const out = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isFile() && f.toUpperCase().endsWith(".RES")) out.push(p);
  }
  return out.sort();
}

const files = [...walk(SRC_GRF), ...walk(SRC_DATEN)];
for (const f of files) inspect(f);

log("");
log(`Inspected ${files.length} .RES files.`);
log("");
log("Subtype legend:");
for (const [k, v] of Object.entries(SUBTYPE_NOTES)) log(`  ${k}: ${v}`);

writeFileSync(DOC, out.join("\n") + "\n");
console.log(out.join("\n"));
console.log(`\nWrote inventory to ${DOC}`);
