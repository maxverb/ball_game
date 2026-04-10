// Thin Web Audio helper. Loads the original SWING .wav files straight
// out of `/assets/sfx/` and plays them from an AudioBuffer pool.

type SfxName =
  | "klack"
  | "klack2"
  | "dreier"
  | "dreier2"
  | "star"
  | "starfall"
  | "flash"
  | "kran"
  | "wupp"
  | "alarm"
  | "grExplo"
  | "klExplo"
  | "start"
  | "huhu";

const FILE_MAP: Record<SfxName, string> = {
  klack: "klack1.wav",
  klack2: "klack2.wav",
  dreier: "dreier.wav",
  dreier2: "dreier2.wav",
  star: "star1.wav",
  starfall: "starfall.wav",
  flash: "flash1.wav",
  kran: "kran1.wav",
  wupp: "wupp.wav",
  alarm: "alarm1.wav",
  grExplo: "gr_explo.wav",
  klExplo: "kl_explo.wav",
  start: "start.wav",
  huhu: "huhu.wav",
};

export class AudioManager {
  private ctx: AudioContext | null = null;
  private buffers: Partial<Record<SfxName, AudioBuffer>> = {};
  muted = false;

  async init(baseUrl = "assets/sfx/"): Promise<void> {
    // Lazily create the context — browsers require a user gesture first,
    // so `play()` will retry-create if needed.
    try {
      this.ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
    } catch {
      console.warn("Web Audio not available — running silent.");
      return;
    }
    const entries = Object.entries(FILE_MAP) as [SfxName, string][];
    await Promise.all(
      entries.map(async ([name, file]) => {
        try {
          const res = await fetch(baseUrl + file);
          if (!res.ok) throw new Error(res.statusText);
          const arr = await res.arrayBuffer();
          const buf = await this.ctx!.decodeAudioData(arr);
          this.buffers[name] = buf;
        } catch (err) {
          console.warn(`Failed to load ${file}:`, err);
        }
      }),
    );
  }

  play(name: SfxName, { volume = 1, pitch = 1 } = {}): void {
    if (this.muted || !this.ctx) return;
    const buf = this.buffers[name];
    if (!buf) return;
    // Resume if the tab suspended the context (Chrome auto-suspend).
    if (this.ctx.state === "suspended") this.ctx.resume();
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = pitch;
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain).connect(this.ctx.destination);
    src.start(0);
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }
}
