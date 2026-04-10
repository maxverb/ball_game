# SWING — analysis + web remake

This repository contains the original DOS install of **SWING** (© 1997
Software 2000) and an ongoing effort to rebuild it as a browser game.

```
ball_game/
├── SWING/          ← original DOS files (read-only; don't modify)
├── tools/          ← Node scripts that extract assets out of SWING/
├── docs/           ← reverse-engineering notes (start with ASSETS.md)
└── web/            ← the Vite + TypeScript + PixiJS web remake
```

## Quick start

```bash
# 1. extract the original assets into web/public/assets/
node tools/extract-wav.mjs
node tools/extract-swg.mjs
node tools/extract-set.mjs
node tools/extract-res.mjs

# 2. install and run the web game
cd web
npm install
npm run dev      # http://localhost:5173
npm test         # run the unit tests
```

## What's been figured out

See [`docs/ASSETS.md`](docs/ASSETS.md) for the full inventory of every file
inside `SWING/`, what each one does, and how much of its format has been
reverse-engineered.

Summary of the state today:

- ✅ All 29 `.WAV` sound effects are standard RIFF WAV and are used directly
- ✅ All 26 `.SWG` backgrounds are raw 640×480 RGB565 and are decoded to PNG
- 🟡 12 `.SET` sphere-skin files — headers decoded, frame payload WIP
- 🟡 62 `.RES` resource files — headers decoded, per-subtype payload WIP
- ❌ 28 `.DMT` music tracks — custom tracker format, plan is DOSBox re-record
- ❌ `.MOV` videos — empty stubs in this install (`NOVIDEO` mode)

## What the web game supports today

- **Main menu** with high score, help, and a blinking "press SPACE" prompt
- **Crane** movement with cursor keys + ball dropping with ↓ / Enter / Space
- **Match-3** detection (horizontal, vertical, both diagonals)
- **See-saw launch** driven by the weight difference between the two pans
  (the signature SWING mechanic from `README.TXT`)
- **Scoring** with 2×/3×/4× "Bonus" multiplier lamps
- **Heart** → bomb wrap-around + **silver-star** triple → board clear
- **Level progression** every 8 cleared matches, with a "level up" chime
- **Next-ball preview** in the HUD
- **High score** persisted in `localStorage`
- **Pause** (P) and **mute** (M) with on-screen overlay
- **Game over** screen with restart prompt
- Original `.wav` sound effects via the Web Audio API
- `HINTERH.SWG` background behind the playfield
- Procedural ball/crane/see-saw sprites (will be swapped for extracted
  art once the `.SET`/`.RES` decoders are complete)

## Why a reimplementation and not a port?

The repo contains only the compiled Watcom/DOS4GW executable
(`SWING/SWING.EXE`) — no source code. So instead of porting we're rewriting
the game in modern TypeScript against the design documented in
`SWING/README.TXT`, with the original assets re-used wherever we can decode
their format.

Playing the original in DOSBox remains the authoritative reference for
mechanics, timings and visual layout.
