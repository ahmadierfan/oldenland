"use client";

import { useEffect, useRef, useState } from "react";

/** Holds the curtain until the fonts are in, with a short minimum so the reveal feels deliberate. */
export default function Preloader() {
  const [done, setDone] = useState(false);
  const [gone, setGone] = useState(false);
  const num = useRef<HTMLSpanElement>(null);
  const line = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    window.__lenis?.stop();

    let fonts = false;
    let shown = 0;
    let raf = 0;
    document.fonts.ready.then(() => (fonts = true));
    const started = performance.now();
    let last = started;

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const elapsed = (performance.now() - started) / 1800;
      const goal = Math.min(elapsed, fonts ? 1 : 0.85, 1);
      shown += (goal - shown) * (1 - Math.exp(-dt * 5));
      if (num.current) num.current.textContent = String(Math.round(shown * 100)).padStart(2, "0");
      if (line.current) line.current.style.transform = `scaleX(${shown})`;
      if (shown > 0.995 || (goal >= 1 && shown > 0.97)) {
        setDone(true);
        window.__lenis?.start();
        setTimeout(() => setGone(true), 1400);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (gone) return null;
  return (
    <div
      className={`fixed inset-0 z-[70] flex flex-col items-center justify-center bg-ink transition-[clip-path] duration-[1300ms] ease-[cubic-bezier(.76,0,.24,1)] ${
        done ? "[clip-path:inset(0_0_100%_0)]" : "[clip-path:inset(0_0_0_0)]"
      }`}
    >
      <p className="font-display gold-text text-4xl tracking-[0.35em] md:text-6xl">OLDENLAND</p>
      <div className="mt-8 h-px w-48 bg-cream/10">
        <div ref={line} className="h-full origin-left scale-x-0 bg-gold" />
      </div>
      <p className="mt-5 text-[0.65rem] uppercase tracking-[0.4em] text-cream/50">
        <span ref={num}>00</span> — Preparing the harvest
      </p>
    </div>
  );
}
