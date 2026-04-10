# SWING — web remake

A browser reimplementation of the 1997 Software 2000 DOS game **SWING**.
See [`../docs/ASSETS.md`](../docs/ASSETS.md) for the asset inventory and
reverse-engineering notes.

## Getting started

```bash
# 1. extract the original assets in one go (safe to re-run)
cd .. && node tools/extract-all.mjs

# 2. install & run the web game
cd web
npm install
npm run dev       # http://localhost:5173 — hot reload
npm test          # 17 unit tests for Board, Scoring, SeeSaw
npm run build     # production bundle under ./dist/
```

The production build also ships automatically to
`https://maxverb.github.io/ball_game/` via the
[`Deploy SWING web`](../.github/workflows/deploy.yml) workflow.

## Controls

| Key | Action |
|---|---|
| ← → | move crane |
| ↓ / Enter / Space | drop ball |
| P | pause |
| M | mute |
| S | cycle sphere set (real SWING skins) |

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
- ✅ Uses extracted sphere-set sprites (6 of 12 fully decoded)
- ✅ Main menu, sphere-set switcher (S key), level progression,
  particle effects, screen shake
- ⏳ Crane/see-saw sprites are procedural fallbacks until the
  `.RES` decoders are finished
- ⏳ Music pending — needs DOSBox re-recording to OGG
- ⏳ Help screen (HELPMODE.RES), joystick support
