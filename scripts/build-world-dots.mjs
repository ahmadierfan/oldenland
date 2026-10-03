// Builds public/data/world-dots.json: an evenly spaced grid of points that fall on land,
// used to draw the dotted export globe. Run with: node scripts/build-world-dots.mjs
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { feature } from "topojson-client";
import { geoContains } from "d3-geo";

const topo = JSON.parse(readFileSync(new URL("../node_modules/world-atlas/land-50m.json", import.meta.url)));
const land = feature(topo, topo.objects.land);

const STEP = 1.1; // degrees between rows
const dots = [];
for (let lat = -56; lat <= 80; lat += STEP) {
  const ring = Math.max(1, Math.round((360 * Math.cos((lat * Math.PI) / 180)) / STEP));
  for (let i = 0; i < ring; i++) {
    const lon = -180 + (i + 0.5) * (360 / ring);
    if (geoContains(land, [lon, lat])) dots.push(+lat.toFixed(2), +lon.toFixed(2));
  }
}
mkdirSync(new URL("../public/data/", import.meta.url), { recursive: true });
writeFileSync(new URL("../public/data/world-dots.json", import.meta.url), JSON.stringify(dots));
console.log(`${dots.length / 2} land dots`);
