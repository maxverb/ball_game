# SWING — web remake

A browser reimplementation of the 1997 Software 2000 DOS game **SWING**.
See [`../docs/ASSETS.md`](../docs/ASSETS.md) for the asset inventory and
reverse-engineering notes.

## Getting started

```bash
# 1. extract the original assets (one-time, safe to re-run)
cd ..
node tools/extract-wav.mjs
node tools/extract-swg.mjs
node tools/extract-set.mjs
node tools/extract-res.mjs

# 2. install & run the web game
cd web
npm install
npm run dev     # http://localhost:5173
```

## Controls

| Key | Action |
|---|---|
| ← → | move crane |
| ↓ / Enter / Space | drop ball |
| P | pause |
| M | mute |

## Tech stack

- **Vite + TypeScript** — dev server / bundler
- **PixiJS v8** — 2D rendering
- **Web Audio API** — plays the original `.wav` sound effects directly
- **Vitest** — unit tests for pure logic modules (`Board`, `Scoring`, `SeeSaw`)
- Custom deterministic physics for gravity + see-saw launches (no Matter.js —
  keeping launch feel closer to the original's explicit weight-difference
  formula)

## Status

- ✅ Playable: crane movement, ball dropping, match-3 detection, scoring
  with multiplier lamps, see-saw launch, game over
- ✅ Uses extracted `.wav` sound effects
- ✅ Uses extracted `.swg` background for the in-game view
- ⏳ Ball/crane/see-saw sprites are procedural fallbacks until the
  `.SET`/`.RES` decoders are finished
- ⏳ Music pending — needs DOSBox re-recording to OGG
- ⏳ Main menu, sphere-set switcher, help screen, level progression
