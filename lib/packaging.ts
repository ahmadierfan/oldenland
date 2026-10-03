import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Oldenland packaging, modelled from the reference photos in media/source.
 * Units: 1 = 10 cm. Every object sits on y = 0 in its own local frame.
 */

export const DIM = {
  box: { w: 1.42, base: 0.42, lid: 0.7, wall: 0.025 },
  case: { w: 1.33, h: 0.95, wall: 0.012, notchW: 0.42, notchD: 0.34 },
  foam: { h: 0.62, cavityR: 0.56, cavityDepth: 0.45 },
  bag: { w: 2.05, d: 1.62, h: 1.95 },
  jar: { r: 0.52 },
  card: { w: 0.42, h: 0.58 },
};

/* ------------------------------------------------------------------ */
/* Textures                                                            */
/* ------------------------------------------------------------------ */

export type BrandTextures = {
  kraft: THREE.Texture;
  kraftBump: THREE.Texture;
  lidTop: THREE.Texture;
  lidTopBump: THREE.Texture;
  bagFront: THREE.Texture;
  violetPaper: THREE.Texture;
  foam: THREE.Texture;
  cardFront: THREE.Texture;
  cardBack: THREE.Texture;
  seal: THREE.Texture;
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });

function canvas(w: number, h = w) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

function tex(c: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Grain noise used for paper and foam bump. */
function noiseCanvas(size: number, scale: number, base: number, amp: number) {
  const [c, ctx] = canvas(size);
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = base + (Math.random() - 0.5) * amp;
    img.data.set([v, v, v, 255], i * 4);
  }
  ctx.putImageData(img, 0, 0);
  if (scale > 0) {
    ctx.filter = `blur(${scale}px)`;
    ctx.drawImage(c, 0, 0);
    ctx.filter = "none";
  }
  return c;
}

