"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import CinematicFX from "./CinematicFX";
import { TONE, loadEnvironment } from "@/lib/realism";
import { isLowPower } from "@/lib/device";
import { Bag, type Mats, useMaterials } from "./PackagingParts";
import { DISSOLVE_END } from "@/lib/handoff";
import * as THREE from "three";
import {
  DIM,
  type BrandTextures,
  foamBlock,
  glassPetal,
  heroThreadGeometry,
  jarGeometry,
  loadBrandTextures,
  notchedWall,
  openShell,
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
const UNBOX_START = DISSOLVE_END + 0.01;
const UNBOX_END = 0.8;
const FINALE = {
  seal: [0.8, 0.84] as const,
  emerge: [0.82, 0.885] as const,
  closeUp: [0.86, 0.93] as const,
  exit: [0.955, 1.0] as const,
};

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



/* ------------------------------------------------------------------ */
/* Objects                                                              */
/* ------------------------------------------------------------------ */

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
      <mesh geometry={body} material={m.glass} renderOrder={2} />
      <mesh ref={sealRef} position={[0, 0.392, 0]} material={m.seal}>
        <cylinderGeometry args={[0.15, 0.15, 0.012, 48]} />
      </mesh>
    </group>
  );
}

type Finale = { seal: number; emerge: number; exit: number };

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
          <Jar m={m} saffron={isLowPower() ? 1400 : 3200} finale={refs.finale} />
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


/**
 * The proof: two show-quality threads rise out of the opened vessel and hang in front of the camera,
 * turning slowly so the crimson body and flared tips can be seen. They lean toward the mouse, and at the
 * end of the chapter fly up out of frame — to land on the export globe in the next chapter.
 */
function TwoThreads({ finale, jar }: { finale: Finale; jar: React.RefObject<THREE.Group | null> }) {
  const geos = useMemo(() => [heroThreadGeometry(3), heroThreadGeometry(8)], []);
  const mat = useMemo(() => {
    const mm = new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.42,
      sheen: 0.6,
      sheenColor: new THREE.Color("#ff6a3a"),
      emissive: new THREE.Color("#3a0401"),
      emissiveIntensity: 0.6,
    });
    return mm;
  }, []);
  const refs = useRef<(THREE.Group | null)[]>([]);
  const light = useRef<THREE.PointLight>(null);
  const { camera } = useThree();
  const v = useMemo(
    () => ({
      neck: new THREE.Vector3(),
      hit: new THREE.Vector3(),
      lean: new THREE.Vector3(),
      plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), -1.75),
      target: new THREE.Vector3(),
    }),
    [],
  );
  // Presentation spots, side by side in front of the vessel.
  const spots = useMemo(() => [new THREE.Vector3(0.52, 2.4, 1.85), new THREE.Vector3(0.9, 2.3, 1.95)], []);

  useFrame((state, dt) => {
    const q = finale.emerge;
    const x = finale.exit;
    const t = state.clock.elapsedTime;
    const show = q > 0.001 && x < 0.999;
    if (light.current) light.current.intensity = show ? 1.6 * q * (1 - x) : 0;
    if (!jar.current) return;
    jar.current.localToWorld(v.neck.set(0, 0.4, 0));

    // Lean toward the mouse: intersect the pointer ray with the threads' plane.
    state.raycaster.setFromCamera(state.pointer, camera);
    if (state.raycaster.ray.intersectPlane(v.plane, v.hit)) {
      v.target.copy(v.hit).sub(tmpCentre.set(0.71, 2.35, 1.9)).multiplyScalar(0.35).clampLength(0, 0.32);
      v.lean.x = THREE.MathUtils.damp(v.lean.x, v.target.x, 3, dt);
      v.lean.y = THREE.MathUtils.damp(v.lean.y, v.target.y, 3, dt);
    }

    refs.current.forEach((g, k) => {
      if (!g) return;
      g.visible = show;
      if (!show) return;
      // Out of the neck one after the other.
      const e = THREE.MathUtils.smootherstep(q, k * 0.25, 0.75 + k * 0.25);
      const eased = 1 - Math.pow(1 - e, 3);
      g.position.copy(v.neck).lerp(spots[k], eased);
      g.position.y += Math.sin(eased * Math.PI) * 0.25;
      // Hang, breathe and follow the mouse (the nearer thread a little more).
      g.position.y += Math.sin(t * 0.9 + k * 2) * 0.012 * eased;
      g.position.addScaledVector(v.lean, eased * (1 + k * 0.25));
      // Exit: up and out of frame, toward the next chapter.
      const ex = x * x;
      g.position.x += ex * (0.9 + k * 0.4);
      g.position.y += ex * 1.9;
      g.position.z += ex * 0.6;
      // Rise vertically, then turn to lie across the frame and slowly spin on its own axis.
      g.rotation.set(
        THREE.MathUtils.lerp(-Math.PI / 2, -0.35 + k * 0.25, eased),
        THREE.MathUtils.lerp(0, 1.15 - k * 0.45, eased) + Math.sin(t * 0.35 + k) * 0.18,
        t * (0.25 + k * 0.08) * eased,
      );
      g.scale.setScalar(THREE.MathUtils.lerp(0.4, 2.0, eased) * (1 - ex * 0.5));
    });
  });

  return (
    <group>
      {geos.map((geo, k) => (
        <group key={k} ref={(el) => void (refs.current[k] = el)} visible={false}>
          {/* centre the thread on its own middle so it turns around itself */}
          <mesh geometry={geo} material={mat} position={[0, -0.01, -0.13]} castShadow />
        </group>
      ))}
      <pointLight ref={light} position={[0.75, 2.55, 2.35]} color="#ffd7a8" intensity={0} distance={3} decay={1.5} />
    </group>
  );
}

