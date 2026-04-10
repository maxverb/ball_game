#!/usr/bin/env node
// One-shot runner for every extractor. Used both locally and by the
// GitHub Actions deploy workflow to prepare `web/public/assets/` from
// the original `SWING/` install before Vite builds the web app.

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const steps = [
  { name: "WAV sound effects", file: "extract-wav.mjs" },
  { name: "SWG backgrounds", file: "extract-swg.mjs" },
  { name: "SET sphere sets", file: "extract-set.mjs" },
  { name: "RES inventory (docs only)", file: "extract-res.mjs" },
];

let failed = 0;
for (const step of steps) {
  console.log(`\n=== ${step.name} (${step.file}) ===`);
  const res = spawnSync(process.execPath, [join(here, step.file)], {
    stdio: "inherit",
  });
  if (res.status !== 0) {
    console.error(`!! ${step.file} exited with code ${res.status}`);
    failed++;
  }
}

if (failed > 0) {
  console.error(`\n${failed} extractor(s) failed`);
  process.exit(1);
}
console.log("\nAll extractors finished successfully.");
