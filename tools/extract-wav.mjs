#!/usr/bin/env node
// Copies the original SND/*.WAV files into web/public/assets/sfx/.
// They are already standard RIFF WAV so no decoding is required.

import { readdirSync, copyFileSync, mkdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, "..", "SWING", "SND");
const DST = join(here, "..", "web", "public", "assets", "sfx");

mkdirSync(DST, { recursive: true });

const files = readdirSync(SRC).filter((f) => f.toUpperCase().endsWith(".WAV"));
let total = 0;
for (const f of files) {
  const from = join(SRC, f);
  const to = join(DST, f.toLowerCase());
  copyFileSync(from, to);
  total += statSync(to).size;
  console.log(`  ${f.toLowerCase()}  (${statSync(to).size} bytes)`);
}
console.log(`\nCopied ${files.length} WAV files, ${(total / 1024).toFixed(1)} KB total.`);
