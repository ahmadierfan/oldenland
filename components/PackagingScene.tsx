"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import * as THREE from "three";
import {
  DIM,
  type BrandTextures,
  bagParts,
  foamBlock,
  glassPetal,
  jarGeometry,
  loadBrandTextures,
  notchedWall,
  openShell,
  ribbonGeometry,
  saffronThreadGeometry,
  stopperBulbGeometry,
} from "@/lib/packaging";

type Progress = { current: number };

/* ------------------------------------------------------------------ */
/* Timeline helpers                                                     */
/* ------------------------------------------------------------------ */

const ss = (p: number, a: number, b: number) => THREE.MathUtils.smootherstep(p, a, b);
const lerp = THREE.MathUtils.lerp;

/** Scroll positions (0–1) of each beat of the unboxing. */
/** The unboxing plays over the first part of the scroll; the saffron finale takes the rest. */
const UNBOX_END = 0.8;
const FINALE = { seal: [0.81, 0.87] as const, stream: [0.84, 0.99] as const };

export const T = {
  boxRise: [0.1, 0.26] as const,
  bagAway: [0.24, 0.34] as const,
  boxDown: [0.3, 0.4] as const,
  boxTurn: [0.36, 0.48] as const,
  lidOff: [0.46, 0.58] as const,
  cardOut: [0.58, 0.68] as const,
  crownUp: [0.68, 0.79] as const,
  jarUp: [0.79, 0.9] as const,
};

/* ------------------------------------------------------------------ */
/* Materials                                                            */
/* ------------------------------------------------------------------ */

function useMaterials(tx: BrandTextures) {
  return useMemo(() => {
    const kraft = (repeat = 1, offset = 0) => {
      const map = tx.kraft.clone();
      map.repeat.set(repeat, repeat);
      map.offset.set(offset, offset * 0.7);
      map.needsUpdate = true;
      return new THREE.MeshStandardMaterial({
        map,
        bumpMap: tx.kraftBump,
        bumpScale: 0.6,
        roughness: 0.9,
        color: "#efe4d2",
      });
    };
    const glass = new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      transmission: 1,
      thickness: 0.06,
      roughness: 0.03,
      ior: 1.5,
      specularIntensity: 1,
      envMapIntensity: 1.4,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      side: THREE.DoubleSide,
    });
    const tintedGlass = (color: string, attenuation: string) =>
      new THREE.MeshPhysicalMaterial({
        color,
        transmission: 0.55,
        thickness: 0.08,
        roughness: 0.08,
        ior: 1.5,
        attenuationColor: new THREE.Color(attenuation),
        attenuationDistance: 0.05,
        emissive: new THREE.Color(attenuation),
        emissiveIntensity: 0.12,
        envMapIntensity: 1.5,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
      });
    return {
      kraftOuter: kraft(1, 0.1),
      kraftLidSide: kraft(1, 0.3),
      kraftInner: (() => {
        const m = kraft(1.4, 0.5);
        m.color.set("#d9c39c");
        return m;
      })(),
      lidTop: new THREE.MeshStandardMaterial({
        color: "#efe4d2",
        map: tx.lidTop,
        bumpMap: tx.lidTopBump,
        bumpScale: 2.5,
        roughness: 0.86,
      }),
      bag: (() => {
        const m = kraft(1.2, 0.2);
        m.color.set("#f6eee0");
        m.side = THREE.DoubleSide;
        return m;
      })(),
      bagFront: new THREE.MeshStandardMaterial({ color: "#f6eee0", map: tx.bagFront, roughness: 0.85, bumpMap: tx.kraftBump, bumpScale: 0.4 }),
      ribbon: new THREE.MeshPhysicalMaterial({
        color: "#4b1f8f",
        roughness: 0.35,
        sheen: 1,
        sheenColor: new THREE.Color("#b58cff"),
        sheenRoughness: 0.3,
        side: THREE.DoubleSide,
      }),
      violet: new THREE.MeshStandardMaterial({ map: tx.violetPaper, roughness: 0.7, side: THREE.DoubleSide }),
      foam: new THREE.MeshStandardMaterial({ color: "#121214", roughness: 1, bumpMap: tx.foam, bumpScale: 3 }),
      glass,
      violetGlass: tintedGlass("#8f6be6", "#5a2fb0"),
      pinkGlass: tintedGlass("#f0cdeb", "#c98bd8"),
      greenGlass: tintedGlass("#8fd07a", "#2f7a2a"),
      clearGlass: tintedGlass("#ffffff", "#ffffff"),
      seal: new THREE.MeshPhysicalMaterial({ map: tx.seal, color: "#b9a58c", roughness: 0.35, clearcoat: 1, transmission: 0.25, thickness: 0.01 }),
      saffron: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78 }),
      twine: new THREE.MeshStandardMaterial({ color: "#b48d5e", roughness: 0.95 }),
      cardFront: new THREE.MeshStandardMaterial({ map: tx.cardFront, roughness: 0.85 }),
      cardBack: new THREE.MeshStandardMaterial({ map: tx.cardBack, roughness: 0.85 }),
      cardEdge: new THREE.MeshStandardMaterial({ color: "#c9a878", roughness: 0.9 }),
      floor: new THREE.MeshStandardMaterial({ color: "#030303", roughness: 0.55, metalness: 0.0 }),
    };
  }, [tx]);
}

