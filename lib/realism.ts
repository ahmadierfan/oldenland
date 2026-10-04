import * as THREE from "three";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";

/**
 * Shared "make it look photographed" helpers: image-based lighting from real HDRIs
 * and tileable surface normals (all CC0, from Poly Haven via @pmndrs/assets).
 */

/** Loads an HDRI and pre-filters it for physically based reflections and ambient light. */
export async function loadEnvironment(gl: THREE.WebGLRenderer, url: string, maxRadiance = 400, lowPower = false) {
  let hdr: THREE.DataTexture;
  if (lowPower) {
    // Phones: half-float is what mobile GPUs can filter; no post-processing runs there, so the odd
    // over-bright pixel stays a single pixel.
    hdr = await new EXRLoader().setDataType(THREE.HalfFloatType).loadAsync(url);
  } else {
    // Load at full float precision and clamp the hottest pixels (lamps, the sun) so they cannot
    // overflow when blurred by depth of field and bloom.
    hdr = await new EXRLoader().setDataType(THREE.FloatType).loadAsync(url);
    const data = hdr.image.data as Float32Array;
    for (let i = 0; i < data.length; i++) {
      const v = data[i];
      data[i] = Number.isFinite(v) ? Math.min(Math.max(v, 0), maxRadiance) : maxRadiance;
    }
    hdr.needsUpdate = true;
  }
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  const pmrem = new THREE.PMREMGenerator(gl);
  const env = pmrem.fromEquirectangular(hdr).texture;
  hdr.dispose();
  pmrem.dispose();
  return env;
}

const cache = new Map<string, THREE.Texture>();

/** A tileable normal map (linear colour space, repeating). Each call returns its own clone so repeats can differ. */
export function normalMap(name: string, repeat = 1) {
  let base = cache.get(name);
  if (!base) {
    base = new THREE.TextureLoader().load(`/textures/normals/${name}.webp`);
    base.colorSpace = THREE.NoColorSpace;
    base.wrapS = base.wrapT = THREE.RepeatWrapping;
    base.anisotropy = 8;
    cache.set(name, base);
  }
  const t = base.clone();
  t.repeat.set(repeat, repeat);
  t.needsUpdate = true;
  return t;
}

/** Film-like tone mapping shared by every scene. */
export const TONE = { toneMapping: THREE.AgXToneMapping, toneMappingExposure: 1.0 };

/**
 * Guards a material's output against NaN / Infinity and caps extreme highlights.
 * Thin transmissive glass can produce the odd invalid pixel; invisible on its own, but depth of
 * field and bloom spread it into a black hole with a coloured ring. Cheap and safe for any material.
 */
export function finiteOutput<T extends THREE.Material>(material: T, maxValue = 48): T {
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    prev?.call(material, shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <dithering_fragment>",
      `#include <dithering_fragment>
      if (any(isnan(gl_FragColor)) || any(isinf(gl_FragColor))) gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      gl_FragColor.rgb = min(gl_FragColor.rgb, vec3(${maxValue.toFixed(1)}));`,
    );
  };
  const key = material.customProgramCacheKey?.bind(material);
  material.customProgramCacheKey = () => `${key ? key() : ""}|finite`;
  return material;
}
