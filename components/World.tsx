"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { useStageMount } from "@/hooks/useStageMount";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { exportOrigin, markets } from "@/lib/content";

gsap.registerPlugin(ScrollTrigger);

const WorldScene = dynamic(() => import("./WorldScene"), { ssr: false });

const clamp = (v: number) => Math.min(1, Math.max(0, v));
/** Must match routeWindow() in WorldScene. */
const arrival = (i: number) => 0.12 + i * 0.085 + 0.14;

/** Chapter V: saffron threads leave Khorasan as routes to the markets we ship to. */
export default function World() {
  const section = useRef<HTMLElement>(null);
  const mounted = useStageMount(section);
  const progress = useRef({ current: 0 });
  const labels = useRef<(HTMLDivElement | null)[]>([]);
  const intro = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [reached, setReached] = useState(0);

  useEffect(() => {
    const el = section.current!;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { rootMargin: "200px" });
    io.observe(el);
    let last = -1;
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        const p = self.progress;
        progress.current.current = p;
        const n = markets.filter((_, i) => p >= arrival(i)).length;
        if (n !== last) {
          last = n;
          setReached(n);
        }
        if (intro.current) intro.current.style.opacity = String(clamp(p / 0.06) * (1 - clamp((p - 0.97) / 0.03)));
      },
    });
    return () => {
      io.disconnect();
      st.kill();
    };
  }, []);

  const all = [{ city: exportOrigin.city, country: exportOrigin.region }, ...markets];

  return (
    <section id="world" ref={section} className="relative h-[600vh] bg-ink">
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        {mounted && <WorldScene progress={progress.current} active={active} labels={labels} />}

        {/* City labels that follow the globe */}
        {all.map((c, i) => (
          <div
            key={c.city}
            ref={(el) => void (labels.current[i] = el)}
            className="pointer-events-none absolute left-0 top-0 opacity-0 will-change-transform"
          >
            <div className="-translate-y-1/2 translate-x-3 whitespace-nowrap">
              <p className={`font-display text-base leading-none md:text-lg ${i === 0 ? "text-gold-soft" : "text-cream"}`}>{c.city}</p>
              <p className="mt-1 text-[0.55rem] uppercase tracking-[0.25em] text-cream/50">{c.country}</p>
            </div>
          </div>
        ))}

        <div ref={intro} className="pointer-events-none absolute inset-0 opacity-0">
          <div className="absolute left-6 top-24 max-w-sm md:left-16 md:top-1/2 md:-translate-y-1/2">
            <p className="kicker mb-5">Chapter IV — Export</p>
            <h2 className="font-display text-4xl font-light leading-[1.05] md:text-6xl">
              From Khorasan
              <br />
              <em className="gold-text">to the world.</em>
            </h2>
            <p className="mt-5 hidden text-cream/65 md:block">
              Every route begins in the fields of Khorasan. Every thread arrives sealed, documented and ready for the shelf.
            </p>
            <p className="mt-8 flex items-baseline gap-3">
              <span className="font-display gold-text text-6xl md:text-7xl">{reached}</span>
              <span className="text-[0.65rem] uppercase tracking-[0.3em] text-cream/55">of {markets.length} markets reached</span>
            </p>
            <ol className="mt-6 hidden grid-cols-2 gap-x-8 gap-y-2 md:grid">
              {markets.map((m, i) => (
                <li
                  key={m.city}
                  className={`flex items-center gap-3 text-[0.62rem] uppercase tracking-[0.28em] transition-colors duration-500 ${
                    i < reached ? "text-gold" : "text-cream/25"
                  }`}
                >
                  <span className={`h-px transition-all duration-700 ${i < reached ? "w-6 bg-gold" : "w-2 bg-cream/20"}`} />
                  {m.city}
                </li>
              ))}
            </ol>
          </div>

        </div>
      </div>
    </section>
  );
}