const tmpCentre = new THREE.Vector3();

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

function Stage({
  progress,
  tx,
  fxOn,
  setFxOn,
  focus,
}: {
  progress: Progress;
  tx: BrandTextures;
  fxOn: boolean;
  setFxOn: (on: boolean) => void;
  focus: THREE.Vector3;
}) {
  const m = useMaterials(tx);
  const { camera, gl, scene } = useThree();
  const smooth = useRef(0);
  const bag = useRef<THREE.Group>(null);
  const box = useRef<THREE.Group>(null);
  const lid = useRef<THREE.Group>(null);
  const jar = useRef<THREE.Group>(null);
  const crown = useRef<THREE.Group>(null);
  const card = useRef<THREE.Group>(null);

  // Lit by a real photographed studio (HDRI): reflections in the glass and the soft wrap of light
  // on paper come from an actual environment instead of a few point lights.
  useEffect(() => {
    let env: THREE.Texture | null = null;
    let alive = true;
    loadEnvironment(gl, "/hdri/studio.exr", 400, isLowPower()).then((t) => {
      if (!alive) return t.dispose();
      env = t;
      scene.environment = t;
      scene.environmentIntensity = 0.42;
      scene.environmentRotation.set(0, -0.6, 0);
    });
    return () => {
      alive = false;
      env?.dispose();
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
  const finale = useMemo<Finale>(() => ({ seal: 0, emerge: 0, exit: 0 }), []);
  const fog = useRef<THREE.Fog>(null);
  const studioBg = useMemo(() => new THREE.Color("#0a0908"), []);

  useFrame((state, dt) => {
    smooth.current = THREE.MathUtils.damp(smooth.current, progress.current, 4, dt);
    const raw = smooth.current;
    const p = THREE.MathUtils.clamp((raw - UNBOX_START) / (UNBOX_END - UNBOX_START), 0, 1);
    const t = state.clock.elapsedTime;
    finale.seal = ss(raw, ...FINALE.seal);
    finale.emerge = ss(raw, ...FINALE.emerge);
    finale.exit = ss(raw, ...FINALE.exit);

    // Field → studio: while the field is still visible behind us, nothing of the studio may show.
    const dark = ss(raw, DISSOLVE_END * 0.3, DISSOLVE_END);
    m.floor.opacity = dark;
    if (fog.current) {
      fog.current.near = lerp(60, 5, dark);
      fog.current.far = lerp(120, 13, dark);
    }
    const wantFx = dark > 0.999;
    if (wantFx !== fxOn) setFxOn(wantFx);
    // Transparent only while the field shows through. Glass samples what is behind it, and a
    // transparent backdrop behind glass turns into invalid pixels in the post-processing chain.
    const opaque = dark > 0.999;
    if (opaque && scene.background !== studioBg) scene.background = studioBg;
    if (!opaque && scene.background) scene.background = null;

    // Camera along its spline, keyed to scroll.
    let i = 0;
    while (i < CAM.length - 2 && p > CAM[i + 1].p) i++;
    const local = THREE.MathUtils.clamp((p - CAM[i].p) / (CAM[i + 1].p - CAM[i].p), 0, 1);
    const u = (i + local) / (CAM.length - 1);
    curves.pos.getPoint(u, v.pos);
    curves.look.getPoint(u, v.look);
    // Finale: settle on the opened vessel, then move in close on the two threads.
    v.pos.lerp(tmp.set(0.35, 2.4, 4.6), ss(raw, 0.8, 0.86));
    v.look.lerp(tmp.set(0.35, 2.0, 0.4), ss(raw, 0.8, 0.86));
    const close = ss(raw, ...FINALE.closeUp);
    v.pos.lerp(tmp.set(0.74, 2.3, 3.1), close);
    v.look.lerp(tmp.set(0.74, 2.22, 1.8), close);
    // No hand-held drift until the field has gone (the first frame must sit exactly on the field's frame).
    const drift = ss(raw, DISSOLVE_END, DISSOLVE_END + 0.05);
    v.pos.x += state.pointer.x * 0.18 * drift;
    v.pos.y += state.pointer.y * 0.08 * drift;
    camera.position.copy(v.pos);
    camera.lookAt(v.look);
    focus.copy(v.look);

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
      <fog ref={fog} attach="fog" args={["#0a0908", 60, 120]} />

      {/* Key, rim and fill */}
      <spotLight
        position={[3.2, 6.2, 4.2]}
        angle={0.38}
        penumbra={1}
        intensity={70}
        decay={2}
        color="#fff1de"
        castShadow
        shadow-mapSize={[1536, 1536]}
        shadow-bias={-0.0002}
      />
      <spotLight position={[-3.5, 4.5, -4]} angle={0.4} penumbra={1} intensity={70} decay={2} color="#b9a3ff" />
      <spotLight position={[0.5, 3.2, -3.5]} angle={0.6} penumbra={1} intensity={45} decay={2} color="#ffcf8a" />
      <directionalLight position={[-4, 2, 5]} intensity={0.25} color="#ffe6c8" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} material={m.floor} receiveShadow>
        <circleGeometry args={[40, 64]} />
      </mesh>

      <group ref={bag}>
        <Bag m={m} />
      </group>
      <group ref={box}>
        <GiftBox m={m} refs={{ lid, jar, crown, card, finale }} />
      </group>
      <TwoThreads finale={finale} jar={jar} />
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
  const low = isLowPower();
  const [fxOn, setFxOn] = useState(false);
  const focus = useMemo(() => new THREE.Vector3(0, 1.15, 0), []);

  return (
    <Canvas
      shadows={!low}
      frameloop={active ? "always" : "never"}
      dpr={[1, low ? 1.25 : 1.75]}
      camera={{ fov: mobile ? 50 : 34, near: 0.05, far: 60, position: [2.9, 2.5, 5.6] }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance", ...TONE }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      style={{ position: "absolute", inset: 0 }}
    >
      {tx && <Stage progress={progress} tx={tx} fxOn={fxOn} setFxOn={setFxOn} focus={focus} />}
      {/* Post-processing would flatten the transparent canvas, so it only joins once the field has gone. */}
      {fxOn && <CinematicFX focus={focus} focusRange={1.4} bokeh={2.2} aoRadius={0.35} aoIntensity={2.5} bloom={0.35} vignette={0.3} />}
    </Canvas>
  );
}
