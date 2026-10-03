"use client";

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { brand, exportPoints } from "@/lib/content";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Chapter VI: for importers and distributors, plus the quote request. */
export default function Export() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.to(".marquee-inner", {
        xPercent: -50,
        ease: "none",
        scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: 1 },
      });
      gsap.from(".export-card", {
        y: 60,
        opacity: 0,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: { trigger: ".export-grid", start: "top 85%", end: "top 45%", scrub: 1 },
      });
    },
    { scope: root },
  );

  return (
    <section id="export" ref={root} className="relative overflow-hidden bg-ink-2">
      <div className="border-y border-gold/15 py-6">
        <div className="marquee-inner font-display flex w-max gap-12 whitespace-nowrap text-5xl font-light italic text-cream/20 md:text-8xl">
          {Array.from({ length: 2 }, (_, k) => (
            <span key={k} className="flex gap-12">
              <span>From Khorasan to the world</span>
              <span className="text-gold/50">✦</span>
              <span>Hand-harvested</span>
              <span className="text-gold/50">✦</span>
              <span>Sealed in glass</span>
              <span className="text-gold/50">✦</span>
            </span>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-28 md:px-16 md:py-40">
        <div>
          <div>
            <p className="kicker mb-6">Chapter VI — Partnership</p>
            <h2 className="font-display text-5xl font-light leading-[1.02] md:text-7xl">
              Built for importers
              <br />
              <em className="gold-text">who sell luxury.</em>
            </h2>
            <p className="mt-6 max-w-lg text-cream/65 md:text-lg">
              We work with distributors, fine-food retailers, hotels and gifting companies — supplying saffron that looks
              as precious on the shelf as it tastes in the kitchen.
            </p>
          </div>
        </div>

        <div className="export-grid mt-20 grid border-t border-gold/15 sm:grid-cols-2 lg:grid-cols-4">
          {exportPoints.map((e, i) => (
            <div key={e.title} className="export-card border-b border-gold/15 py-8 sm:px-8 lg:border-b-0 lg:border-r lg:last:border-r-0">
              <p className="font-display gold-text text-4xl">0{i + 1}</p>
              <h3 className="font-display mt-6 text-2xl">{e.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-cream/60">{e.text}</p>
            </div>
          ))}
        </div>
      </div>

      <Contact />
    </section>
  );
}

function Contact() {
  const [sent, setSent] = useState(false);

  // Static site: compose an email to the export desk with the form contents.
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const body = [
      `Name: ${d.get("name")}`,
      `Company: ${d.get("company")}`,
      `Country: ${d.get("country")}`,
      `Email: ${d.get("email")}`,
      `Interest: ${d.get("interest")}`,
      `Estimated volume: ${d.get("volume")}`,
      "",
      String(d.get("message") || ""),
    ].join("\n");
    window.location.href = `mailto:${brand.email}?subject=${encodeURIComponent(
      `Quote request — ${d.get("company") || d.get("name")}`,
    )}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  const field =
    "w-full border-0 border-b border-cream/20 bg-transparent px-0 py-3 text-cream placeholder:text-cream/30 focus:border-gold focus:outline-none focus:ring-0 transition-colors";

  return (
    <div id="contact" className="relative border-t border-gold/15">
      <div className="mx-auto grid max-w-7xl gap-16 px-6 py-28 md:grid-cols-[1fr_1.2fr] md:px-16 md:py-40">
        <div>
          <p className="kicker mb-6">Request a quote</p>
          <h2 className="font-display text-5xl font-light leading-[1.02] md:text-6xl">
            Let&apos;s bring Oldenland
            <br />
            <em className="gold-text">to your market.</em>
          </h2>
          <p className="mt-6 max-w-md text-cream/65">
            Tell us what you need — formats, volumes, private label — and our export desk will reply within one business day.
          </p>
          <div className="mt-12 space-y-4 text-sm">
            <a href={`mailto:${brand.email}`} className="block text-cream/80 transition-colors hover:text-gold">
              {brand.email}
            </a>
            <a href={brand.phoneHref} className="block text-cream/80 transition-colors hover:text-gold">
              {brand.phone}
            </a>
            <p className="text-cream/50">{brand.origin}</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="grid gap-8 sm:grid-cols-2">
          <input required name="name" placeholder="Full name" className={field} />
          <input name="company" placeholder="Company" className={field} />
          <input required type="email" name="email" placeholder="Email" className={field} />
          <input name="country" placeholder="Country" className={field} />
          <select name="interest" defaultValue="Luxury gift vessels" className={`${field} [&>option]:bg-ink`}>
            <option>Luxury gift vessels</option>
            <option>Retail packs</option>
            <option>Bulk saffron</option>
            <option>Private label</option>
          </select>
          <input name="volume" placeholder="Estimated volume (e.g. 5 kg / month)" className={field} />
          <textarea name="message" rows={4} placeholder="Message" className={`${field} resize-none sm:col-span-2`} />
          <div className="flex items-center gap-6 sm:col-span-2">
            <button
              type="submit"
              className="group relative overflow-hidden border border-gold px-10 py-4 text-xs uppercase tracking-[0.3em] text-gold transition-colors duration-500 hover:text-ink"
            >
              <span className="absolute inset-0 -translate-x-full bg-gold transition-transform duration-500 ease-out group-hover:translate-x-0" />
              <span className="relative">Send request</span>
            </button>
            {sent && <p className="text-sm text-cream/60">Your email app has opened with the request — just press send.</p>}
          </div>
        </form>
      </div>
    </div>
  );
}
