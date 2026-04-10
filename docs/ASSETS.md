# SWING asset inventory

Reverse-engineering notes for the original SWING (1997 © Software 2000) DOS
installation that ships under `SWING/`. See `tools/README.md` for how to run
the extractors.

## Summary

| Category | Count | Size | Status |
|---|---|---|---|
| Sound effects (`SND/*.WAV`) | 29 | 2.0 MB | **Fully extracted** — standard RIFF WAV, ready to use |
| Backgrounds (`*.SWG`) | 26 | ~16 MB raw → 5 MB PNG | **Fully extracted** — 640×480 RGB565 → RGBA PNG |
| Music (`DMTS/NEU*.DMT`) | 28 | 4 MB | Pending — custom tracker format, plan is DOSBox re-record → OGG |
| Sphere sets (`KUGELN/*.SET`) | 12 | 1.2 MB | Headers decoded; per-frame RLE payload WIP |
| Resources (`GRF/*.RES`) | 62 | ~25 MB | Headers decoded (60/62); per-subtype payload decoders WIP |
| Video (`DATEN/MOVIES/*.MOV`) | 8 | ~0 bytes | N/A — empty stubs; game runs with `NOVIDEO` |

## Gameplay reference (from `README.TXT`)

- **Goal:** three spheres of the same colour next to each other on the board →
  they disappear ("Dreier"). Score = sum of their weights × chain multiplier.
- **Board:** grid; balls drop from a crane at the top.
- **Ball weights:** every ball shows a weight number. Balls land on a **see-saw
  (Wippe)**; the weight difference between the two sides determines how far
  the next ball launches sideways before falling into the grid.
- **Input:** cursor keys move crane left/right, ↓/ENTER drops a ball.
- **Extras:**
  - **Heart** — when thrown past the edge of the board it wraps around as a
    **bomb**.
  - **Bonus lights** — after a Dreier, bonus lamps (2×/3×/4×) light up for a
    short time; another Dreier multiplies the score.
  - **Star** — three silver stars in a row clear the entire board.
- **Sphere skins (F7):** 11 visual sets are shipped in `KUGELN/*.SET`:
  `standard`, `Geometrik`, `plastic`, `people`, `S2000 Team`, `Juwelen`,
  `Atome`, `Glas`, `Formen`, `Kontrast`, `Splitt`.
- **Resolution:** 640×480 at 16bpp (65 536 colours).

## Sound effects (`SND/`)

Every file is standard RIFF WAV. Inferred roles from the German filenames:

| File | Inferred role |
|---|---|
| `alarm1.wav` | warning (near-top-of-board) |
| `dreier.wav`, `dreier2.wav` | Three-in-a-row match confirmation |
| `flash1.wav` | flash / lightning effect |
| `gr_explo.wav` | "grosse Explosion" — big explosion (bomb) |
| `kl_explo.wav` | "kleine Explosion" — small explosion |
| `high1.wav`, `high2.wav` | high-score screen |
| `huhu.wav` | attention / "hello" |
| `klack1/2/4/5.wav` | ball-landing clicks |
| `kran1.wav` | crane motor |
| `poeff.wav` | soft puff |
| `quit1/2.wav` | quit dialogue |
| `receive.wav` | incoming item |
| `schrei.wav` | scream (death?) |
| `splitter.wav` | shatter |
| `spratz2.wav` | sizzle |
| `star1.wav`, `starfall.wav` | star extra |
| `start.wav` | game-start jingle |
| `strom1/2.wav` | electricity |
| `tint4.wav` | ping / chime |
| `wind2.wav` | wind |
| `wupp.wav` | whoosh |

## Backgrounds (`*.SWG`)

Every `.SWG` is exactly `640 * 480 * 2 = 614400` bytes and contains a raw
16-bit RGB565 framebuffer. The extractor converts them to PNG in
`web/public/assets/backgrounds/`.

| Source file | Inferred role |
|---|---|
| `DATEN/GRAFIK/LOAD01..16.SWG` | 16 level loading screens |
| `GRF/GAMMA.SWG` | gamma / brightness calibration screen |
| `GRF/HINTERH.SWG` | "Hintergrund" — generic in-game background |
| `GRF/LOAD01.SWG` | duplicate of `DATEN/GRAFIK/LOAD01.SWG`? |
| `GRF/SMBACK.SWG` | start-menu background |
| `GRF/NETWORK.SWG`, `NET_ARC.SWG`, `NET_COM.SWG`, `SPLITARC.SWG`, `SPLITCOM.SWG` | multiplayer / network screens (out of scope for v1) |
| `GRF/SUDDEATH.SWG` | sudden-death screen |

## Sphere sets (`KUGELN/*.SET`)

All 12 valid files share a 68-byte header documented in `tools/extract-set.mjs`.

