import { brand, nav } from "@/lib/content";

export default function Footer() {
  return (
    <footer className="border-t border-gold/15 bg-ink px-6 pb-10 pt-24 md:px-16">
      <p className="font-display gold-text text-center text-[18vw] font-light leading-none tracking-[0.06em] md:text-[13vw]">
        OLDENLAND
      </p>
      <div className="mt-16 flex flex-col items-center justify-between gap-6 text-xs uppercase tracking-[0.25em] text-cream/45 md:flex-row">
        <p>© {new Date().getFullYear()} Oldenland · Persian saffron · {brand.origin}</p>
        <nav className="flex flex-wrap justify-center gap-6">
          {nav.map((n) => (
            <a key={n.href} href={n.href} className="transition-colors hover:text-gold">
              {n.label}
            </a>
          ))}
        </nav>
        <p>{brand.domain}</p>
      </div>
    </footer>
  );
}
