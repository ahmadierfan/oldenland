"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { exportOrigin, markets } from "@/lib/content";

type Progress = { current: number };

const DEG = Math.PI / 180;
const ss = (p: number, a: number, b: number) => THREE.MathUtils.smootherstep(p, a, b);

/** Scroll window in which each route is drawn. */
export const routeWindow = (i: number) => [0.12 + i * 0.085, 0.12 + i * 0.085 + 0.14] as const;

export function latLon(lat: number, lon: number, r = 1, out = new THREE.Vector3()) {
  const phi = (90 - lat) * DEG;
  const theta = (lon + 180) * DEG;
  return out.set(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

/** Which longitude/latitude faces the camera as the routes are drawn. */
const VIEW: { p: number; lon: number; lat: number }[] = [
  { p: 0.0, lon: 62, lat: 28 },
  { p: 0.15, lon: 52, lat: 30 },
  { p: 0.32, lon: 30, lat: 36 },
  { p: 0.5, lon: 8, lat: 38 },
  { p: 0.62, lon: -32, lat: 44 },
  { p: 0.74, lon: 45, lat: 28 },
  { p: 0.88, lon: 82, lat: 26 },
  { p: 1.0, lon: 62, lat: 28 },
];

function viewAt(p: number) {
  let i = 0;
  while (i < VIEW.length - 2 && p > VIEW[i + 1].p) i++;
  const a = VIEW[i];
  const b = VIEW[i + 1];
  const t = ss(p, a.p, b.p);
  return { lon: THREE.MathUtils.lerp(a.lon, b.lon, t), lat: THREE.MathUtils.lerp(a.lat, b.lat, t) };
}

/* ------------------------------------------------------------------ */

function Dots({ data }: { data: number[] }) {
  const { geo, mat } = useMemo(() => {
    const n = data.length / 2;
    const pos = new Float32Array(n * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      latLon(data[i * 2], data[i * 2 + 1], 1.001, v);
      pos.set([v.x, v.y, v.z], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uPixel: { value: 1 }, uColor: { value: new THREE.Color("#c9a45c") } },
      vertexShader: /* glsl */ `
        uniform float uPixel;
        varying float vFacing;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vec3 n = normalize(mat3(modelViewMatrix) * position);
          vFacing = dot(n, normalize(-mv.xyz));
          gl_Position = projectionMatrix * mv;
          gl_PointSize = 2.6 * uPixel * (3.2 / -mv.z);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying float vFacing;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.2, d);
          float face = smoothstep(-0.05, 0.6, vFacing);
          gl_FragColor = vec4(uColor * (0.45 + 0.55 * face), a * (0.08 + 0.6 * face));
        }
      `,
    });
    return { geo: g, mat: m };
  }, [data]);
  const { gl } = useThree();
  useFrame(() => void (mat.uniforms.uPixel.value = gl.getPixelRatio()));
  return <points geometry={geo} material={mat} />;
}

function Atmosphere() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: /* glsl */ `
          varying vec3 vN;
          varying vec3 vV;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vN = normalize(normalMatrix * normal);
            vV = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          varying vec3 vN;
          varying vec3 vV;
          void main() {
            float rim = pow(1.0 - abs(dot(vN, vV)), 5.0);
            vec3 col = mix(vec3(0.42, 0.25, 0.7), vec3(0.85, 0.55, 0.3), 0.35);
            gl_FragColor = vec4(col * rim * 0.8, rim);
          }
        `,
      }),
    [],
  );
  return (
    <mesh material={mat} scale={1.07}>
      <sphereGeometry args={[1, 64, 64]} />
    </mesh>
  );
}