Confirmed fields:
- magic `"Gib mir 'ne Kugel\n\0\x1A"`
- null-padded set name (16 bytes)
- frame size is **30×30 pixels** for every set
- all sets advertise `groupCount = 3` (likely 3 colours per set, with each
  colour being an animation)

| File | Name | Flags | per-frame | Notes |
|---|---|---|---|---|
| `NORMAL.SET` | `standard` | 0x0F01 | 812 | Default set |
| `GEOMET.SET` | `Geometrik` | 0x0F01 | 784 | |
| `PLASTIC.SET` | `plastic` | 0x0F01 | 812 | |
| `PEOPLE.SET` | `people` | 0x0F01 | 825 | Face-style spheres |
| `KUGELB.SET` | `S2000 Team` | 0x0F04 | 815 | Dev-team easter egg |
| `KUGELD.SET` | `Juwelen` | 0x0F04 | 812 | Jewels |
| `KUGEL6.SET` | `Atome` | 0x0F04 | 784 | Atoms |
| `KUGEL7.SET` | `Glas` | 0x0F04 | 784 | Glass |
| `KUGEL8.SET` | `Formen` | 0x0F04 | 784 | Shapes |
| `KUGEL9.SET` | `Kontrast` | 0x0F04 | 784 | |
| `SPLITT.SET` | `Splitt` | 0x0F01 | 784 | |

The per-frame payload appears to be RLE per scanline
(`u16 x, u16 count, pixels…`). Frame separators are still being worked out —
for now the extractor gets ~1 candidate frame per set out. Full decoding is a
follow-up task; **the web game uses procedural sphere sprites for v1**.

## Resources (`GRF/*.RES`)

Full inventory in [`res-header-dump.txt`](./res-header-dump.txt). Header:

```
u16  0x0014         marker
u8   subtype        1,2,3,4,7 (and 0, 6 for a few outliers)
u8   0x0F           constant
u16  width
u16  height
u32  dataLen
u32  frames         (0 for single-frame)
...payload
```

Key resources for the web game:

| File | Size | w × h | Frames | Role |
|---|---|---|---|---|
| `WIPPE.RES` | 17 KB | 56×6 | 3 | **see-saw** animation (the "wip") |
| `KRANNORM.RES` | 1.4 MB | 76×61 | 3 | normal crane |
| `KRANBURN.RES` | 231 KB | 75×60 | 3 | burning-crane variant |
| `KRANMSK.RES` | 113 KB | 76×61 | 3 | crane mask |
| `HEADS.RES` | 18 KB | 32×32 | 3 | player head icons |
| `BLOCK.RES` / `BLOCKL` / `BLOCKR` | ~3-9 KB | 42×42 / 18×42 | 3 | board blocks |
| `EXTRAS.RES` | 2.4 MB | ? | ? | power-up sprites (heart / star / bonus / bomb) — non-standard header, pending |
| `FONTS.RES` | 62 KB | ? | ? | in-game font — non-standard header, pending |
| `HELPMODE.RES` | 7.2 MB | ? | ? | help screens — non-standard header, pending |
| `SMBACK.RES` | 908 KB | 300×310 | 0 | start-menu background |
| `STARTMEN.RES` | 592 KB | 279×248 | 0 | start-menu foreground |
| `PAUSE.RES` | 796 KB | 142×130 | 3 | pause overlay |
| `MESSAGE.RES` | 62 KB | 320×100 | 3 | message box |
| `EXPLOA.RES` / `EXPLOB.RES` | 62 KB / 373 KB | 33×32 / 150×143 | 0 | explosions |
| `FUNKEN1-3.RES` | small | 7-10 × 6-8 | 0 | sparks |
| `SMOKEL.RES` / `SMOKER.RES` | 14 KB | 17×31 | 0 | smoke |
| `LIGHT.RES` | 125 KB | 134×120 | 0 | light flash |
| `GAMMA.RES` | 256 KB | 225×60 | 0 | gamma strip |

Per-subtype RLE decoders are still pending; the web game falls back to
procedural art until they are finished.

## Music (`DMTS/NEU*.DMT`)

28 tracks in a custom tracker format (probably related to "DigiMusic
Tracker"). Decoding is out of scope for the initial web port — the plan is to
re-record each track from DOSBox and ship them as `music/neu00..27.ogg`.

## What the web game uses today

- ✅ `public/assets/sfx/*.wav` — every original sound effect
- ✅ `public/assets/backgrounds/*.png` — every background screen
- ⏳ `public/assets/sprites/kugeln/*.png` — partial sphere sheets (1 frame
  each); full sheets once the .SET decoder handles frame separators
- ⏳ `public/assets/music/*.ogg` — not yet, music will be captured from DOSBox
- ⏳ Sprites for crane, see-saw, extras, UI — procedural fallbacks in v1,
  original art gets swapped in once `.RES` subtype decoders are complete

Everything that is still pending is tracked as a follow-up in
`tools/extract-set.mjs`, `tools/extract-res.mjs` and this file.
