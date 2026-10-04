// All site copy lives here so it can be edited (or translated) without touching the scenes.

export const brand = {
  name: "OLDENLAND",
  domain: "oldenland.com",
  tagline: "Persian saffron, from the field to your hands.",
  email: "info@oldenland.com",
  phone: "+98 912 682 7703",
  phoneHref: "tel:+989126827703",
  origin: "Khorasan, Iran",
};

export const nav = [
  { label: "Story", href: "#origin" },
  { label: "Packaging", href: "#unboxing" },
  { label: "Export", href: "#world" },
  { label: "Saffron", href: "#saffron" },
];

/** Text beats over the 3D field. `at` / `until` are 0–1 positions in the Origin scroll. */
export const originBeats = [
  {
    at: 0.15,
    until: 0.3,
    kicker: "Chapter I — The Field",
    title: "Where the desert meets the mountains",
    body: "On the high plains of Khorasan the soil has carried saffron for three thousand years. Cold nights, dry days, and patient hands.",
  },
  {
    at: 0.34,
    until: 0.5,
    kicker: "Three weeks of violet",
    title: "Once a year, the land blooms",
    body: "Each autumn the fields wake for just a few weeks. Thousands of crocus flowers open at dawn, and by dusk they must be gathered.",
  },
  {
    at: 0.56,
    until: 0.7,
    kicker: "Chapter II — The Harvest",
    title: "Picked by hand, before sunrise",
    body: "Every flower is lifted from the earth by hand while its petals are still closed against the cold, then carried in baskets to the village.",
  },
  {
    at: 0.72,
    until: 0.84,
    kicker: "Three threads",
    title: "Only three crimson stigmas per flower",
    body: "Separated one by one and slowly dried, they become the most precious spice on earth.",
    stat: { value: 150000, suffix: "+", label: "flowers for a single kilogram" },
  },
];

/** Captions for the 3D unboxing. `at`/`until` are positions in the section's scroll (0–1). */
export const packagingBeats = [
  { at: 0.03, until: 0.15, index: "01", name: "The Carrier", title: "Waiting at the edge of the field", body: "A kraft bag, tied in royal violet — the first promise of what the harvest becomes." },
  { at: 0.18, until: 0.34, index: "02", name: "The Gift Box", title: "Lifted out, like an heirloom", body: "A rigid two-piece box wrapped in textured kraft." },
  { at: 0.36, until: 0.445, index: "03", name: "The Emblem", title: "A saffron flame, cut into the lid", body: "Our die-cut emblem reveals the violet beneath — the colour of the crocus itself." },
  { at: 0.46, until: 0.53, index: "04", name: "The Violet Case", title: "Open the lid. The colour of the flower.", body: "A deep violet case and a black foam cradle hold the vessel perfectly still." },
  { at: 0.535, until: 0.6, index: "05", name: "The Story Card", title: "Where your saffron was grown", body: "A kraft card, tied with natural twine, tells the story of the harvest." },
  { at: 0.605, until: 0.675, index: "06", name: "The Crocus Crown", title: "A flower, made in glass", body: "Every stopper is a hand-shaped glass crocus — violet petals, green leaves." },
  { at: 0.68, until: 0.79, index: "07", name: "The Vessel", title: "Hand-blown glass, sealed by hand", body: "The saffron rests inside a wide glass vessel, sealed until the moment it is opened." },
  { at: 0.83, until: 1.2, index: "08", name: "The Proof", title: "Two threads tell you everything", body: "Deep crimson from tip to base, flared trumpet ends, no pale style — the mark of Super Negin, Khorasan's finest cut. Keep scrolling to follow them to the world." },
];

/** Product specification. Values marked "confirm" should be checked against your lab reports. */
export const specs = [
  { label: "Origin", value: "Khorasan, Iran" },
  { label: "Cut", value: "Super Negin · Sargol (all-red)" },
  { label: "Harvest", value: "Hand-picked, Oct – Nov" },
  { label: "Drying", value: "Slow, traditional" },
  { label: "Grading", value: "ISO 3632 analysis on request" },
  { label: "Formats", value: "Luxury vessel · retail · bulk" },
];

export const exportPoints = [
  {
    title: "Private label",
    text: "Your brand on our packaging — or a bespoke vessel, box and bag designed for your market.",
  },
  {
    title: "Retail & bulk",
    text: "From single luxury gift vessels to bulk supply for distributors, hotels and fine-food retailers.",
  },
  {
    title: "Documentation",
    text: "Certificate of origin, phytosanitary certificate and laboratory analysis with every shipment.",
  },
  {
    title: "Worldwide shipping",
    text: "Air freight with tracked, temperature-aware handling. FOB, CIF or DDP terms on request.",
  },
];

/** Export routes on the globe. Edit to match the markets you actually ship to. */
export const exportOrigin = { city: "Mashhad", region: "Khorasan, Iran", lat: 36.3, lon: 59.6 };
export const markets = [
  { city: "Dubai", country: "United Arab Emirates", lat: 25.2, lon: 55.27 },
  { city: "Istanbul", country: "Türkiye", lat: 41.01, lon: 28.98 },
  { city: "Hamburg", country: "Germany", lat: 53.55, lon: 9.99 },
  { city: "London", country: "United Kingdom", lat: 51.51, lon: -0.13 },
  { city: "Madrid", country: "Spain", lat: 40.42, lon: -3.7 },
  { city: "New York", country: "United States", lat: 40.71, lon: -74.0 },
  { city: "Mumbai", country: "India", lat: 19.08, lon: 72.88 },
  { city: "Shanghai", country: "China", lat: 31.23, lon: 121.47 },
];