/** Recolours an SVG emblem by replacing its fills. */
async function emblemImage(svg: string, violet: string, text: string | null) {
  let s = svg.replace(/#6a3db8/g, violet);
  s = text ? s.replace(/#2a1f14/g, text) : s.replace(/<g[^>]*fill="#2a1f14"[^>]*>[\s\S]*?<\/g>/, "");
  return loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`);
}

export async function loadBrandTextures(): Promise<BrandTextures> {
  const [kraftImg, svg] = await Promise.all([
    loadImage("/textures/kraft.jpg"),
    fetch("/textures/emblem.svg").then((r) => r.text()),
  ]);
  const [violetEmb, shadowEmb, maskEmb, tealEmb] = await Promise.all([
    emblemImage(svg, "#6236b4", "#2b2016"),
    emblemImage(svg, "#20103a", null),
    emblemImage(svg, "#000000", "#000000"),
    emblemImage(svg, "#2f8a8a", "#3a2b1c"),
  ]);

  // The photo's kraft reads too saturated under warm light; bring it back to a natural tan.
  const [kc, kctx] = canvas(1024);
  kctx.filter = "saturate(0.62) brightness(1.02)";
  kctx.drawImage(kraftImg, 0, 0, 1024, 1024);
  kctx.filter = "none";
  const kraft = new THREE.Texture(kc);
  kraft.colorSpace = THREE.SRGBColorSpace;
  kraft.wrapS = kraft.wrapT = THREE.MirroredRepeatWrapping;
  kraft.anisotropy = 8;
  kraft.needsUpdate = true;

  const [bc, bctx] = canvas(1024);
  bctx.filter = "grayscale(1) contrast(1.6)";
  bctx.drawImage(kraftImg, 0, 0, 1024, 1024);
  const kraftBump = tex(bc, false);
  kraftBump.wrapS = kraftBump.wrapT = THREE.MirroredRepeatWrapping;

  // Lid top: kraft with the die-cut emblem. The cut shows the violet case below,
  // with a soft shadow along the cut edge for depth.
  const S = 1024;
  const embH = S * 0.46;
  const embW = (embH * 800) / 1300;
  const ex = (S - embW) / 2;
  const ey = (S - embH) / 2 - S * 0.04;
  const [lc, lctx] = canvas(S);
  lctx.drawImage(kc, 0, 0, S, S);
  lctx.drawImage(shadowEmb, ex + 5, ey + 7, embW, embH);
  lctx.globalCompositeOperation = "source-over";
  lctx.drawImage(violetEmb, ex, ey, embW, embH);
  const lidTop = tex(lc);
  lidTop.center.set(0.5, 0.5);

  const [lb, lbctx] = canvas(S);
  lbctx.fillStyle = "#808080";
  lbctx.fillRect(0, 0, S, S);
  lbctx.globalAlpha = 0.25;
  lbctx.drawImage(bc, 0, 0, S, S);
  lbctx.globalAlpha = 1;
  lbctx.filter = "invert(1) brightness(0.35)";
  lbctx.drawImage(maskEmb, ex, ey, embW, embH);
  const lidTopBump = tex(lb, false);
  lidTopBump.center.set(0.5, 0.5);

  // Bag front: lighter, smoother kraft with a printed violet emblem.
  const [fc, fctx] = canvas(1024, 1024);
  fctx.filter = "brightness(1.1)";
  fctx.drawImage(kc, 0, 0, 1024, 1024);
  fctx.filter = "none";
  const bw = 300;
  const bh = (bw * 1300) / 800;
  fctx.drawImage(violetEmb, (1024 - bw) / 2, 330, bw, bh);
  const bagFront = tex(fc);

  // Violet paper
  const [vc, vctx] = canvas(512);
  vctx.fillStyle = "#5a2ea8";
  vctx.fillRect(0, 0, 512, 512);
  vctx.globalAlpha = 0.08;
  vctx.drawImage(noiseCanvas(512, 0.6, 128, 255), 0, 0);
  const violetPaper = tex(vc);

  const foam = tex(noiseCanvas(512, 0.8, 128, 255), false);
  foam.wrapS = foam.wrapT = THREE.RepeatWrapping;
  foam.repeat.set(3, 3);

  // Story card
  const CW = 600;
  const CH = Math.round((CW * DIM.card.h) / DIM.card.w);
  const [cf, cfx] = canvas(CW, CH);
  cfx.drawImage(kc, 0, 0, 700, 700, 0, 0, CW, CH);
  cfx.fillStyle = "rgba(255,240,210,0.18)";
  cfx.fillRect(0, 0, CW, CH);
  const tw = 170;
  const th = (tw * 1300) / 800;
  cfx.drawImage(tealEmb, (CW - tw) / 2, CH * 0.12, tw, th);
  cfx.fillStyle = "#3a2b1c";
  cfx.textAlign = "center";
  cfx.font = "italic 30px Georgia, serif";
  cfx.fillText("www.oldenland.com", CW / 2, CH * 0.82);
  cfx.font = "24px Georgia, serif";
  cfx.fillText("Persian saffron · Khorasan", CW / 2, CH * 0.88);
  // punched hole for the twine
  cfx.fillStyle = "#1a140e";
  cfx.beginPath();
  cfx.arc(CW * 0.12, CH * 0.07, 9, 0, Math.PI * 2);
  cfx.fill();
  const cardFront = tex(cf);

  const [cb, cbx] = canvas(CW, CH);
  cbx.drawImage(kc, 300, 300, 700, 700, 0, 0, CW, CH);
  cbx.fillStyle = "rgba(255,240,210,0.18)";
  cbx.fillRect(0, 0, CW, CH);
  drawCrocusSketch(cbx, CW / 2, CH * 0.5, CH * 0.36);
  cbx.fillStyle = "#3a2b1c";
  cbx.textAlign = "center";
  cbx.font = "italic 28px Georgia, serif";
  cbx.fillText("Hand-harvested at dawn", CW / 2, CH * 0.9);
  const cardBack = tex(cb);

  // Seal disc on the jar mouth: amber with a small teal mark.
  const [sc, sctx] = canvas(256);
  const g = sctx.createRadialGradient(128, 128, 10, 128, 128, 128);
  g.addColorStop(0, "#f0c993");
  g.addColorStop(1, "#c58a52");
  sctx.fillStyle = g;
  sctx.fillRect(0, 0, 256, 256);
  sctx.drawImage(tealEmb, 103, 88, 50, 81);
  const seal = tex(sc);

  return { kraft, kraftBump, lidTop, lidTopBump, bagFront, violetPaper, foam, cardFront, cardBack, seal };
}

/** A loose watercolour crocus for the back of the story card. */
function drawCrocusSketch(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = 0.85;
  const petal = (angle: number, len: number, wid: number, color: string) => {
    ctx.save();
    ctx.rotate(angle);
    const grad = ctx.createLinearGradient(0, 0, 0, -len);
    grad.addColorStop(0, "#e9dcf5");
    grad.addColorStop(1, color);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(wid, -len * 0.3, wid * 0.8, -len * 0.85, 0, -len);
    ctx.bezierCurveTo(-wid * 0.8, -len * 0.85, -wid, -len * 0.3, 0, 0);
    ctx.fill();
    ctx.restore();
  };
  [-0.9, -0.3, 0.3, 0.9].forEach((a, i) => petal(a, size * (i % 2 ? 0.95 : 0.8), size * 0.28, "#8a5cc8"));
  ctx.strokeStyle = "#b5180c";
  ctx.lineWidth = 3;
  [-0.25, 0, 0.25].forEach((a) => {
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.1);
    ctx.quadraticCurveTo(Math.sin(a) * size * 0.3, -size * 0.5, Math.sin(a) * size * 0.55, -size * 0.75);
    ctx.stroke();
  });
  ctx.strokeStyle = "#5c7a3a";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, size * 0.6);
  ctx.stroke();
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

/** An open box shell (no top), walls of thickness t. Origin at the bottom centre. */
export function openShell(w: number, d: number, h: number, t: number, bottom = true) {
  const parts: THREE.BufferGeometry[] = [];
  const add = (sx: number, sy: number, sz: number, x: number, y: number, z: number) => {
    const g = new THREE.BoxGeometry(sx, sy, sz);
    g.translate(x, y, z);
    parts.push(g);
  };
  if (bottom) add(w, t, d, 0, t / 2, 0);
  add(w, h, t, 0, h / 2, d / 2 - t / 2);
  add(w, h, t, 0, h / 2, -d / 2 + t / 2);
  add(t, h, d - 2 * t, w / 2 - t / 2, h / 2, 0);
  add(t, h, d - 2 * t, -w / 2 + t / 2, h / 2, 0);
  return mergeGeometries(parts)!;
}

/** A wall with a rounded U-notch cut into its top edge (the violet case's thumb notch). */
export function notchedWall(w: number, h: number, t: number, notchW: number, notchD: number) {
  const s = new THREE.Shape();
  const r = notchW / 2;
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(w / 2, h);
  s.lineTo(r, h);
  s.lineTo(r, h - notchD + r);
  s.absarc(0, h - notchD + r, r, 0, Math.PI, true);
  s.lineTo(-r, h);
  s.lineTo(-w / 2, h);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 24 });
  g.translate(0, 0, -t / 2);
  return g;
}

/** Foam block with a round cavity, as an extruded square-with-hole. */
export function foamBlock(w: number, h: number, cavityR: number, cavityDepth: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, -w / 2);
  s.lineTo(w / 2, -w / 2);
  s.lineTo(w / 2, w / 2);
  s.lineTo(-w / 2, w / 2);
  s.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 0, cavityR, 0, Math.PI * 2, false);
  s.holes.push(hole);
  const top = new THREE.ExtrudeGeometry(s, { depth: cavityDepth, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 64 });
  top.rotateX(-Math.PI / 2);
  top.translate(0, h - cavityDepth, 0);
  const below = new THREE.BoxGeometry(w, h - cavityDepth, w);
  below.translate(0, (h - cavityDepth) / 2, 0);
  return mergeGeometries([top.toNonIndexed(), below.toNonIndexed()])!;
}

/** The saffron vessel: a wide, flattened hand-blown glass body with a short neck. */
export function jarGeometry() {
  const pts = [
    [0.0, 0.004],
    [0.22, 0.0],
    [0.38, 0.012],
    [0.47, 0.04],
    [0.515, 0.085],
    [0.52, 0.12],
    [0.495, 0.165],
    [0.42, 0.215],
    [0.29, 0.255],
    [0.16, 0.278],
    [0.115, 0.292],
    [0.105, 0.33],
    [0.108, 0.37],
    [0.13, 0.385],
    [0.142, 0.392],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const curve = new THREE.SplineCurve(pts);
  return new THREE.LatheGeometry(curve.getPoints(80), 96);
}

/** The small clear bulb under the glass crocus, plus a plug that sits in the jar neck. */
export function stopperBulbGeometry() {
  const pts = [
    [0.0, -0.06],
    [0.085, -0.06],
    [0.088, 0.0],
    [0.12, 0.02],
    [0.155, 0.06],
    [0.15, 0.1],
    [0.11, 0.135],
    [0.05, 0.155],
    [0.03, 0.17],
    [0.0, 0.175],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(new THREE.SplineCurve(pts).getPoints(48), 64);
}

/** A solid lampworked glass petal: a sphere stretched into a pointed, cupped leaf. */
export function glassPetal(length: number, width: number, thick: number, cup = 0.35) {
  const g = new THREE.SphereGeometry(1, 32, 24);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const t = (y + 1) / 2; // 0 base .. 1 tip
    const prof = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 0.75) * (0.45 + 0.55 * Math.min(1, t * 2.4));
    const px = x * width * 0.5 * prof;
    const pz = z * thick * 0.5 * prof - cup * width * 0.5 * (x * x) * prof + 0.12 * length * t * t;
    pos.setXYZ(i, px, t * length, pz);
  }
  g.computeVertexNormals();
  return g;
}

/** A flat ribbon following a curve (bag handles). */
export function ribbonGeometry(curve: THREE.Curve<THREE.Vector3>, width: number, segments = 64) {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const frames = curve.computeFrenetFrames(segments, false);
  for (let i = 0; i <= segments; i++) {
    const p = curve.getPointAt(i / segments);
    // Width runs along the curve's in-plane normal so the flat face looks outward, like a handle.
    const n = frames.normals[i];
    const b = frames.binormals[i];
    for (const side of [-1, 1]) {
      positions.push(p.x + n.x * side * width * 0.5, p.y + n.y * side * width * 0.5, p.z + n.z * side * width * 0.5);
      normals.push(b.x, b.y, b.z);
    }
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  g.setIndex(indices);
  return g;
}

/** Saffron threads: thin curled trumpets, red with a lighter style at the base. */
export function saffronThreadGeometry(seed: number) {
  const r = (n: number) => Math.sin(seed * 91.7 + n * 13.3) * 0.5 + 0.5;
  const len = 0.13 + r(1) * 0.1;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(len * 0.33, (r(2) - 0.5) * 0.012, (r(3) - 0.5) * 0.06),
    new THREE.Vector3(len * 0.66, (r(4) - 0.5) * 0.016, (r(5) - 0.5) * 0.08),
    new THREE.Vector3(len, (r(6) - 0.5) * 0.012, (r(7) - 0.5) * 0.06),
  ]);
  const g = new THREE.TubeGeometry(curve, 14, 0.0022, 4, false);
  const pos = g.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const base = new THREE.Color("#c98a3a");
  const red = new THREE.Color("#5e0704");
  const tip = new THREE.Color("#8a0f06");
  const p = new THREE.Vector3();
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const t = THREE.MathUtils.clamp(p.x / len, 0, 1);
    const centre = curve.getPoint(t);
    const flare = 1 + 1.4 * THREE.MathUtils.smoothstep(t, 0.75, 1);
    pos.setXYZ(i, centre.x + (p.x - centre.x) * flare, centre.y + (p.y - centre.y) * flare, centre.z + (p.z - centre.z) * flare);
    c.copy(base).lerp(red, THREE.MathUtils.smoothstep(t, 0.0, 0.08)).lerp(tip, THREE.MathUtils.smoothstep(t, 0.8, 1));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

/** Bag body: front/back panels, gusseted sides that fold inward, and a base. */
export function bagParts() {
  const { w, d, h } = DIM.bag;
  const t = 0.008;
  const fold = 0.12;
  const sides: THREE.BufferGeometry[] = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      // half of a side panel, from the corner to the inward crease
      const a = new THREE.Vector3((sx * w) / 2, 0, (sz * d) / 2);
      const b = new THREE.Vector3(sx * (w / 2 - fold), 0, 0);
      const len = a.distanceTo(b);
      const g = new THREE.BoxGeometry(t, h, len);
      const mid = a.clone().add(b).multiplyScalar(0.5);
      const ang = Math.atan2(b.x - a.x, b.z - a.z);
      g.rotateY(ang);
      g.translate(mid.x, h / 2, mid.z);
      sides.push(g);
    }
  }
  const front = new THREE.PlaneGeometry(w, h);
  front.translate(0, h / 2, d / 2);
  const back = new THREE.PlaneGeometry(w, h);
  back.rotateY(Math.PI);
  back.translate(0, h / 2, -d / 2);
  const bottom = new THREE.BoxGeometry(w, t, d);
  bottom.translate(0, t / 2, 0);
  // Turned-over hem inside the top edge
  const hem = openShell(w - 0.02, d - 0.02, 0.09, 0.006, false);
  hem.translate(0, h - 0.09, 0);
  return { front, back, sides: mergeGeometries(sides)!, bottom, hem };
}

/**
 * A single show-quality saffron thread for close-ups: a thin pale-orange style at the base,
 * a long deep-crimson stigma, and the flared, slightly frilled trumpet tip of a top grade thread.
 * Runs along +z, base at the origin.
 */
export function heroThreadGeometry(seed: number) {
  const r = (n: number) => Math.sin(seed * 57.3 + n * 19.1) * 0.5 + 0.5;
  const len = 0.26;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.012 + (r(1) - 0.5) * 0.02, (r(2) - 0.5) * 0.015, len * 0.28),
    new THREE.Vector3(-0.01 + (r(3) - 0.5) * 0.03, 0.018 + (r(4) - 0.5) * 0.015, len * 0.6),
    new THREE.Vector3(0.008 + (r(5) - 0.5) * 0.02, 0.03, len * 0.84),
    new THREE.Vector3((r(6) - 0.5) * 0.02, 0.026, len),
  ]);
  const radial = 10;
  const tubular = 90;
  const g = new THREE.TubeGeometry(curve, tubular, 1, radial, false);
  const pos = g.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const style = new THREE.Color("#e0973c");
  const crimson = new THREE.Color("#6d0804");
  const tip = new THREE.Color("#9c1309");
  const c = new THREE.Color();
  const p = new THREE.Vector3();
  const centre = new THREE.Vector3();
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular;
    curve.getPointAt(t, centre);
    // radius: hair-thin style, a slowly widening stigma, then the open trumpet
    const radius =
      0.0016 +
      0.0013 * THREE.MathUtils.smoothstep(t, 0.08, 0.75) +
      0.0055 * Math.pow(THREE.MathUtils.smoothstep(t, 0.8, 1), 1.8);
    c.copy(style).lerp(crimson, THREE.MathUtils.smoothstep(t, 0.04, 0.14)).lerp(tip, THREE.MathUtils.smoothstep(t, 0.85, 1));
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      p.fromBufferAttribute(pos, k).sub(centre); // unit-radius offset from the centre line
      const frill = 1 + 0.18 * Math.sin((j / radial) * Math.PI * 2 * 5) * THREE.MathUtils.smoothstep(t, 0.93, 1);
      p.multiplyScalar(radius * frill).add(centre);
      pos.setXYZ(k, p.x, p.y, p.z);
      colors.set([c.r, c.g, c.b], k * 3);
    }
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}
