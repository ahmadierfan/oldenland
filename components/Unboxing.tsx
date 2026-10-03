"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FRAME_ASPECT, FRAME_COUNT, FRAME_CUT, frames } from "@/lib/frames";
import { unboxingStages } from "@/lib/content";

gsap.registerPlugin(ScrollTrigger);

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const stageOf = (f: number) => Math.max(0, unboxingStages.findIndex((s) => f >= s.from && f <= s.to));

/**
 * Chapter III: the real unboxing film, scrubbed frame-by-frame by the scroll position.
 * Bag → gift box → violet case → glass crocus crown → saffron.
 */
export default function Unboxing() {
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const fade = useRef<HTMLDivElement>(null);
  const dip = useRef<HTMLDivElement>(null);
  const meter = useRef<HTMLDivElement>(null);
  const caption = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const tween = gsap.fromTo(
      caption.current,
      { opacity: 0, y: 28, filter: "blur(6px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.9, ease: "power3.out" },
    );
    return () => void tween.kill();
  }, [current]);

  useEffect(() => {
    frames.start();
    const cvs = canvas.current!;
    const ctx = cvs.getContext("2d", { alpha: false })!;
    let frame = 0;
    let drawn: HTMLImageElement | null = null;
    let feather: CanvasGradient | null = null;

    const makeFeather = () => {
      const cw = cvs.width;
      const ch = cvs.height;
      if (window.innerWidth < 768) {
        const g = ctx.createLinearGradient(0, 0, 0, ch);
        g.addColorStop(0, "rgba(10,9,8,1)");
        g.addColorStop(0.14, "rgba(10,9,8,0)");
        g.addColorStop(0.62, "rgba(10,9,8,0)");
        g.addColorStop(1, "rgba(10,9,8,1)");
        return g;
      }
      // Circular gradient in a unit space; draw() squashes it into an ellipse that fits the canvas.
      const r = ch * 0.6;
      const g = ctx.createRadialGradient(0, 0, r * 0.45, 0, 0, r);
      g.addColorStop(0, "rgba(10,9,8,0)");
      g.addColorStop(0.55, "rgba(10,9,8,0.55)");
      g.addColorStop(1, "rgba(10,9,8,1)");
      return g;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = cvs.getBoundingClientRect();
      cvs.width = Math.round(r.width * dpr);
      cvs.height = Math.round(r.height * dpr);
      feather = makeFeather();
      drawn = null;
      draw();
    };

    // Cover-fit the frame into the canvas.
    const draw = () => {
      const img = frames.nearest(frame);
      if (!img || img === drawn) return;
      drawn = img;
      const cw = cvs.width;
      const ch = cvs.height;
      const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      ctx.fillStyle = "#0a0908";
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
      // Feather the edges into the page background (cheaper than a CSS mask on a live canvas).
      ctx.fillStyle = feather!;
      if (window.innerWidth < 768) {
        ctx.fillRect(0, 0, cw, ch);
      } else {
        ctx.save();
        ctx.translate(cw / 2, ch / 2);
        ctx.scale(cw / ch, 1);
        ctx.fillRect(-ch / 2, -ch / 2, ch, ch);
        ctx.restore();
      }
    };

    const unsub = frames.subscribe(() => {
      // A closer frame may have arrived.
      if (frames.images[frame] && frames.images[frame] !== drawn) draw();
      else if (!drawn) draw();
    });

    const st = ScrollTrigger.create({
      trigger: section.current,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => update(self.progress),
    });

    let lastStage = -1;
    function update(p: number) {
      // Hold the first and last frame briefly so the chapter breathes in and out.
      const t = clamp((p - 0.04) / 0.9);
      const f = Math.round(t * (FRAME_COUNT - 1));
      if (f !== frame) {
        frame = f;
        draw();
      }
      if (dip.current) dip.current.style.opacity = String(Math.max(0, 1 - Math.abs(f - FRAME_CUT) / 6) * 0.95);
      if (meter.current) meter.current.style.transform = `scaleY(${t})`;
      const intro = clamp(p / 0.05);
      const outro = clamp((1 - p) / 0.05);
      if (fade.current) fade.current.style.opacity = String(Math.min(intro, outro));
      if (stage.current) stage.current.style.transform = `scale(${0.92 + 0.08 * intro})`;
      const s = stageOf(f);
      if (s !== lastStage) {
        lastStage = s;
        setCurrent(s);
      }
    }

    window.addEventListener("resize", resize);
    resize();
    update(st.progress);
    return () => {
      window.removeEventListener("resize", resize);
      unsub();
      st.kill();
    };
  }, []);

  const s = unboxingStages[current];

  return (
    <section id="unboxing" ref={section} className="relative h-[1000vh] bg-ink">
      <div ref={fade} className="sticky top-0 h-[100svh] w-full overflow-hidden">
        {/* Warm haze behind the film */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_45%_55%_at_50%_50%,rgba(201,164,92,0.10),transparent_70%)]" />

        <div ref={stage} className="absolute inset-0 flex items-center justify-center will-change-transform">
          {/* Film */}
          <div
            className="relative h-full w-full md:h-[94svh] md:w-auto"
            style={{ aspectRatio: `${FRAME_ASPECT}` }}
          >
            <canvas ref={canvas} className="absolute inset-0 h-full w-full" aria-label="Oldenland unboxing film" role="img" />
            <div ref={dip} className="pointer-events-none absolute inset-0 bg-ink opacity-0" />
          </div>
        </div>

        {/* Caption — left on desktop, bottom on mobile */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/85 to-transparent px-6 pb-10 pt-32 md:inset-y-0 md:left-0 md:right-auto md:flex md:w-[34vw] md:items-center md:bg-none md:px-16 md:pb-0 md:pt-0">
          <div ref={caption}>
            <p className="font-display gold-text text-7xl leading-none md:text-[9rem]">{s.index}</p>
            <p className="kicker mt-4">{s.name}</p>
            <h3 className="font-display mt-4 text-3xl font-light leading-tight md:text-5xl">{s.title}</h3>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-cream/70 md:text-base">{s.body}</p>
          </div>
        </div>

        {/* Stage index — right on desktop, top dots on mobile */}
        <div className="absolute right-16 top-1/2 hidden -translate-y-1/2 items-stretch gap-6 md:flex">
          <div className="relative w-px bg-cream/10">
            <div ref={meter} className="absolute inset-0 origin-top scale-y-0 bg-gold" />
          </div>
          <ol className="flex flex-col justify-between gap-7 py-1">
            {unboxingStages.map((st, i) => (
              <li
                key={st.name}
                className={`text-xs uppercase tracking-[0.3em] transition-colors duration-500 ${
                  i === current ? "text-gold" : i < current ? "text-cream/50" : "text-cream/25"
                }`}
              >
                <span className="mr-3 font-display text-sm tracking-normal">{st.index}</span>
                {st.name}
              </li>
            ))}
          </ol>
        </div>
        <div className="absolute inset-x-0 top-20 flex justify-center gap-2 md:hidden">
          {unboxingStages.map((st, i) => (
            <span
              key={st.name}
              className={`h-[2px] w-8 transition-colors duration-500 ${i <= current ? "bg-gold" : "bg-cream/20"}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
