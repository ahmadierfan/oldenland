/**
 * Phones and tablets get a lighter version of every 3D scene: no heavy post-processing, no float
 * buffers, fewer instances and a capped pixel ratio. Mobile GPUs (iOS Safari in particular) silently
 * drop a WebGL canvas when it runs out of memory, which shows up as an empty black scene.
 */
export function isLowPower() {
  if (typeof window === "undefined") return false;
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const small = Math.min(window.innerWidth, window.innerHeight) < 820;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return coarse || small || (mem !== undefined && mem <= 4);
}
