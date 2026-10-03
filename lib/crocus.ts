import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Procedural saffron crocus (Crocus sativus).
 * Local frame: stem along +Y, a petal's outer face points +Z before it is spun around the stem.
 */

export const PETAL_BASE_Y = 0.085;

const C = (hex: string) => new THREE.Color(hex);
const PETAL_BASE = C("#f6efff");
const PETAL_MID = C("#b48ce6");
const PETAL_TIP = C("#7a48c0");
const VEIN = C("#3f1d73");

function paint(geo: THREE.BufferGeometry, color: (y: number, i: number) => THREE.Color) {
  const pos = geo.attributes.position;
  const arr = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const c = color(pos.getY(i), i);
    arr.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  return geo;
}

/** A cupped, pointed petal whose base sits at the origin and which grows along +Y. */
export function petalGeometry(length: number, width: number, detail: [number, number] = [6, 12]) {
  const geo = new THREE.PlaneGeometry(1, 1, detail[0], detail[1]);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) * 2; // -1..1 across
    const v = pos.getY(i) + 0.5; // 0..1 along
    const taper = Math.pow(Math.sin(Math.PI * (0.04 + 0.92 * v)), 0.55);
    const neck = 0.3 + 0.7 * THREE.MathUtils.smoothstep(v, 0, 0.32);
    const w = width * taper * neck;
    const x = u * w * 0.5;
    const y = v * length;
    // Cup toward the flower centre (-Z) and curl the tip slightly outward (+Z).
    const z = -0.5 * w * u * u + 0.22 * length * v * v * v;
    pos.setXYZ(i, x, y, z);

    tmp.copy(PETAL_BASE).lerp(PETAL_MID, THREE.MathUtils.smoothstep(v, 0.02, 0.45));
    tmp.lerp(PETAL_TIP, THREE.MathUtils.smoothstep(v, 0.45, 1) * 0.85);
    const vein = Math.pow(Math.abs(Math.cos(u * Math.PI * 3.5)), 14) * 0.25 * THREE.MathUtils.smoothstep(v, 0.1, 0.6);
    tmp.lerp(VEIN, vein);
    colors.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

/** A thin curved thread: used for the three red stigmas and the yellow stamens. */
export function threadGeometry(
  length: number,
  radius: number,
  outward: number,
  colors: [string, string],
  detail: [number, number] = [16, 5],
) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, length * 0.45, outward * 0.25),
    new THREE.Vector3(0, length * 0.85, outward * 0.75),
    new THREE.Vector3(0, length, outward * 1.15),
  ]);
  const geo = new THREE.TubeGeometry(curve, detail[0], radius, detail[1], false);
  // Flare the tip like a real stigma.
  const pos = geo.attributes.position;
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const t = p.y / length;
    const flare = 1 + 1.1 * THREE.MathUtils.smoothstep(t, 0.72, 1);
    const centre = curve.getPoint(THREE.MathUtils.clamp(t, 0, 1));
    p.x = centre.x + (p.x - centre.x) * flare;
    p.z = centre.z + (p.z - centre.z) * flare;
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  geo.computeVertexNormals();
  const a = C(colors[0]);
  const b = C(colors[1]);
  return paint(geo, (y) => a.clone().lerp(b, THREE.MathUtils.clamp(y / length, 0, 1)));
}

export function stemGeometry(height: number, radial = 6) {
  const geo = new THREE.CylinderGeometry(0.009, 0.013, height, radial, 1, true);
  geo.translate(0, height / 2, 0);
  const a = C("#9fb07c");
  const b = C("#e6ead2");
  return paint(geo, (y) => a.clone().lerp(b, y / height));
}

export type FlowerOptions = {
  open: number; // radians each petal leans outward
  scale?: number;
  lowPoly?: boolean;
};

/** A complete flower merged into one geometry, for use in an InstancedMesh. */
export function flowerGeometry({ open, lowPoly = true }: FlowerOptions) {
  const parts: THREE.BufferGeometry[] = [];
  const petalDetail: [number, number] = lowPoly ? [4, 7] : [6, 12];
  const threadDetail: [number, number] = lowPoly ? [6, 3] : [16, 5];

  parts.push(stemGeometry(PETAL_BASE_Y, lowPoly ? 4 : 8));

  for (let i = 0; i < 6; i++) {
    const inner = i % 2 === 1;
    const g = petalGeometry(inner ? 0.16 : 0.175, inner ? 0.1 : 0.11, petalDetail);
    const m = new THREE.Matrix4()
      .makeTranslation(0, PETAL_BASE_Y, 0)
      .multiply(new THREE.Matrix4().makeRotationY((i / 6) * Math.PI * 2))
      .multiply(new THREE.Matrix4().makeTranslation(0, 0, inner ? 0.006 : 0.012))
      .multiply(new THREE.Matrix4().makeRotationX(open * (inner ? 0.85 : 1)));
    g.applyMatrix4(m);
    parts.push(g);
  }

  for (let i = 0; i < 3; i++) {
    const g = threadGeometry(0.15, 0.0045, 0.025, ["#e9b85a", "#b3180c"], threadDetail);
    g.applyMatrix4(
      new THREE.Matrix4()
        .makeTranslation(0, PETAL_BASE_Y, 0)
        .multiply(new THREE.Matrix4().makeRotationY((i / 3) * Math.PI * 2 + 0.3)),
    );
    parts.push(g);
  }

  return mergeGeometries(parts.map((p) => p.toNonIndexed()), false)!;
}

/** A single crocus leaf: a long thin blade, slightly arched. */
export function leafGeometry() {
  const geo = new THREE.PlaneGeometry(1, 1, 1, 4);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) * 2;
    const v = pos.getY(i) + 0.5;
    const w = 0.012 * (1 - v * 0.85);
    pos.setXYZ(i, u * w * 0.5, v * 0.32, 0.06 * v * v);
  }
  geo.computeVertexNormals();
  const a = C("#1d2e15");
  const b = C("#58783a");
  return paint(geo, (y) => a.clone().lerp(b, y / 0.32));
}

/** Adds a gentle wind sway to instanced vegetation. Higher vertices move more. */
export function addWind(material: THREE.Material, uniforms: { uTime: { value: number } }, strength = 0.6) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        {
          float h = max(position.y, 0.0);
          vec3 root = vec3(0.0);
          #ifdef USE_INSTANCING
            root = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          #endif
          // A light dawn breeze: slow, small, with occasional soft gusts rolling across the field.
          float gust = smoothstep(0.55, 1.0, sin(uTime * 0.35 + root.x * 0.08 + root.z * 0.05) * 0.5 + 0.5);
          float sway = sin(uTime * 0.9 + root.x * 1.3 + root.z * 0.9) * (0.35 + gust * 0.65);
          transformed.x += sway * h * h * ${strength.toFixed(3)} * 1.6;
          transformed.z += cos(uTime * 0.7 + root.z * 1.1) * h * h * ${strength.toFixed(3)} * 0.7;
        }`,
      );
  };
  material.customProgramCacheKey = () => `wind-${strength}`;
  return material;
}