type Mats = ReturnType<typeof useMaterials>;

/* ------------------------------------------------------------------ */
/* Objects                                                              */
/* ------------------------------------------------------------------ */

function Bag({ m }: { m: Mats }) {
  const parts = useMemo(() => bagParts(), []);
  const handle = useMemo(() => {
    const { w, d, h } = DIM.bag;
    const make = (z: number) =>
      ribbonGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(-w * 0.2, h - 0.12, z),
          new THREE.Vector3(-w * 0.2, h + 0.14, z),
          new THREE.Vector3(-w * 0.13, h + 0.4, z),
          new THREE.Vector3(0, h + 0.48, z),
          new THREE.Vector3(w * 0.13, h + 0.4, z),
          new THREE.Vector3(w * 0.2, h + 0.14, z),
          new THREE.Vector3(w * 0.2, h - 0.12, z),
        ]),
        0.1,
        96,
      );
    return [make(d / 2 + 0.006), make(-d / 2 - 0.006)];
  }, []);
  return (
    <group>
      <mesh geometry={parts.front} material={m.bagFront} castShadow receiveShadow />
      <mesh geometry={parts.back} material={m.bag} castShadow receiveShadow />
      <mesh geometry={parts.sides} material={m.bag} castShadow receiveShadow />
      <mesh geometry={parts.bottom} material={m.bag} receiveShadow />
      <mesh geometry={parts.hem} material={m.bag} />
      {handle.map((g, i) => (
        <mesh key={i} geometry={g} material={m.ribbon} castShadow />
      ))}
    </group>
  );
}

