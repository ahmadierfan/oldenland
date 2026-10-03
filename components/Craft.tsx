"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { craft } from "@/lib/content";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Chapter IV: the five layers of the packaging as a pinned horizontal gallery. */
export default function Craft() {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(min-width: 768px)", () => {
        const el = track.current!;
        const distance = () => el.scrollWidth - window.innerWidth;
        const tween = gsap.to(el, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
          },
        });

        gsap.utils.toArray<HTMLElement>(".craft-img").forEach((img) => {
          gsap.fromTo(
            img,
            { xPercent: -12, scale: 1.18 },
            {
              xPercent: 12,
              scale: 1.05,
              ease: "none",
              scrollTrigger: { trigger: img.parentElement, containerAnimation: tween, start: "left right", end: "right left", scrub: true },
            },
          );
        });
        gsap.utils.toArray<HTMLElement>(".craft-card").forEach((card) => {
          gsap.from(card.querySelectorAll(".craft-reveal"), {
            y: 40,
            opacity: 0,
            stagger: 0.08,
            ease: "power3.out",
            scrollTrigger: { trigger: card, containerAnimation: tween, start: "left 75%", end: "left 35%", scrub: true },
          });
        });
      });

      mm.add("(max-width: 767px)", () => {
        gsap.utils.toArray<HTMLElement>(".craft-card").forEach((card) => {
          gsap.from(card, {
            clipPath: "inset(18% 8% 18% 8%)",
            opacity: 0.2,
            ease: "power2.out",
            scrollTrigger: { trigger: card, start: "top 90%", end: "top 40%", scrub: true },
          });
        });
      });
    },
    { scope: root },
  );

  return (
    <section id="craft" ref={root} className="relative overflow-hidden bg-ink md:h-[100svh]">
      <div ref={track} className="flex h-full flex-col gap-16 px-6 py-24 md:w-max md:flex-row md:items-center md:gap-[6vw] md:px-[8vw] md:py-0">
        <header className="max-w-md shrink-0 md:w-[30vw]">
          <p className="kicker mb-6">Chapter IV — The Craft</p>
          <h2 className="font-display text-5xl font-light leading-[1.02] md:text-7xl">
            Five layers.
            <br />
            <em className="gold-text">One ritual.</em>
          </h2>
          <p className="mt-6 text-cream/65 md:text-lg">
            Every Oldenland gift is opened slowly, layer by layer — the way the harvest itself unfolds.
          </p>
          <div className="hairline mt-10 w-40" />
        </header>

        {craft.map((c, i) => (
          <article key={c.name} className="craft-card relative shrink-0 md:w-[34vw]">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2px] bg-ink-3 md:h-[64svh] md:w-auto">
              <picture>
                <source media="(max-width: 767px)" srcSet={`/images/${c.image}-800.webp`} />
                <img
                  src={`/images/${c.image}-1600.webp`}
                  alt={`${c.name} — ${c.detail}`}
                  loading="lazy"
                  className="craft-img absolute inset-0 h-full w-full object-cover"
                />
              </picture>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-ink/20" />
              <span className="font-display absolute left-5 top-4 text-sm text-cream/70">0{i + 1}</span>
            </div>
            <div className="mt-6 md:max-w-[28vw]">
              <p className="craft-reveal kicker">{c.detail}</p>
              <h3 className="craft-reveal font-display mt-3 text-3xl font-light md:text-4xl">{c.name}</h3>
              <p className="craft-reveal mt-3 text-sm leading-relaxed text-cream/65 md:text-base">{c.text}</p>
            </div>
          </article>
        ))}
        <div className="hidden w-[4vw] shrink-0 md:block" />
      </div>
    </section>
  );
}
