"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { brand, originBeats } from "@/lib/content";
import { FIELD_END, FIELD_VH } from "@/lib/handoff";

gsap.registerPlugin(ScrollTrigger);

const OriginScene = dynamic(() => import("./OriginScene"), { ssr: false });

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const FADE = 0.035;

/** Opacity of a beat that is visible between `at` and `until`, with soft edges. */
const beatOpacity = (p: number, at: number, until: number) =>
  Math.min(clamp((p - at) / FADE), clamp((until - p) / FADE));

/**
 * Hero + Chapter I (The Field) + Chapter II (The Harvest).
 * A tall section with a sticky WebGL stage; scroll position drives the camera, the dawn and the text.
 */
export default function Origin() {
  const section = useRef<HTMLElement>(null);
  const progress = useRef({ current: 0 });
  const hero = useRef<HTMLDivElement>(null);
  const beats = useRef<(HTMLDivElement | null)[]>([]);
  const stat = useRef<HTMLSpanElement>(null);
  const outro = useRef<HTMLDivElement>(null);
  const black = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);

  useEffect(() => {
    const el = section.current!;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { rootMargin: "100px" });
    io.observe(el);

    const st = ScrollTrigger.create({
      trigger: el,
      start: "top top",
      end: "bottom bottom",
      // The field's story ends at FIELD_END; after that it holds its last frame while the
      // unboxing section (pulled up over this one) dissolves in on top.
      onUpdate: (self) => render(Math.min(1, self.progress / FIELD_END)),
    });

    function render(p: number) {
      progress.current.current = p;

      if (hero.current) {
        const h = 1 - clamp(p / 0.1);
        hero.current.style.opacity = String(h);
        hero.current.style.transform = `translate3d(0, ${-p * 600}px, 0) scale(${1 + p * 0.6})`;
        hero.current.style.filter = `blur(${(1 - h) * 10}px)`;
      }

      originBeats.forEach((b, i) => {
        const node = beats.current[i];
        if (!node) return;
        const o = beatOpacity(p, b.at, b.until);
        node.style.opacity = String(o);
        node.style.visibility = o > 0.001 ? "visible" : "hidden";
        const mid = (b.at + b.until) / 2;
        node.style.transform = `translate3d(0, ${(mid - p) * 260}px, 0)`;
        if (b.stat && stat.current) {
          const k = clamp((p - b.at) / ((b.until - b.at) * 0.6));
          const eased = 1 - Math.pow(1 - k, 3);
          stat.current.textContent = Math.round(b.stat.value * eased).toLocaleString("en-US");
        }
      });

      if (outro.current) {
        const o = beatOpacity(p, 0.86, 0.97);
        outro.current.style.opacity = String(o);
        outro.current.style.transform = `translate3d(0, ${(1 - clamp((p - 0.86) / 0.1)) * 40}px, 0)`;
      }
      if (black.current) black.current.style.opacity = String(beatOpacity(p, 0.84, 0.97) * 0.35);
      if (bar.current) bar.current.style.transform = `scaleY(${p})`;
    }

    render(st.progress);
    return () => {
      io.disconnect();
      st.kill();
    };
  }, []);

  return (
    <section id="origin" ref={section} className="relative"
      style={{ height: `${FIELD_VH}vh` }}>
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        <OriginScene progress={progress.current} active={active} />

        {/* Cinematic grade over the 3D stage */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(10,9,8,0.75)_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink/90 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-ink/80 to-transparent" />

        {/* Hero */}
        <div ref={hero} className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center will-change-transform">
          <p className="kicker mb-6 opacity-80">Persian Saffron · {brand.origin}</p>
          <h1 className="font-display gold-text text-[16vw] font-light leading-[0.85] tracking-[0.08em] md:text-[11vw]">
            OLDENLAND
          </h1>
          <p className="font-display mt-6 max-w-xl text-xl italic text-cream/80 md:text-2xl">{brand.tagline}</p>
          <div className="absolute bottom-10 flex flex-col items-center gap-3 text-[0.65rem] uppercase tracking-[0.4em] text-cream/60">
            <span>Scroll to begin</span>
            <span className="relative block h-12 w-px overflow-hidden bg-cream/15">
              <span className="absolute inset-x-0 top-0 h-1/2 animate-[scrollcue_2.2s_ease-in-out_infinite] bg-gold" />
            </span>
          </div>
        </div>

        {/* Story beats */}
        {originBeats.map((b, i) => (
          <div
            key={b.title}
            ref={(el) => void (beats.current[i] = el)}
            className={`invisible absolute inset-x-0 px-6 opacity-0 will-change-transform md:px-16 ${
              i % 2 === 0 ? "bottom-[14%] md:bottom-auto md:top-1/2 md:-translate-y-1/2" : "bottom-[14%]"
            }`}
          >
            <div className={`max-w-xl ${i % 2 === 0 ? "" : "md:ml-auto md:text-right"}`}>
              <p className="kicker mb-5">{b.kicker}</p>
              <h2 className="font-display text-4xl font-light leading-[1.05] text-cream md:text-6xl">{b.title}</h2>
              <p className="mt-5 text-base leading-relaxed text-cream/70 md:text-lg">{b.body}</p>
              {b.stat && (
                <p className="mt-8 flex items-baseline gap-3 md:justify-end">
                  <span className="font-display gold-text text-6xl md:text-7xl">
                    <span ref={stat}>0</span>
                    {b.stat.suffix}
                  </span>
                  <span className="text-xs uppercase tracking-[0.25em] text-cream/60">{b.stat.label}</span>
                </p>
              )}
            </div>
          </div>
        ))}

        <div ref={black} className="pointer-events-none absolute inset-0 bg-ink opacity-0" />

        {/* Hand-off to the packaging */}
        <div ref={outro} className="absolute inset-0 flex items-center justify-center px-6 text-center opacity-0">
          <div>
            <p className="kicker mb-5">Chapter III — The Vessel</p>
            <h2 className="font-display text-5xl font-light leading-tight md:text-7xl">
              Then, we wrap the land
              <br />
              <em className="gold-text">in gold.</em>
            </h2>
          </div>
        </div>


        {/* Chapter progress rail */}
        <div className="absolute left-6 top-1/2 hidden h-40 w-px -translate-y-1/2 bg-cream/10 md:block">
          <div ref={bar} className="h-full w-full origin-top scale-y-0 bg-gold" />
        </div>
      </div>
    </section>
  );
}
