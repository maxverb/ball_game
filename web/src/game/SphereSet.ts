// Loader and helper for the decoded sphere-set sprite sheets. Each .SET
// file produced by `tools/extract-set.mjs` becomes a PNG atlas of up to
// 46 frames arranged in a 16-col × N-row grid. We slice out six "colour
// slots" so the game can use real SWING artwork instead of the
// procedural spheres.

import { Assets, Rectangle, Texture } from "pixi.js";
import type { BallColour } from "./types";
import { BALL_COLOURS } from "./types";

export const SPHERE_FRAME = 30;

/** Metadata persisted in `assets/sprites/kugeln/palette.json`. */
interface SetEntry {
  name: string;
  rgb: [number, number, number];
  frameCount: number;
}
type Palette = Record<string, SetEntry>;

/**
 * One loaded sphere-set: an atlas texture plus per-colour sub-textures.
 * If the set couldn't be loaded (or has too few frames to carve up into
 * 6 colours) all fields are null and the game falls back to procedural
 * rendering.
 */
export interface LoadedSet {
  id: string;
  name: string;
  atlas: Texture | null;
  colours: Record<BallColour, Texture | null>;
}

/**
 * Only sets that decoded a full 46-frame rotation are useful for the
 * game. KUGEL6/KUGEL9/KUGELB/KUGELD/PEOPLE have a more complex per-row
 * format that the extractor doesn't yet handle — see docs/ASSETS.md.
 */
const USABLE_SETS = ["normal", "plastic", "geomet", "kugel7", "kugel8", "splitt"];

export async function loadSphereSet(id: string): Promise<LoadedSet | null> {
  const name = id;
  try {
    const paletteRes = await fetch("assets/sprites/kugeln/palette.json");
    if (!paletteRes.ok) return null;
    const palette: Palette = await paletteRes.json();
    const meta = palette[id];
    if (!meta || meta.frameCount < 6) return null;

    const atlas = await Assets.load<Texture>(`assets/sprites/kugeln/${id}.png`);
    if (!atlas) return null;
    const cols = Math.min(16, meta.frameCount);
    const colours: Record<BallColour, Texture | null> = {
      red: null,
      yellow: null,
      green: null,
      blue: null,
      purple: null,
      orange: null,
    };
    // Pick 6 frames spread evenly through the rotation so each colour
    // slot gets a distinct pose. For real colour diversity we'd need to
    // crack the 3-group layout described in docs/ASSETS.md; this is a
    // visually convincing first step.
    const frameIndices = [0, 7, 15, 22, 30, 38];
    for (let i = 0; i < BALL_COLOURS.length; i++) {
      const colour = BALL_COLOURS[i];
      const idx = frameIndices[i] % meta.frameCount;
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const frame = new Texture({
        source: atlas.source,
        frame: new Rectangle(
          col * SPHERE_FRAME,
          row * SPHERE_FRAME,
          SPHERE_FRAME,
          SPHERE_FRAME,
        ),
      });
      colours[colour] = frame;
    }
    return { id, name: meta.name, atlas, colours };
  } catch (err) {
    console.warn(`Sphere set "${name}" failed to load:`, err);
    return null;
  }
}

export { USABLE_SETS };
