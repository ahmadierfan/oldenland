"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  PETAL_BASE_Y,
  addWind,
  flowerGeometry,
  leafGeometry,
  petalGeometry,
  stemGeometry,
  threadGeometry,
} from "@/lib/crocus";

type Progress = { current: number };

/* ------------------------------------------------------------------ */
/* Terrain                                                             */
/* ------------------------------------------------------------------ */

const ROW = 0.7; // furrow spacing

function groundHeight(x: number, z: number) {
  const rows = 0.035 * Math.sin((x / ROW) * Math.PI * 2) * (1 - THREE.MathUtils.smoothstep(-z, 30, 60));
  const swell = 0.25 * Math.sin(x * 0.11 + 0.6) * Math.sin(z * 0.07);
  const far = THREE.MathUtils.smoothstep(-z, 45, 95);
  const mountains = far * (9 + 5 * Math.sin(x * 0.045 + 1.1) + 3.2 * Math.sin(x * 0.13 + 0.3) + 1.4 * Math.sin(x * 0.41));
  return rows + swell * (1 - far) + mountains;
}

/** Deterministic random so the field is the same on every visit. */
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function Ground() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(240, 240, 200, 200);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0, -60);
    const pos = g.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const soil = new THREE.Color("#2e2016");
    const dry = new THREE.Color("#4a3423");
    const rock = new THREE.Color("#1a1310");
    const c = new THREE.Color();
    const r = rng(7);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = groundHeight(x, z);
      pos.setY(i, y);
      c.copy(soil).lerp(dry, 0.5 + 0.5 * Math.sin(x * 0.7 + z * 0.3) * r());
      c.lerp(rock, THREE.MathUtils.smoothstep(-z, 45, 90));
      colors.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, []);

  const mat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
    // Fine soil detail (clods, pebbles, straw) that holds up when the camera is at flower height.
    m.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vSoil;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvSoil = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
          varying vec3 vSoil;
          float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float vnoise(vec2 p) {
            vec2 i = floor(p), f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
          }`,
        )
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
          {
            vec2 q = vSoil.xz;
            float n = vnoise(q * 3.0) * 0.5 + vnoise(q * 11.0) * 0.3 + vnoise(q * 37.0) * 0.2;
            float pebble = smoothstep(0.86, 0.93, vnoise(q * 60.0));
            diffuseColor.rgb *= 0.7 + 0.6 * n;
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.3, 0.26, 0.22), pebble * 0.35);
          }`,
        );
    };
    return m;
  }, []);

  return <mesh geometry={geo} material={mat} receiveShadow />;
}

/* ------------------------------------------------------------------ */
/* Sky                                                                 */
/* ------------------------------------------------------------------ */

const skyVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFragment = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uGlow;
  uniform vec3 uSunDir;
  uniform float uSun;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    vec3 col = mix(uHorizon, uTop, smoothstep(-0.02, 0.42, d.y));
    float s = max(dot(d, normalize(uSunDir)), 0.0);
    col += uGlow * (pow(s, 5.0) * 0.32 + pow(s, 50.0) * 0.45 + smoothstep(0.9993, 0.9997, s) * 0.45) * uSun;
    col = mix(col, uHorizon * 0.35, smoothstep(0.0, -0.25, d.y));
    gl_FragColor = vec4(col, 1.0);
  }
