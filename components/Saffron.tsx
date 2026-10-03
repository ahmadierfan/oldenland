"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { specs } from "@/lib/content";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Chapter IV: the saffron itself — a crimson glow that opens behind the title, then the specification. */
export default function Saffron() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: ".saffron-pin", start: "top top", end: "+=160%", pin: true, scrub: 1 },
      });
      tl.fromTo(".saffron-glow", { scale: 0.2, opacity: 0 }, { scale: 1, opacity: 1, ease: "none" })
        .fromTo(".saffron-title span", { yPercent: 110 }, { yPercent: 0, stagger: 0.08, ease: "power3.out", duration: 0.35 }, 0.35)
        .fromTo(".saffron-sub", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.3 }, 0.6);

      gsap.from(".spec", {
        y: 50,
        opacity: 0,
        stagger: 0.07,
        ease: "power3.out",
        scrollTrigger: { trigger: ".spec-grid", start: "top 85%", end: "top 45%", scrub: 1 },
      });
    },
    { scope: root },
  );

  return (
    <section id="saffron" ref={root} className="relative bg-ink">
      <div className="saffron-pin relative h-[100svh] overflow-hidden">
        <div className="saffron-glow absolute inset-0 bg-[radial-gradient(ellipse_45%_40%_at_50%_55%,rgba(150,18,8,0.55),rgba(90,10,5,0.25)_45%,transparent_75%)]" />
        <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
          <p className="kicker saffron-sub mb-6">Chapter IV — The Saffron</p>
          <h2 className="saffron-title font-display text-6xl font-light leading-[0.95] md:text-[9vw]">
            <span className="block overflow-hidden"><span className="inline-block">The red gold</span></span>
            <span className="block overflow-hidden"><em className="gold-text inline-block pb-2">of Khorasan</em></span>
          </h2>
          <p className="saffron-sub mt-6 max-w-lg text-cream/75 md:text-lg">
            Deep crimson threads with an intense aroma and colour — dried slowly and sealed in glass the day they are graded.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-28 md:px-16 md:py-40">
        <p className="kicker mb-5">Specification</p>
        <h3 className="font-display text-4xl font-light leading-tight md:text-5xl">Graded, sealed and documented.</h3>
        <dl className="spec-grid mt-12 grid grid-cols-1 border-t border-gold/15 sm:grid-cols-2 lg:grid-cols-3">
          {specs.map((s) => (
            <div key={s.label} className="spec border-b border-gold/15 py-7 sm:pr-8">
              <dt className="text-[0.65rem] uppercase tracking-[0.3em] text-mute">{s.label}</dt>
              <dd className="font-display mt-2 text-xl text-cream md:text-2xl">{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
