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
  { label: "Unboxing", href: "#unboxing" },
  { label: "Craft", href: "#craft" },
  { label: "Saffron", href: "#saffron" },
  { label: "Export", href: "#export" },
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
    at: 0.73,
    until: 0.88,
    kicker: "Three threads",
    title: "Only three crimson stigmas per flower",
    body: "Separated one by one and slowly dried, they become the most precious spice on earth.",
    stat: { value: 150000, suffix: "+", label: "flowers for a single kilogram" },
  },
];

/** Captions for the scroll-scrubbed unboxing film. Ranges are frame indices (0–364). */
export const unboxingStages = [
  {
    from: 0,
    to: 28,
    index: "01",
    name: "The Carrier",
    title: "A kraft bag, tied in royal violet",
    body: "Natural fibre, silk-touch ribbon handles and the Oldenland emblem — the first promise of what is inside.",
  },
  {
    from: 28,
    to: 122,
    index: "02",
    name: "The Gift Box",
    title: "Lifted out, like an heirloom",
    body: "A rigid two-piece box wrapped in textured kraft, crowned with our violet saffron-flame emblem.",
  },
  {
    from: 122,
    to: 196,
    index: "03",
    name: "The Violet Case",
    title: "Open the lid. The colour of the flower.",
    body: "An inner case in deep crocus violet, lined with black foam that cradles the vessel in place.",
  },
  {
    from: 196,
    to: 300,
    index: "04",
    name: "The Crocus Crown",
    title: "A hand-made glass flower",
    body: "The stopper is a glass crocus — violet petals, green leaves — tied with a story card that tells you where your saffron was grown.",
  },
  {
    from: 300,
    to: 364,
    index: "05",
    name: "The Saffron",
    title: "And finally, the gold itself",
    body: "Deep red threads rest inside a hand-blown glass vessel — sealed, visible, and ready to be the centre of the table.",
  },
];

export const craft = [
  {
    image: "bag",
    name: "The Carrier",
    detail: "Kraft paper bag · violet ribbon handles",
    text: "Made to be carried through airports and given by hand. Sturdy, recyclable and unmistakably Oldenland.",
  },
  {
    image: "emblem",
    name: "The Gift Box",
    detail: "Rigid two-piece box · textured kraft wrap",
    text: "A heavy, structured box with a lift-off lid. The violet emblem traces a saffron flame.",
  },
  {
    image: "inner-case",
    name: "The Violet Case",
    detail: "Crocus-violet inner tray · foam cradle",
    text: "The moment the lid comes off, the box turns the colour of the flower itself.",
  },
  {
    image: "crocus-stopper",
    name: "The Crocus Crown",
    detail: "Hand-shaped glass flower stopper",
    text: "Every stopper is a small sculpture of the saffron crocus, made in glass, tied with natural twine.",
  },
  {
    image: "story-card",
    name: "The Story Card",
    detail: "Letterpress-style card · origin story",
    text: "A folded card that tells the story of the harvest and the land your saffron comes from.",
  },
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
