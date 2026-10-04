"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { DIM, type BrandTextures, bagParts, ribbonGeometry } from "@/lib/packaging";
import { finiteOutput, normalMap } from "@/lib/realism";

/**
 * Shared pieces of the packaging model, used both by the unboxing stage and by the
 * saffron field (where the bag first appears among the crocus rows).
 */

export function useMaterials(tx: BrandTextures) {
  return useMemo(() => {
    const kraft = (repeat = 1, offset = 0) => {
      const map = tx.kraft.clone();
      map.repeat.set(repeat, repeat);
      map.offset.set(offset, offset * 0.7);
      map.needsUpdate = true;
      // Real paper fibre relief (normal map) instead of a flat bump: catches grazing light like card stock.
      return new THREE.MeshStandardMaterial({
        map,
        normalMap: normalMap("fine-grain", 2.5),
        normalScale: new THREE.Vector2(0.45, 0.45),
        roughness: 0.92,
        color: "#efe4d2",
      });
    };
    const glass = finiteOutput(new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      transmission: 1,
      thickness: 0.06,
      // Not perfectly mirror-smooth: near-zero roughness makes spot-light highlights so intense they
      // overflow the post-processing buffers (black specks, grey bloom haze). Real glass isn't that smooth either.
      roughness: 0.08,
      ior: 1.5,
      specularIntensity: 0.9,
      envMapIntensity: 1.0,
      clearcoat: 0.6,
      clearcoatRoughness: 0.09,
      side: THREE.DoubleSide,
    }));
    const tintedGlass = (color: string, attenuation: string) =>
      finiteOutput(new THREE.MeshPhysicalMaterial({
        color,
        transmission: 0.55,
        thickness: 0.08,
        roughness: 0.12,
        ior: 1.5,
        attenuationColor: new THREE.Color(attenuation),
        attenuationDistance: 0.05,
        emissive: new THREE.Color(attenuation),
        emissiveIntensity: 0.12,
        envMapIntensity: 1.5,
        clearcoat: 0.6,
        clearcoatRoughness: 0.1,
      }));
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
        m.normalMap = normalMap("paper-crumple", 1.1);
        m.normalScale.set(0.35, 0.35);
        return m;
      })(),
      bagFront: new THREE.MeshStandardMaterial({
        color: "#f6eee0",
        map: tx.bagFront,
        roughness: 0.9,
        normalMap: normalMap("paper-crumple", 1.1),
        normalScale: new THREE.Vector2(0.35, 0.35),
      }),
      ribbon: new THREE.MeshPhysicalMaterial({
        color: "#4b1f8f",
        roughness: 0.35,
        sheen: 1,
        sheenColor: new THREE.Color("#b58cff"),
        sheenRoughness: 0.3,
        side: THREE.DoubleSide,
      }),
      violet: new THREE.MeshStandardMaterial({
        map: tx.violetPaper,
        roughness: 0.78,
        side: THREE.DoubleSide,
        normalMap: normalMap("fine-leather", 3),
        normalScale: new THREE.Vector2(0.2, 0.2),
      }),
      foam: new THREE.MeshStandardMaterial({
        color: "#141416",
        roughness: 1,
        normalMap: normalMap("foam", 5),
        normalScale: new THREE.Vector2(1.4, 1.4),
      }),
      glass,
      violetGlass: tintedGlass("#8f6be6", "#5a2fb0"),
      pinkGlass: tintedGlass("#f0cdeb", "#c98bd8"),
      greenGlass: tintedGlass("#8fd07a", "#2f7a2a"),
      clearGlass: tintedGlass("#ffffff", "#ffffff"),
      seal: finiteOutput(new THREE.MeshPhysicalMaterial({ map: tx.seal, color: "#b9a58c", roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.12, transmission: 0.25, thickness: 0.01 })),
      saffron: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62 }),
      twine: new THREE.MeshStandardMaterial({ color: "#b48d5e", roughness: 0.95 }),
      cardFront: new THREE.MeshStandardMaterial({ map: tx.cardFront, roughness: 0.9, normalMap: normalMap("fine-grain", 1.5), normalScale: new THREE.Vector2(0.3, 0.3) }),
      cardBack: new THREE.MeshStandardMaterial({ map: tx.cardBack, roughness: 0.9, normalMap: normalMap("fine-grain", 1.5), normalScale: new THREE.Vector2(0.3, 0.3) }),
      cardEdge: new THREE.MeshStandardMaterial({ color: "#c9a878", roughness: 0.9 }),
      floor: new THREE.MeshStandardMaterial({ color: "#020202", roughness: 0.85, metalness: 0.0, envMapIntensity: 0.08, transparent: true, opacity: 0 }),
    };
  }, [tx]);
}

export type Mats = ReturnType<typeof useMaterials>;

/** The kraft carrier bag with violet ribbon handles. */
export function Bag({ m }: { m: Mats }) {
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
