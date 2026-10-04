"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Bloom, DepthOfField, EffectComposer, N8AO, Vignette } from "@react-three/postprocessing";
import type { DepthOfFieldEffect } from "postprocessing";
import * as THREE from "three";

/**
 * The "shot on a real camera" finish shared by the 3D scenes:
 *  - ambient occlusion: soft contact darkening where objects meet (the biggest tell-tale of CG is its absence)
 *  - depth of field: a lens focused on what the camera is looking at, everything else falls off softly
 *  - gentle bloom on highlights and a lens vignette
 * (Film grain is a CSS layer over the whole page: a soft-light grain pass here would run on HDR values
 *  above 1, where the blend is undefined, and leaves black specks on glass highlights.)
 */
export default function CinematicFX({
  focus,
  range,
  focusRange = 1.5,
  bokeh = 2.5,
  aoRadius = 0.6,
  aoIntensity = 2.2,
  bloom = 0.3,
  vignette = 0.6,
}: {
  /** World-space point to keep in focus (updated by the scene every frame). */
  focus?: THREE.Vector3;
  /** Optional live depth-of-field range, for scenes that go from landscape to macro. */
  range?: { value: number };
  focusRange?: number;
  bokeh?: number;
  aoRadius?: number;
  aoIntensity?: number;
  bloom?: number;
  vignette?: number;
}) {
  const dof = useRef<DepthOfFieldEffect>(null);
  useFrame(() => {
    if (focus && dof.current?.target) dof.current.target.copy(focus);
    if (range && dof.current) dof.current.cocMaterial.worldFocusRange = range.value;
  });

  return (
    <EffectComposer multisampling={4} frameBufferType={THREE.FloatType}>
      <N8AO halfRes aoRadius={aoRadius} intensity={aoIntensity} distanceFalloff={0.6} quality="medium" />
      {focus && <DepthOfField ref={dof} target={[0, 0, 0]} worldFocusRange={focusRange} bokehScale={bokeh} />}
      <Bloom intensity={bloom} luminanceThreshold={0.8} luminanceSmoothing={0.25} mipmapBlur />
      <Vignette offset={0.3} darkness={vignette} />
    </EffectComposer>
  );
}