function Saffron({ m, count }: { m: Mats; count: number }) {
  const variants = useMemo(() => [1, 2, 3, 4].map((s) => saffronThreadGeometry(s)), []);
  const refs = useRef<(THREE.InstancedMesh | null)[]>([]);
  useEffect(() => {
    const rnd = mulberry(11);
    const o = new THREE.Object3D();
    const per = Math.ceil(count / variants.length);
    const R = 0.44; // usable inner radius of the vessel
    const floor = (r: number) => 0.014 + 0.02 * (r / R) ** 2; // the base curves up toward the wall
    const ceil = (r: number) => 0.2 * Math.sqrt(Math.max(0, 1 - (r / 0.5) ** 2));
    refs.current.forEach((mesh, v) => {
      if (!mesh) return;
      variants[v].computeBoundingBox();
      const len = variants[v].boundingBox!.max.x;
      for (let i = 0; i < per; i++) {
        const sc = 0.8 + rnd() * 0.35;
        const l = len * sc;
        // Start somewhere in the pile, then aim the thread so that it also ends inside the glass.
        const r0 = (R - 0.02) * Math.sqrt(rnd());
        const a0 = rnd() * Math.PI * 2;
        const sx = Math.cos(a0) * r0;
        const sz = Math.sin(a0) * r0;
        let dir = rnd() * Math.PI * 2;
        for (let k = 0; k < 8; k++) {
          const ex = sx + Math.cos(dir) * l;
          const ez = sz - Math.sin(dir) * l;
          if (Math.hypot(ex, ez) < R) break;
          dir = Math.atan2(sz, -sx) + (rnd() - 0.5) * 1.2; // point back toward the centre
        }
        const rMax = Math.max(r0, Math.hypot(sx + Math.cos(dir) * l, sz - Math.sin(dir) * l));
        // Pile is deepest in the middle, a thin layer near the wall.
        const h = Math.max(0, ceil(rMax) * 0.78 - floor(rMax) - 0.02);
        o.position.set(sx, floor(rMax) + 0.012 + Math.pow(rnd(), 1.3) * h, sz);
        o.rotation.set((rnd() - 0.5) * 0.5, dir, (rnd() - 0.5) * 0.25);
        o.scale.setScalar(sc);
        o.updateMatrix();
        mesh.setMatrixAt(i, o.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    });
  }, [count, variants]);
  return (
    <>
      {variants.map((g, i) => (
        <instancedMesh
          key={i}
          ref={(el) => void (refs.current[i] = el)}
          args={[g, m.saffron, Math.ceil(count / variants.length)]}
          castShadow
        />
      ))}
    </>
  );
}

function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function Jar({ m, saffron, finale }: { m: Mats; saffron: number; finale: Finale }) {
  const body = useMemo(() => jarGeometry(), []);
  const sealRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const k = finale.seal;
    if (!sealRef.current) return;
    // The seal lifts, flips and drifts off to the side, opening the vessel.
    sealRef.current.position.set(lerp(0, -0.55, k), 0.392 + lerp(0, 0.55, Math.sin(k * Math.PI * 0.6)), lerp(0, 0.25, k));
    sealRef.current.rotation.set(lerp(0, 2.4, k), 0, lerp(0, 0.6, k));
    sealRef.current.visible = k < 0.999;
  });
  return (
    <group>
      <Saffron m={m} count={saffron} />
      <SaffronStream m={m} finale={finale} count={240} />
      <mesh geometry={body} material={m.glass} renderOrder={2} />
      <mesh ref={sealRef} position={[0, 0.392, 0]} material={m.seal}>
        <cylinderGeometry args={[0.15, 0.15, 0.012, 48]} />
      </mesh>
    </group>
  );
}

type Finale = { seal: number; stream: number };

/**
 * The finale: threads rise one after another out of the neck and spiral outward into a slow,
 * floating crimson halo around the vessel.
 */
function SaffronStream({ m, finale, count }: { m: Mats; finale: Finale; count: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => {
    const g = saffronThreadGeometry(7).clone();
    g.rotateY(-Math.PI / 2); // thread runs along +z, so lookAt() aims it along its path
    g.scale(0.85, 0.85, 0.85);
    return g;
  }, []);
  const mat = useMemo(() => {
    const mm = m.saffron.clone();
    mm.emissive = new THREE.Color("#7a0b03");
    mm.emissiveIntensity = 0.5;
    return mm;
  }, [m]);
  const seeds = useMemo(() => {
    const r = mulberry(23);
    return Array.from({ length: count }, (_, i) => ({
      delay: (i / count) * 0.6 + r() * 0.04,
      a0: (i * 2.399) % (Math.PI * 2), // golden-angle spacing: an even, ordered vortex
      spin: 1.6 + r() * 0.5,
      radius: 0.42 + r() * 0.3,
      height: 0.12 + (i / count) * 0.4 + r() * 0.06,
      bob: r() * Math.PI * 2,
      roll: r() * Math.PI * 2,
    }));
  }, [count]);
  const o = useMemo(() => new THREE.Object3D(), []);
  const next = useMemo(() => new THREE.Vector3(), []);

  const place = (sd: (typeof seeds)[number], s: number, t: number, out: THREE.Vector3) => {
    const e = 1 - Math.pow(1 - s, 2.2); // decelerate as it reaches the halo
    const ang = sd.a0 + e * sd.spin * Math.PI + t * 0.12;
    const r = 0.05 + e * sd.radius;
    const y = 0.4 + Math.sin(e * Math.PI * 0.5) * sd.height + Math.sin(t * 0.8 + sd.bob) * 0.02 * e;
    return out.set(Math.cos(ang) * r, y, Math.sin(ang) * r);
  };

  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;
    const q = finale.stream;
    const t = state.clock.elapsedTime;
    mesh.visible = q > 0.001;
    if (!mesh.visible) return;
    seeds.forEach((sd, i) => {
      const s = THREE.MathUtils.clamp((q - sd.delay) / 0.38, 0, 1);
      if (s <= 0) {
        o.scale.setScalar(0);
      } else {
        place(sd, s, t, o.position);
        place(sd, Math.min(1, s + 0.02), t + 0.05, next);
        if (next.distanceToSquared(o.position) < 1e-8) next.x += 0.001;
        o.lookAt(next);
        o.rotateZ(sd.roll);
        o.scale.setScalar(Math.min(1, s * 6));
      }
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mat.emissiveIntensity = 0.25 + q * 0.35;
  });

  return <instancedMesh ref={ref} args={[geo, mat, count]} frustumCulled={false} castShadow />;
}

