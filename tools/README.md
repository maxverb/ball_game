# SWING asset extraction tools

Node scripts that reverse-engineer the original SWING (1997 Software 2000) DOS
assets into open formats the web game can consume.

All scripts read from `../SWING/` and write to `../web/public/assets/`.

Run individually:

```bash
node tools/extract-wav.mjs
node tools/extract-swg.mjs
node tools/extract-set.mjs
node tools/extract-res.mjs
```

Or run everything:

```bash
node tools/extract-all.mjs
```

## File formats (what we've figured out so far)

### `SND/*.WAV`  —  standard RIFF WAV
Direct copy, no conversion needed.

### `GRF/*.SWG` and `DATEN/GRAFIK/LOAD*.SWG`  —  raw 640×480×16bpp
Each file is exactly `640 * 480 * 2 = 614400` bytes.
Interpreted as little-endian RGB565 (5 bits R, 6 bits G, 5 bits B).

### `KUGELN/*.SET`  —  sphere skin sets
```
magic    "Gib mir 'ne Kugel\n"     (18 bytes)
<byte>   0x00
<byte>   0x1A                      (end-of-file marker for DOS TYPE)
name     null-terminated ASCII string, padded to 24 bytes total
u32      unknown (size?)
u32      unknown
u32      data size
u16      frame count per ball
u16      ball count
u16      frame width
u16      frame height
...      per-frame RGB565 pixels (width*height*2 bytes each)
```
NOTE: exact header layout is still being validated; see `extract-set.mjs`.

### `GRF/*.RES`  —  custom resource container
Generic header starts with bytes `0x14 0x00 <flags> 0x0F` then width/height
and a chunk table. Format varies per family (FONTS vs KRANNORM vs EXTRAS).
See `extract-res.mjs` for the current understanding.
