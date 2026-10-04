"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { useStageMount } from "@/hooks/useStageMount";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { packagingBeats } from "@/lib/content";
import { DISSOLVE_END, DISSOLVE_VH, UNBOX_VH } from "@/lib/handoff";

gsap.registerPlugin(ScrollTrigger);

const PackagingScene = dynamic(() => import("./PackagingScene"), { ssr: false });

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (p: number, a: number, b: number) => {
  const t = clamp((p - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const FADE = 0.025;

/** Chapter III: the packaging, modelled in 3D and opened layer by layer as you scroll. */
export default function Packaging() {
  const section = useRef<HTMLElement>(null);
  const mounted = useStageMount(section);
  const progress = useRef({ current: 0 });
  const beats = useRef<(HTMLDivElement | null)[]>([]);
  const meter = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const film = useRef<HTMLDivElement>(null);
  const vignette = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const el = section.current!;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { rootMargin: "200px" });
    io.observe(el);
    let last = -1;
    const render = (p: number) => {
      progress.current.current = p;
      packagingBeats.forEach((b, i) => {
        const node = beats.current[i];
        if (!node) return;
        const o = Math.min(clamp((p - b.at) / FADE), clamp((b.until - p) / FADE));
        node.style.opacity = String(b.at === 0 ? Math.min(1, clamp((b.until - p) / FADE)) : o);
        node.style.transform = `translate3d(0, ${(1 - o) * 24}px, 0)`;
        node.style.visibility = Number(node.style.opacity) > 0.001 ? "visible" : "hidden";
      });
      const idx = packagingBeats.reduce((acc, b, i) => (p >= b.at - 0.01 ? i : acc), 0);
      if (idx !== last) {
        last = idx;
        setCurrent(idx);
      }
      if (meter.current) meter.current.style.transform = `scaleY(${p})`;

      // Field → studio: the 3D stage fades in over the held field frame (its bag sits exactly on
      // the field's bag), then the black studio rises behind it and the field is gone.
      const lit = smooth(p, 0, DISSOLVE_END * 0.35);
      const dark = smooth(p, DISSOLVE_END * 0.3, DISSOLVE_END);
      if (film.current) film.current.style.opacity = String(lit);
      if (backdrop.current) backdrop.current.style.opacity = String(dark);
      if (vignette.current) vignette.current.style.opacity = String(dark);
    };
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (s) => render(s.progress),
      // Hidden until pinned: before that this section is still sliding up over the field.
      onToggle: (s) => stage.current && (stage.current.style.visibility = s.isActive || s.progress > 0 ? "visible" : "hidden"),
    });
    render(st.progress);
    return () => {
      io.disconnect();
      st.kill();
    };
  }, []);

  return (
    <section
      id="unboxing"
      ref={section}
      className="relative z-10"
      style={{ height: `${UNBOX_VH}vh`, marginTop: `-${DISSOLVE_VH + 100}vh` }}
    >
      <div ref={stage} className="invisible sticky top-0 h-[100svh] w-full overflow-hidden">
        <div ref={backdrop} className="absolute inset-0 bg-ink opacity-0" />
        <div ref={film} className="absolute inset-0 opacity-0">
          {mounted && <PackagingScene progress={progress.current} active={active} />}
        </div>
        <div
          ref={vignette}
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(5,4,3,0.7)_100%)] opacity-0"
        />

        {packagingBeats.map((b, i) => (
          <div
            key={b.name}
            ref={(el) => void (beats.current[i] = el)}
            className="pointer-events-none invisible absolute inset-x-0 bottom-0 px-6 pb-10 opacity-0 md:inset-y-0 md:left-0 md:right-auto md:flex md:w-[36vw] md:items-center md:px-16 md:pb-0"
          >
            <div className="rounded-sm bg-gradient-to-t from-ink via-ink/80 to-transparent pt-24 md:bg-none md:pt-0">
              <p className="font-display gold-text text-6xl leading-none md:text-8xl">{b.index}</p>
              <p className="kicker mt-4">{b.name}</p>
              <h3 className="font-display mt-3 text-3xl font-light leading-tight md:text-5xl">{b.title}</h3>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-cream/70 md:text-base">{b.body}</p>
            </div>
          </div>
        ))}

        <div className="absolute right-12 top-1/2 hidden -translate-y-1/2 items-stretch gap-5 lg:flex">
          <div className="relative w-px bg-cream/10">
            <div ref={meter} className="absolute inset-0 origin-top scale-y-0 bg-gold" />
          </div>
          <ol className="flex flex-col justify-between gap-5 py-1">
            {packagingBeats.map((b, i) => (
              <li
                key={b.name}
                className={`text-[0.65rem] uppercase tracking-[0.3em] transition-colors duration-500 ${
                  i === current ? "text-gold" : i < current ? "text-cream/45" : "text-cream/20"
                }`}
              >
                <span className="font-display mr-3 text-sm tracking-normal">{b.index}</span>
                {b.name}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
