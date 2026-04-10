#!/usr/bin/env node
// Scan a .SET sphere-set file and annotate what's at each offset,
// trying to match the scanline-header-pair hypothesis:
//
//   per row pair: (leftSkip, count_a) (leftSkip, count_b) pixels[count_a + count_b + something]
//
// and several alternatives. Prints a table with pixel counts between
// "03 00 XX 00"-looking headers so we can eyeball the real structure.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const file = process.argv[2] || join(here, "..", "SWING", "KUGELN", "NORMAL.SET");
const buf = readFileSync(file);
console.log(file, "-", buf.length, "bytes");

// Header region
const frameW = buf.readUInt16LE(0x34);
const frameH = buf.readUInt16LE(0x36);
const perFrame = buf.readUInt32LE(0x38);
const groups = buf.readUInt32LE(0x3c);
const dataLen = buf.readUInt32LE(0x2c);
console.log(`frame ${frameW}x${frameH}  perFrame=${perFrame}  groups=${groups}  dataLen=${dataLen}`);

// Walk 0x44 onwards, treating every 4-byte word as a potential header
// (leftSkip u16, count u16). Record runs of "valid" headers (skip+count<=frameW).
// Between headers, print how many "pixel" bytes there are.

let p = 0x44;
const limit = Math.min(buf.length - 4, 0x44 + 2000); // first ~2000 bytes

console.log("\noff    leftSkip count  distToNext(bytes/px)  inferred");
let lastHeaderOff = null;
let prevHeader = null;
let headerCount = 0;
while (p < limit) {
  const a = buf.readUInt16LE(p);
  const b = buf.readUInt16LE(p + 2);
  const isPossibleHeader = a < frameW && b <= frameW && a + b <= frameW && b > 0;
  if (isPossibleHeader) {
    headerCount++;
    if (lastHeaderOff != null) {
      const gap = p - (lastHeaderOff + 4);
      const pxGap = gap / 2;
      console.log(
        `0x${lastHeaderOff.toString(16).padStart(5, "0")}  ${prevHeader[0]
          .toString()
          .padStart(3)}  ${prevHeader[1]
          .toString()
          .padStart(3)}      ${gap
          .toString()
          .padStart(4)}/${pxGap.toString().padStart(3)}px`,
      );
    }
    lastHeaderOff = p;
    prevHeader = [a, b];
    p += 4;
  } else {
    p += 2;
  }
  if (headerCount > 30) break;
}
console.log(`scanned first ${headerCount} header-like pairs`);