/** The glass crocus stopper: violet outer petals, pale pink inner petals, clear pistil, green leaves, twine. */
function CrocusCrown({ m }: { m: Mats }) {
  const g = useMemo(
    () => ({
      bulb: stopperBulbGeometry(),
      outer: glassPetal(0.27, 0.19, 0.055, 0.3),
      inner: glassPetal(0.25, 0.15, 0.05, 0.55),
      leaf: glassPetal(0.1, 0.045, 0.02, 0.3),
      pistil: new THREE.CylinderGeometry(0.006, 0.009, 0.16, 10),
      bead: new THREE.SphereGeometry(0.018, 16, 12),
      twine: new THREE.TorusGeometry(0.092, 0.006, 8, 48),
    }),
    [],
  );
  const top = 0.17;
  return (
    <group>
      <mesh geometry={g.bulb} material={m.glass} />
      <mesh geometry={g.twine} material={m.twine} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} />
      <mesh geometry={g.twine} material={m.twine} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} scale={1.03} />
      <group position={[0, top, 0]}>
        {[0, 1, 2].map((i) => (
          <group key={`o${i}`} rotation={[0, (i / 3) * Math.PI * 2, 0]}>
            <mesh geometry={g.outer} material={m.violetGlass} rotation={[1.05, 0, 0]} position={[0, 0, 0.025]} />
          </group>
        ))}
        {[0, 1, 2].map((i) => (
          <group key={`i${i}`} rotation={[0, (i / 3) * Math.PI * 2 + Math.PI / 3, 0]}>
            <mesh geometry={g.inner} material={m.pinkGlass} rotation={[0.3, 0, 0]} position={[0, 0.01, 0.018]} />
          </group>
        ))}
        {[0, 1].map((i) => (
          <group key={`l${i}`} rotation={[0, i * Math.PI + 0.6, 0]}>
            <mesh geometry={g.leaf} material={m.greenGlass} rotation={[1.9, 0, 0]} position={[0, -0.02, 0.05]} />
          </group>
        ))}
        <mesh geometry={g.pistil} material={m.glass} position={[0, 0.08, 0]} />
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2;
          return (
            <mesh key={`b${i}`} geometry={g.bead} material={m.glass} position={[Math.sin(a) * 0.03, 0.16 + i * 0.01, Math.cos(a) * 0.03]} />
          );
        })}
      </group>
    </group>
  );
}

function Card({ m }: { m: Mats }) {
  const { w, h } = DIM.card;
  return (
    <group>
      <mesh material={[m.cardEdge, m.cardEdge, m.cardEdge, m.cardEdge, m.cardFront, m.cardBack]} castShadow>
        <boxGeometry args={[w, h, 0.006]} />
      </mesh>
    </group>
  );
}