/** A route: a saffron thread lifted along the great circle, drawn progressively by scroll. */
function Route({ to, progress, index }: { to: { lat: number; lon: number }; progress: Progress; index: number }) {
  const { geo, curve } = useMemo(() => {
    const a = latLon(exportOrigin.lat, exportOrigin.lon, 1);
    const b = latLon(to.lat, to.lon, 1);
    const angle = a.angleTo(b);
    // Great circle (slerp) from Khorasan to the city, lifted into an arc: longer routes fly higher.
    const q = new THREE.Quaternion().setFromUnitVectors(a, b);
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 96; i++) {
      const t = i / 96;
      const p = a.clone().applyQuaternion(new THREE.Quaternion().slerp(q, t));
      p.multiplyScalar(1.003 + Math.sin(Math.PI * t) * (0.04 + angle * 0.18));
      pts.push(p);
    }
    const c = new THREE.CatmullRomCurve3(pts);
    return { geo: new THREE.TubeGeometry(c, 160, 0.0042, 6, false), curve: c };
  }, [to]);

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uDraw: { value: 0 } },
        vertexShader: /* glsl */ `
          varying float vAlong;
          void main() {
            vAlong = uv.x;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uDraw;
          varying float vAlong;
          void main() {
            if (vAlong > uDraw) discard;
            float head = smoothstep(uDraw - 0.12, uDraw, vAlong);
            vec3 red = vec3(0.75, 0.08, 0.03);
            vec3 gold = vec3(1.0, 0.72, 0.35);
            vec3 col = mix(red, gold, head);
            gl_FragColor = vec4(col * (0.9 + head * 1.6), 0.85);
          }
        `,
      }),
    [],
  );

  const head = useRef<THREE.Mesh>(null);
  const city = useRef<THREE.Mesh>(null);
  const cityPos = useMemo(() => latLon(to.lat, to.lon, 1.006), [to]);
  const cityQuat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), cityPos.clone().normalize()), [cityPos]);

  useFrame((state) => {
    const [a, b] = routeWindow(index);
    const d = ss(progress.current, a, b);
    mat.uniforms.uDraw.value = d;
    if (head.current) {
      head.current.visible = d > 0.001 && d < 0.999;
      curve.getPointAt(Math.min(0.999, d), head.current.position);
    }
    if (city.current) {
      const arrived = ss(progress.current, b - 0.02, b + 0.03);
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2.4 + index) * 0.15;
      city.current.scale.setScalar(arrived * pulse * 0.022 + 1e-4);
    }
  });

  return (
    <group>
      <mesh geometry={geo} material={mat} />
      <mesh ref={head}>
        <sphereGeometry args={[0.012, 12, 12]} />
        <meshBasicMaterial color="#ffd08a" toneMapped={false} />
      </mesh>
      <mesh ref={city} position={cityPos} quaternion={cityQuat}>
        <ringGeometry args={[0.6, 1, 32]} />
        <meshBasicMaterial color="#f0c27a" toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Origin() {
  const ref = useRef<THREE.Mesh>(null);
  const pos = useMemo(() => latLon(exportOrigin.lat, exportOrigin.lon, 1.006), []);
  const quat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), pos.clone().normalize()), [pos]);
  useFrame((state) => {
    if (ref.current) ref.current.scale.setScalar(0.02 + ((state.clock.elapsedTime * 0.6) % 1) * 0.035);
    if (ref.current) (ref.current.material as THREE.MeshBasicMaterial).opacity = 1 - ((state.clock.elapsedTime * 0.6) % 1);
  });
  return (
    <group>
      <mesh position={pos}>
        <sphereGeometry args={[0.016, 16, 16]} />
        <meshBasicMaterial color="#ff4a1c" toneMapped={false} />
      </mesh>
      <mesh ref={ref} position={pos} quaternion={quat}>
        <ringGeometry args={[0.7, 1, 40]} />
        <meshBasicMaterial color="#ff6a2a" transparent toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** Projects city positions to the screen so the DOM labels can follow the globe. */
function Labels({
  labels,
  progress,
  globe,
}: {
  labels: React.RefObject<(HTMLDivElement | null)[]>;
  progress: Progress;
  globe: React.RefObject<THREE.Group | null>;
}) {
  const { camera, size } = useThree();
  const v = useMemo(() => new THREE.Vector3(), []);
  const n = useMemo(() => new THREE.Vector3(), []);
  const all = useMemo(() => [{ ...exportOrigin, origin: true }, ...markets.map((m) => ({ ...m, origin: false }))], []);
  useFrame(() => {
    const g = globe.current;
    if (!g) return;
    all.forEach((c, i) => {
      const el = labels.current?.[i];
      if (!el) return;
      latLon(c.lat, c.lon, 1.02, v).applyMatrix4(g.matrixWorld);
      n.copy(v).normalize();
      const facing = n.dot(camera.position.clone().normalize());
      v.project(camera);
      const x = (v.x * 0.5 + 0.5) * size.width;
      const y = (-v.y * 0.5 + 0.5) * size.height;
      const shown = c.origin ? ss(progress.current, 0.05, 0.12) : ss(progress.current, routeWindow(i - 1)[1] - 0.02, routeWindow(i - 1)[1] + 0.03);
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      el.style.opacity = String(shown * THREE.MathUtils.smoothstep(facing, 0.15, 0.45));
    });
  });
  return null;
}

function Globe({ progress, data, labels }: { progress: Progress; data: number[]; labels: React.RefObject<(HTMLDivElement | null)[]> }) {
  const globe = useRef<THREE.Group>(null);
  const smooth = useRef(0);
  const { camera, size } = useThree();
  const stage = useRef<THREE.Group>(null);
  useFrame((state, dt) => {
    smooth.current = THREE.MathUtils.damp(smooth.current, progress.current, 3.5, dt);
    const p = smooth.current;
    const { lon, lat } = viewAt(p);
    if (globe.current) {
      globe.current.rotation.set(lat * DEG, -(lon + 90) * DEG, 0);
      const s = THREE.MathUtils.lerp(0.82, 1, ss(p, 0, 0.12));
      globe.current.scale.setScalar(s);
    }
    // Leave room for the title on the left on wide screens.
    if (stage.current) stage.current.position.x = size.width > 900 ? 0.55 : 0;
    camera.position.set(state.pointer.x * 0.08, state.pointer.y * 0.05, size.width > 900 ? 4.6 : 5.6);
    camera.lookAt(0, 0, 0);
  });
  return (
    <group ref={stage}>
      <group ref={globe}>
        <mesh>
          <sphereGeometry args={[0.996, 96, 96]} />
          <meshBasicMaterial color="#0d0b0a" />
        </mesh>
        <Dots data={data} />
        <Origin />
        {markets.map((m, i) => (
          <Route key={m.city} to={m} progress={progress} index={i} />
        ))}
      </group>
      <Atmosphere />
      <Labels labels={labels} progress={progress} globe={globe} />
    </group>
  );
}

export default function WorldScene({
  progress,
  active,
  labels,
}: {
  progress: Progress;
  active: boolean;
  labels: React.RefObject<(HTMLDivElement | null)[]>;
}) {
  const [data, setData] = useState<number[] | null>(null);
  useEffect(() => {
    fetch("/data/world-dots.json")
      .then((r) => r.json())
      .then(setData);
  }, []);
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 1.75]}
      camera={{ fov: 32, near: 0.1, far: 20, position: [0, 0, 4.6] }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      style={{ position: "absolute", inset: 0 }}
    >
      {data && <Globe progress={progress} data={data} labels={labels} />}
      <EffectComposer multisampling={4}>
        <Bloom intensity={0.6} luminanceThreshold={0.35} luminanceSmoothing={0.3} mipmapBlur />
      </EffectComposer>
    </Canvas>
  );
}
