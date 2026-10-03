/**
 * Loader for the unboxing film's WebP frame sequence (built by scripts/build-media.sh).
 * Frames load coarse-to-fine (every 32nd, then 16th, 8th …) so scrubbing works almost immediately
 * and simply gets smoother as the rest arrive.
 */

export const FRAME_COUNT = 365;
export const FRAME_ASPECT = 1080 / 1900;
/** The clip has one hard cut (bag → floor). We dip to black across it. */
export const FRAME_CUT = 122;

type Listener = (loaded: number) => void;

class FrameStore {
  images: (HTMLImageElement | null)[] = new Array(FRAME_COUNT).fill(null);
  loaded = 0;
  private started = false;
  private listeners = new Set<Listener>();

  start() {
    if (this.started || typeof window === "undefined") return;
    this.started = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = window.innerWidth * dpr < 900 && window.innerHeight * dpr < 1700 ? "sm" : "lg";

    const order: number[] = [];
    const seen = new Set<number>();
    for (const stride of [32, 16, 8, 4, 2, 1]) {
      for (let i = 0; i < FRAME_COUNT; i += stride) {
        if (!seen.has(i)) {
          seen.add(i);
          order.push(i);
        }
      }
    }
    if (!seen.has(FRAME_COUNT - 1)) order.splice(1, 0, FRAME_COUNT - 1);

    let cursor = 0;
    const next = () => {
      if (cursor >= order.length) return;
      const i = order[cursor++];
      const img = new Image();
      img.decoding = "async";
      img.src = `/frames/${size}/${String(i).padStart(4, "0")}.webp`;
      const done = () => {
        this.images[i] = img;
        this.loaded++;
        this.listeners.forEach((l) => l(this.loaded));
        next();
      };
      img.decode().then(done, () => {
        this.loaded++;
        next();
      });
    };
    for (let k = 0; k < 6; k++) next();
  }

  /** The requested frame, or the closest one that has loaded. */
  nearest(i: number): HTMLImageElement | null {
    if (this.images[i]) return this.images[i];
    for (let d = 1; d < FRAME_COUNT; d++) {
      const a = this.images[i - d];
      if (a) return a;
      const b = this.images[i + d];
      if (b) return b;
    }
    return null;
  }

  subscribe(l: Listener) {
    this.listeners.add(l);
    return () => void this.listeners.delete(l);
  }
}

export const frames = new FrameStore();
