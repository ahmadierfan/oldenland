"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { specs } from "@/lib/content";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Chapter V: the saffron itself — an iris-open macro shot, then the specification. */
export default function Saffron() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: ".saffron-pin", start: "top top", end: "+=180%", pin: true, scrub: 1 },
      });
      tl.fromTo(".saffron-mask", { clipPath: "circle(12% at 50% 50%)" }, { clipPath: "circle(75% at 50% 50%)", ease: "none" })
        .fromTo(".saffron-macro", { scale: 1.6 }, { scale: 1, ease: "none" }, 0)
        .fromTo(".saffron-title span", { yPercent: 110 }, { yPercent: 0, stagger: 0.08, ease: "power3.out", duration: 0.35 }, 0.5)
        .fromTo(".saffron-sub", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.3 }, 0.7);

      gsap.from(".spec", {
        y: 50,
        opacity: 0,
        stagger: 0.07,
        ease: "power3.out",
        scrollTrigger: { trigger: ".spec-grid", start: "top 80%", end: "top 40%", scrub: 1 },
      });
      gsap.fromTo(".crown-img", { yPercent: -10 }, {
        yPercent: 10,
        ease: "none",
        scrollTrigger: { trigger: ".crown", start: "top bottom", end: "bottom top", scrub: true },
      });
    },
    { scope: root },
  );

  return (
    <section id="saffron" ref={root} className="relative bg-ink">
      <div className="saffron-pin relative h-[100svh] overflow-hidden">
        <div className="saffron-mask absolute inset-0">
          <img
            src="/images/saffron-macro-1600.webp"
            alt="Macro of deep red Persian saffron threads in a glass vessel"
            className="saffron-macro absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(10,9,8,0.55),rgba(10,9,8,0.9))]" />
        </div>
        <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
          <p className="kicker saffron-sub mb-6">Chapter V — The Saffron</p>
          <h2 className="saffron-title font-display text-6xl font-light leading-[0.95] md:text-[9vw]">
            <span className="block overflow-hidden"><span className="inline-block">The red gold</span></span>
            <span className="block overflow-hidden"><em className="gold-text inline-block pb-2">of Khorasan</em></span>
          </h2>
          <p className="saffron-sub mt-6 max-w-lg text-cream/75 md:text-lg">
            Deep crimson threads with an intense aroma and colour — dried slowly and sealed in glass the day they are graded.
          </p>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-16 px-6 py-28 md:grid-cols-2 md:items-center md:px-16 md:py-40">
        <div className="crown relative aspect-[4/5] overflow-hidden">
          <img
            src="/images/saffron-crown-1600.webp"
            alt="The Oldenland glass vessel filled with saffron, seen from above"
            loading="lazy"
            className="crown-img absolute inset-0 h-[120%] w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-gold/20" />
        </div>
        <div>
          <p className="kicker mb-5">Specification</p>
          <h3 className="font-display text-4xl font-light leading-tight md:text-5xl">Graded, sealed and documented.</h3>
          <dl className="spec-grid mt-10 grid grid-cols-1 border-t border-gold/15 sm:grid-cols-2">
            {specs.map((s) => (
              <div key={s.label} className="spec border-b border-gold/15 py-6 sm:odd:pr-6 sm:even:border-l sm:even:pl-6">
                <dt className="text-[0.65rem] uppercase tracking-[0.3em] text-mute">{s.label}</dt>
                <dd className="font-display mt-2 text-xl text-cream md:text-2xl">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