`;

const SKY = {
  topNight: new THREE.Color("#060509"),
  topDawn: new THREE.Color("#140e12"),
  horizonNight: new THREE.Color("#241a3a"),
  horizonDawn: new THREE.Color("#b8693a"),
  glow: new THREE.Color("#ffb468"),
};

/* ------------------------------------------------------------------ */
/* Field of flowers + leaves                                            */
/* ------------------------------------------------------------------ */

function Field({ count, wind }: { count: number; wind: { uTime: { value: number } } }) {
  const variants = useMemo(
    () => [0.1, 0.26, 0.45].map((open) => flowerGeometry({ open, lowPoly: true })),
    [],
  );
  const leaf = useMemo(() => leafGeometry(), []);

  const flowerMat = useMemo(
    () =>
      addWind(
        new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.6 }),
        wind,
        0.55,
      ),
    [wind],
  );
  const leafMat = useMemo(
    () =>
      addWind(
        new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.8 }),
        wind,
        0.8,
      ),
    [wind],
  );

  const { matrices, leafMatrices } = useMemo(() => {
    const r = rng(42);
    const buckets: THREE.Matrix4[][] = [[], [], []];
    const leaves: THREE.Matrix4[] = [];
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();

    let placed = 0;
    while (placed < count) {
      // Flowers grow in clumps along the ridges between furrows.
      const row = Math.round((r() - 0.5) * 2 * (r() < 0.75 ? 9 : 26));
      const z = 14 - Math.pow(r(), 0.8) * 58;
      const cx = row * ROW + ROW / 4;
      const clump = 1 + Math.floor(r() * 4);
      for (let k = 0; k < clump && placed < count; k++) {
        const x = cx + (r() - 0.5) * 0.22;
        const zz = z + (r() - 0.5) * 0.3;
        // Keep a walking lane for the camera and space around the hero flower.
        if (Math.abs(x) < 0.32 && zz > -0.6) continue;
        if (Math.hypot(x, zz) < 0.55) continue;
        p.set(x, groundHeight(x, zz), zz);
        e.set((r() - 0.5) * 0.25, r() * Math.PI * 2, (r() - 0.5) * 0.25);
        q.setFromEuler(e);
        const sc = 0.8 + r() * 0.5;
        s.set(sc, sc * (0.9 + r() * 0.25), sc);
        m.compose(p, q, s);
        buckets[Math.floor(r() * 3)].push(m.clone());
        for (let l = 0; l < 3; l++) {
          e.set((r() - 0.5) * 0.5, r() * Math.PI * 2, (r() - 0.5) * 0.5);
          q.setFromEuler(e);
          const ls = 0.7 + r() * 0.7;
          s.set(1, ls, 1);
          p.set(x + (r() - 0.5) * 0.08, groundHeight(x, zz), zz + (r() - 0.5) * 0.08);
          leaves.push(m.clone().compose(p, q, s));
        }
        placed++;
      }
    }
    return { matrices: buckets, leafMatrices: leaves };
  }, [count]);

  return (
    <group>
      {variants.map((geo, i) => (
        <Instanced key={i} geometry={geo} material={flowerMat} matrices={matrices[i]} />
      ))}
      <Instanced geometry={leaf} material={leafMat} matrices={leafMatrices} />
    </group>
  );
}

function Instanced({
  geometry,
  material,
  matrices,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  matrices: THREE.Matrix4[];
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const mesh = ref.current!;
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [matrices]);
  return <instancedMesh ref={ref} args={[geometry, material, matrices.length]} frustumCulled={false} />;
}

/* ------------------------------------------------------------------ */
/* Hero flower: opens, then releases its three stigmas                 */
/* ------------------------------------------------------------------ */

const band = (p: number, a: number, b: number) => THREE.MathUtils.smootherstep(p, a, b);

function HeroFlower({ progress }: { progress: Progress }) {
  const petals = useRef<(THREE.Group | null)[]>([]);
  const stigmas = useRef<(THREE.Group | null)[]>([]);
  const light = useRef<THREE.PointLight>(null);
  const stigmaMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.45,
        emissive: new THREE.Color("#c41d0a"),
        emissiveIntensity: 0.15,
      }),
    [],
  );

  const geos = useMemo(
    () => ({
      outer: petalGeometry(0.175, 0.11),
      inner: petalGeometry(0.16, 0.1),
      stem: stemGeometry(PETAL_BASE_Y, 10),
      stigma: threadGeometry(0.15, 0.0042, 0.025, ["#e9b85a", "#a3140a"]),
      stamen: threadGeometry(0.09, 0.006, 0.01, ["#f2e7b0", "#e3b22c"]),
    }),
    [],
  );

  const y0 = groundHeight(0, 0);

  useFrame((state) => {
    const p = progress.current;
    const t = state.clock.elapsedTime;
    const open = 0.12 + 0.75 * band(p, 0.5, 0.7);
    petals.current.forEach((g, i) => {
      if (!g) return;
      const inner = i % 2 === 1;
      g.rotation.x = open * (inner ? 0.85 : 1) + Math.sin(t * 1.4 + i) * 0.015;
    });

    // Stigmas lift out of the bloom and drift upward, turning slowly.
    const lift = band(p, 0.72, 0.95);
    stigmas.current.forEach((g, i) => {
      if (!g) return;
      const a = (i / 3) * Math.PI * 2 + 0.3;
      const spread = 0.05 * lift;
      g.position.set(Math.sin(a) * spread, PETAL_BASE_Y + lift * (0.16 + i * 0.03) + Math.sin(t * 1.2 + i * 2) * 0.006 * lift, Math.cos(a) * spread);
      g.rotation.set(lift * (0.6 + Math.sin(t * 0.7 + i) * 0.15), a + lift * (t * 0.3), lift * 0.4);
    });

    stigmaMat.emissiveIntensity = 0.15 + lift * 1.6;
    if (light.current) light.current.intensity = 0.05 + band(p, 0.45, 0.65) * 1.1 + lift * 0.9;
  });

  return (
    <group position={[0, y0, 0]}>
      <mesh geometry={geos.stem}>
        <meshStandardMaterial vertexColors roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
      {Array.from({ length: 6 }, (_, i) => (
        <group key={i} position={[0, PETAL_BASE_Y, 0]} rotation={[0, (i / 6) * Math.PI * 2, 0]}>
          <group position={[0, 0, i % 2 ? 0.006 : 0.012]} ref={(el) => void (petals.current[i] = el)}>
            <mesh geometry={i % 2 ? geos.inner : geos.outer}>
              <meshPhysicalMaterial
                vertexColors
                side={THREE.DoubleSide}
                roughness={0.5}
                sheen={1}
                sheenColor="#c9a8f0"
                sheenRoughness={0.4}
              />
            </mesh>
          </group>
        </group>
      ))}
      {Array.from({ length: 3 }, (_, i) => (
        <mesh
          key={`stamen-${i}`}
          geometry={geos.stamen}
          position={[0, PETAL_BASE_Y, 0]}
          rotation={[0, (i / 3) * Math.PI * 2 + 1.3, 0]}
        >
          <meshStandardMaterial vertexColors roughness={0.6} />
        </mesh>
      ))}
      {Array.from({ length: 3 }, (_, i) => (
        <group key={`stigma-${i}`} ref={(el) => void (stigmas.current[i] = el)}>
          <mesh geometry={geos.stigma} material={stigmaMat} />
        </group>
      ))}
      <pointLight ref={light} position={[0.25, 0.45, 0.35]} color="#ffb070" intensity={0} distance={2.5} decay={1.6} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Golden dust                                                          */
/* ------------------------------------------------------------------ */

function Dust({ count }: { count: number }) {
  const { geo, mat } = useMemo(() => {
    const r = rng(3);
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos.set([(r() - 0.5) * 14, r() * 3.2, 14 - r() * 30], i * 3);
      seed[i] = r();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uPixel: { value: 1 }, uAlpha: { value: 1 } },
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uPixel;
        attribute float aSeed;
        varying float vTwinkle;
        void main() {
          vec3 p = position;
          p.x += sin(uTime * 0.15 + aSeed * 40.0) * 0.4;
          p.y += sin(uTime * 0.22 + aSeed * 17.0) * 0.25;
          p.z += cos(uTime * 0.12 + aSeed * 29.0) * 0.3;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (2.0 + aSeed * 5.0) * uPixel * (4.0 / -mv.z);
          vTwinkle = 0.45 + 0.55 * sin(uTime * (0.8 + aSeed * 2.0) + aSeed * 60.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uAlpha;
        varying float vTwinkle;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vec3(1.0, 0.78, 0.45) * a, a * vTwinkle * uAlpha);
        }
      `,
    });
    return { geo: g, mat: m };
  }, [count]);

  const { gl } = useThree();
  useFrame((state) => {
    mat.uniforms.uTime.value = state.clock.elapsedTime;
    mat.uniforms.uPixel.value = gl.getPixelRatio();
  });

  return <points geometry={geo} material={mat} />;
}

