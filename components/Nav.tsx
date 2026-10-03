"use client";

import { useEffect, useRef, useState } from "react";
import { nav } from "@/lib/content";

export default function Nav() {
  const bar = useRef<HTMLDivElement>(null);
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
      setSolid(window.scrollY > 80);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 bg-gradient-to-b from-ink/90 to-ink/0 transition-[background-color] duration-700 ${
        solid ? "bg-ink/70" : ""
      }`}
    >
      <div className="flex items-center justify-between px-6 py-5 md:px-12">
        <a href="#origin" className="font-display text-xl tracking-[0.3em] text-cream" aria-label="Oldenland — home">
          OLDENLAND
        </a>
        <nav className="hidden items-center gap-10 md:flex">
          {nav.map((n) => (
            <a key={n.href} href={n.href} className="text-[0.7rem] uppercase tracking-[0.3em] text-cream/70 transition-colors hover:text-gold">
              {n.label}
            </a>
          ))}
          <a href="#contact" className="border border-gold/60 px-5 py-2.5 text-[0.7rem] uppercase tracking-[0.3em] text-gold transition-colors hover:bg-gold hover:text-ink">
            Request a quote
          </a>
        </nav>
        <button className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>
          <span className={`h-px w-6 bg-cream transition-transform ${open ? "translate-y-[3.5px] rotate-45" : ""}`} />
          <span className={`h-px w-6 bg-cream transition-transform ${open ? "-translate-y-[3.5px] -rotate-45" : ""}`} />
        </button>
      </div>
      <div className="h-px bg-cream/5">
        <div ref={bar} className="h-full origin-left scale-x-0 bg-gold/80" />
      </div>
      {open && (
        <nav className="flex flex-col gap-6 bg-ink px-6 py-10 md:hidden" onClick={() => setOpen(false)}>
          {[...nav, { label: "Request a quote", href: "#contact" }].map((n) => (
            <a key={n.href + n.label} href={n.href} className="font-display text-3xl text-cream">
              {n.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