function GiftBox({
  m,
  refs,
}: {
  m: Mats;
  refs: {
    lid: React.RefObject<THREE.Group | null>;
    jar: React.RefObject<THREE.Group | null>;
    crown: React.RefObject<THREE.Group | null>;
    card: React.RefObject<THREE.Group | null>;
    finale: Finale;
  };
}) {
  const { w, base, lid, wall } = DIM.box;
  const c = DIM.case;
  const f = DIM.foam;
  const geo = useMemo(() => {
    const baseShell = openShell(w - 0.03, w - 0.03, base, wall);
    const lidShell = openShell(w + 0.012, w + 0.012, lid - wall, wall, false);
    const lidTop = new THREE.BoxGeometry(w + 0.012, wall, w + 0.012);
    const caseWalls = [
      (() => {
        const g = notchedWall(c.w, c.h, c.wall, c.notchW, c.notchD);
        g.rotateY(Math.PI / 2);
        g.translate(c.w / 2 - c.wall / 2, 0, 0);
        return g;
      })(),
      (() => {
        const g = new THREE.BoxGeometry(c.wall, c.h, c.w);
        g.translate(-c.w / 2 + c.wall / 2, c.h / 2, 0);
        return g;
      })(),
      (() => {
        const g = new THREE.BoxGeometry(c.w, c.h, c.wall);
        g.translate(0, c.h / 2, c.w / 2 - c.wall / 2);
        return g;
      })(),
      (() => {
        const g = new THREE.BoxGeometry(c.w, c.h, c.wall);
        g.translate(0, c.h / 2, -c.w / 2 + c.wall / 2);
        return g;
      })(),
    ];
    const foam = foamBlock(c.w - 2 * c.wall - 0.004, f.h, f.cavityR, f.cavityDepth);
    return { baseShell, lidShell, lidTop, caseWalls, foam };
  }, [w, base, lid, wall, c, f]);

  const jarY = f.h - f.cavityDepth + 0.02;

  return (
    <group>
      <mesh geometry={geo.baseShell} material={m.kraftOuter} castShadow receiveShadow />
      <group position={[0, 0.02, 0]}>
        {geo.caseWalls.map((g, i) => (
          <mesh key={i} geometry={g} material={m.violet} castShadow receiveShadow />
        ))}
        <mesh geometry={geo.foam} material={m.foam} receiveShadow />
        {/* kraft disc at the bottom of the cavity */}
        <mesh position={[0, f.h - f.cavityDepth + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} material={m.kraftInner} receiveShadow>
          <circleGeometry args={[f.cavityR, 64]} />
        </mesh>
        <group ref={refs.jar} position={[0, jarY, 0]}>
          <Jar m={m} saffron={3200} finale={refs.finale} />
        </group>
        <group ref={refs.crown} position={[0, jarY + 0.395, 0]}>
          <CrocusCrown m={m} />
        </group>
        <group ref={refs.card} position={[-0.38, 0.74, 0.34]} rotation={[-1.25, 0.25, 0.1]}>
          <Card m={m} />
        </group>
      </group>
      <group ref={refs.lid}>
        <group position={[0, base - 0.12, 0]}>
          <mesh geometry={geo.lidShell} material={m.kraftLidSide} castShadow receiveShadow />
          <mesh geometry={geo.lidTop} material={[m.kraftLidSide, m.kraftLidSide, m.lidTop, m.kraftInner, m.kraftLidSide, m.kraftLidSide]} position={[0, lid - wall / 2, 0]} castShadow />
        </group>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Stage                                                                */
/* ------------------------------------------------------------------ */

const CAM: { p: number; pos: [number, number, number]; look: [number, number, number] }[] = [
  { p: 0.0, pos: [2.9, 2.5, 5.8], look: [0, 1.15, 0] },
  { p: 0.12, pos: [2.0, 2.3, 4.8], look: [0, 1.25, 0] },
  { p: 0.26, pos: [1.4, 3.3, 5.0], look: [0, 2.6, 0] },
  { p: 0.4, pos: [1.5, 2.5, 3.9], look: [0, 0.55, 0] },
  { p: 0.5, pos: [0.9, 3.6, 2.6], look: [0, 0.6, 0] },
  { p: 0.6, pos: [0.6, 3.3, 2.3], look: [0, 0.7, 0] },
  { p: 0.68, pos: [0.9, 2.6, 3.4], look: [0.55, 1.4, 0.2] },
  { p: 0.79, pos: [0.6, 2.7, 4.0], look: [0.4, 1.9, 0.2] },
  { p: 0.9, pos: [0.45, 2.35, 4.6], look: [0.5, 1.9, 0.2] },
  { p: 1.0, pos: [0.4, 2.25, 4.3], look: [0.5, 1.95, 0.2] },
];

function Stage({ progress, tx }: { progress: Progress; tx: BrandTextures }) {
  const m = useMaterials(tx);
  const { camera, gl, scene } = useThree();
  const smooth = useRef(0);
  const bag = useRef<THREE.Group>(null);
  const box = useRef<THREE.Group>(null);
  const lid = useRef<THREE.Group>(null);
  const jar = useRef<THREE.Group>(null);
  const crown = useRef<THREE.Group>(null);
  const card = useRef<THREE.Group>(null);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.55;
    return () => {
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  const curves = useMemo(
    () => ({
      pos: new THREE.CatmullRomCurve3(CAM.map((k) => new THREE.Vector3(...k.pos)), false, "centripetal"),
      look: new THREE.CatmullRomCurve3(CAM.map((k) => new THREE.Vector3(...k.look)), false, "centripetal"),
    }),
    [],
  );
  const v = useMemo(() => ({ pos: new THREE.Vector3(), look: new THREE.Vector3() }), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const finale = useMemo(() => ({ seal: 0, stream: 0 }), []);

  useFrame((state, dt) => {
    smooth.current = THREE.MathUtils.damp(smooth.current, progress.current, 4, dt);
    const raw = smooth.current;
    const p = Math.min(1, raw / UNBOX_END);
    const t = state.clock.elapsedTime;
    const seal = ss(raw, ...FINALE.seal);
    finale.stream = ss(raw, ...FINALE.stream);
    finale.seal = seal;

    // Camera along its spline, keyed to scroll.
    let i = 0;
    while (i < CAM.length - 2 && p > CAM[i + 1].p) i++;
    const local = THREE.MathUtils.clamp((p - CAM[i].p) / (CAM[i + 1].p - CAM[i].p), 0, 1);
    const u = (i + local) / (CAM.length - 1);
    curves.pos.getPoint(u, v.pos);
    curves.look.getPoint(u, v.look);
    // Finale: pull back and settle on the vessel so the whole halo of threads fits the frame.
    const fin = ss(raw, 0.82, 0.98);
    v.pos.lerp(tmp.set(0.35, 2.45, 5.0), fin);
    v.look.lerp(tmp.set(0.35, 2.05, 0.3), fin);
    v.pos.x += state.pointer.x * 0.18;
    v.pos.y += state.pointer.y * 0.08;
    camera.position.copy(v.pos);
    camera.lookAt(v.look);

    // 1. The box rises out of the bag, the bag recedes, the box settles on the floor.
    const rise = ss(p, ...T.boxRise);
    const away = ss(p, ...T.bagAway);
    const down = ss(p, ...T.boxDown);
    if (box.current) {
      box.current.position.y = lerp(0.03, 2.25, rise) * (1 - down);
      box.current.rotation.y = lerp(0, 0.35, ss(p, ...T.boxTurn)) + rise * (1 - down) * Math.sin(t * 0.8) * 0.04;
    }
    if (bag.current) {
      bag.current.position.set(lerp(0, -1.2, away), lerp(0, -0.2, away), lerp(0, -4.5, away));
      bag.current.rotation.y = lerp(0, 0.5, away);
      bag.current.visible = away < 0.999;
    }

    // 2. The lid lifts, tilts and floats away.
    const lidOff = ss(p, ...T.lidOff);
    if (lid.current) {
      lid.current.position.set(lerp(0, 0.9, ss(p, 0.52, 0.6)), lerp(0, 1.5, ss(p, 0.46, 0.53)) + lerp(0, 1.2, ss(p, 0.53, 0.6)), lerp(0, -1.6, ss(p, 0.52, 0.6)));
      lid.current.rotation.set(lerp(0, -0.55, lidOff), 0, lerp(0, -0.35, lidOff));
      lid.current.visible = p < 0.66;
    }

    // 3–5. Card, crown and vessel travel from their places in the box to positions in world space,
    // so the final composition is independent of how the box is turned.
    if (box.current) box.current.updateMatrixWorld();
    const toLocal = (x: number, y: number, z: number) =>
      box.current ? box.current.worldToLocal(tmp.set(x, y, z)).clone() : tmp.set(x, y, z).clone();
    const boxRot = box.current ? box.current.rotation.y : 0;
    const caseY = 0.02; // the case group sits 2 cm above the box base

    const cardOut = ss(p, ...T.cardOut);
    if (card.current) {
      const target = toLocal(1.05, 1.75 + Math.sin(t * 0.9) * 0.015, 0.45);
      target.y -= caseY;
      card.current.position.set(lerp(-0.38, target.x, cardOut), lerp(0.74, target.y, cardOut), lerp(0.34, target.z, cardOut));
      card.current.rotation.set(lerp(-1.25, -0.08, cardOut), lerp(0.25, -0.35 - boxRot + Math.sin(t * 0.5) * 0.04, cardOut), lerp(0.1, -0.05, cardOut));
    }

    const up = ss(p, ...T.crownUp);
    const jarUp = ss(p, ...T.jarUp);
    const jarBase = DIM.foam.h - DIM.foam.cavityDepth + 0.02;
    if (crown.current) {
      const target = toLocal(0.3, 2.42 + Math.sin(t * 1.1) * 0.012, 0.3);
      target.y -= caseY;
      crown.current.position.set(lerp(0, target.x, up), lerp(jarBase + 0.395, target.y, up), lerp(0, target.z, up));
      crown.current.rotation.set(lerp(0, 0.1, up), up * t * 0.25, lerp(0, -0.15, up));
    }
    if (jar.current) {
      const target = toLocal(0.3, 1.5 + Math.sin(t * 0.9 + 1) * 0.01, 0.3);
      target.y -= caseY;
      jar.current.position.set(lerp(0, target.x, jarUp), lerp(jarBase, target.y, jarUp), lerp(0, target.z, jarUp));
      jar.current.rotation.set(lerp(0, 0.2, jarUp), t * 0.12 * jarUp, 0);
    }
  });

  return (
    <>
      <color attach="background" args={["#0a0908"]} />
      <fog attach="fog" args={["#0a0908", 5, 13]} />

      {/* Key, rim and fill */}
      <spotLight
        position={[3.2, 6.2, 4.2]}
        angle={0.34}
        penumbra={0.9}
        intensity={85}
        decay={2}
        color="#fff1de"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0002}
      />
      <spotLight position={[-3.5, 4.5, -4]} angle={0.4} penumbra={1} intensity={70} decay={2} color="#b9a3ff" />
      <spotLight position={[0.5, 3.2, -3.5]} angle={0.6} penumbra={1} intensity={45} decay={2} color="#ffcf8a" />
      <directionalLight position={[-4, 2, 5]} intensity={0.25} color="#ffe6c8" />
      <ambientLight intensity={0.05} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} material={m.floor} receiveShadow>
        <circleGeometry args={[40, 64]} />
      </mesh>

      <group ref={bag}>
        <Bag m={m} />
      </group>
      <group ref={box}>
        <GiftBox m={m} refs={{ lid, jar, crown, card, finale }} />
      </group>
    </>
  );
}

export default function PackagingScene({ progress, active }: { progress: Progress; active: boolean }) {
  const [tx, setTx] = useState<BrandTextures | null>(null);
  useEffect(() => {
    let alive = true;
    loadBrandTextures().then((t) => alive && setTx(t));
    return () => {
      alive = false;
    };
  }, []);
  const mobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <Canvas
      shadows
      frameloop={active ? "always" : "never"}
      dpr={[1, mobile ? 1.5 : 1.75]}
      camera={{ fov: mobile ? 50 : 34, near: 0.05, far: 60, position: [2.9, 2.5, 5.6] }}
      gl={{ antialias: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
      style={{ position: "absolute", inset: 0 }}
    >
      {tx && <Stage progress={progress} tx={tx} />}
      <EffectComposer multisampling={4}>
        <Bloom intensity={0.25} luminanceThreshold={0.9} luminanceSmoothing={0.2} mipmapBlur />
        <Vignette offset={0.25} darkness={0.75} />
      </EffectComposer>
    </Canvas>
  );
}