/* ------------------------------------------------------------------ */
/* Camera, light and atmosphere driven by scroll                        */
/* ------------------------------------------------------------------ */

const CAM_KEYS: { p: number; pos: [number, number, number]; look: [number, number, number] }[] = [
  { p: 0.0, pos: [0, 3.4, 17], look: [0, 1.6, -40] },
  { p: 0.22, pos: [0.1, 2.0, 10], look: [0, 0.8, -25] },
  { p: 0.42, pos: [0.15, 0.85, 4.5], look: [0, 0.35, -8] },
  { p: 0.58, pos: [0.12, 0.45, 1.5], look: [0, 0.2, 0] },
  { p: 0.74, pos: [0.08, 0.36, 0.62], look: [0, 0.22, 0] },
  { p: 1.0, pos: [0.02, 0.5, 0.52], look: [0, 0.4, 0] },
];

function Rig({ progress, wind }: { progress: Progress; wind: { uTime: { value: number } } }) {
  const { camera, scene } = useThree();
  const smooth = useRef(progress.current);
  const sky = useRef<THREE.Mesh>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);

  const skyMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTop: { value: SKY.topNight.clone() },
          uHorizon: { value: SKY.horizonNight.clone() },
          uGlow: { value: SKY.glow.clone() },
          uSunDir: { value: new THREE.Vector3(-0.25, 0.02, -1) },
          uSun: { value: 0 },
        },
        vertexShader: skyVertex,
        fragmentShader: skyFragment,
      }),
    [],
  );

  const curves = useMemo(() => {
    const pos = new THREE.CatmullRomCurve3(CAM_KEYS.map((k) => new THREE.Vector3(...k.pos)), false, "centripetal");
    const look = new THREE.CatmullRomCurve3(CAM_KEYS.map((k) => new THREE.Vector3(...k.look)), false, "centripetal");
    return { pos, look };
  }, []);

  const fog = useMemo(() => new THREE.Fog("#1a1220", 3, 95), []);
  useEffect(() => {
    scene.fog = fog;
    return () => void (scene.fog = null);
  }, [scene, fog]);

  const v = useMemo(() => ({ pos: new THREE.Vector3(), look: new THREE.Vector3(), c: new THREE.Color() }), []);

  useFrame((state, dt) => {
    wind.uTime.value = state.clock.elapsedTime;
    smooth.current = THREE.MathUtils.damp(smooth.current, progress.current, 3.2, dt);
    const p = smooth.current;

    // Map progress onto the spline so each keyframe lands at its own scroll position.
    let i = 0;
    while (i < CAM_KEYS.length - 2 && p > CAM_KEYS[i + 1].p) i++;
    const a = CAM_KEYS[i];
    const b = CAM_KEYS[i + 1];
    const local = THREE.MathUtils.clamp((p - a.p) / (b.p - a.p), 0, 1);
    const u = (i + local) / (CAM_KEYS.length - 1);
    curves.pos.getPoint(u, v.pos);
    curves.look.getPoint(u, v.look);

    // Subtle hand-held parallax that follows the pointer, smaller when we are close.
    const near = THREE.MathUtils.lerp(1, 0.12, band(p, 0.4, 0.75));
    v.pos.x += state.pointer.x * 0.35 * near;
    v.pos.y += state.pointer.y * 0.12 * near;
    v.pos.y += Math.sin(state.clock.elapsedTime * 0.5) * 0.01;
    camera.position.copy(v.pos);
    camera.lookAt(v.look);

    // Night → dawn.
    const dawn = band(p, 0.05, 0.55);
    const u_ = skyMat.uniforms;
    u_.uTop.value.copy(SKY.topNight).lerp(SKY.topDawn, dawn);
    u_.uHorizon.value.copy(SKY.horizonNight).lerp(SKY.horizonDawn, dawn);
    u_.uSun.value = 0.25 + dawn * 1.1;
    (u_.uSunDir.value as THREE.Vector3).set(-0.25, -0.02 + dawn * 0.09, -1);
    fog.color.copy(u_.uHorizon.value).lerp(u_.uTop.value, 0.55);
    fog.near = THREE.MathUtils.lerp(3, 1.2, band(p, 0.45, 0.8));
    fog.far = THREE.MathUtils.lerp(95, 18, band(p, 0.5, 0.85));
    if (sky.current) sky.current.position.copy(camera.position);

    if (sun.current) {
      sun.current.intensity = 0.4 + dawn * 2.2;
      sun.current.color.copy(v.c.set("#9a86ff").lerp(new THREE.Color("#ffb26b"), dawn));
    }
    if (hemi.current) hemi.current.intensity = 0.55 + dawn * 0.55;
  });

  return (
    <>
      <mesh ref={sky} material={skyMat} renderOrder={-1}>
        <sphereGeometry args={[180, 32, 16]} />
      </mesh>
      <hemisphereLight ref={hemi} args={["#8a78b8", "#2a1a10", 0.6]} />
      {/* Low sun behind the field: everything is rim-lit towards the camera. */}
      <directionalLight ref={sun} position={[-6, 3, -18]} intensity={1} />
      <directionalLight position={[3, 4, 10]} intensity={0.9} color="#e8c9ff" />
    </>
  );
}

/* ------------------------------------------------------------------ */

export default function OriginScene({ progress, active }: { progress: Progress; active: boolean }) {
  const wind = useMemo(() => ({ uTime: { value: 0 } }), []);
  const mobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, mobile ? 1.5 : 1.75]}
      camera={{ fov: mobile ? 55 : 42, near: 0.02, far: 400, position: [0, 3.4, 17] }}
      gl={{ antialias: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      style={{ position: "absolute", inset: 0 }}
    >
      <Rig progress={progress} wind={wind} />
      <Ground />
      <Field count={mobile ? 1800 : 5200} wind={wind} />
      <HeroFlower progress={progress} />
      <Dust count={mobile ? 350 : 900} />
    </Canvas>
  );
}
