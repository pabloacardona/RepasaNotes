"use client";

import { useFrame } from "@react-three/fiber";
import { RoundedBox, Sparkles, useTexture } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import {
  CatmullRomCurve3,
  Color,
  ExtrudeGeometry,
  LatheGeometry,
  RepeatWrapping,
  Shape,
  TubeGeometry,
  Vector2,
  Vector3,
  type Group,
} from "three";

export type TrophyTier = "gold" | "silver" | "bronze";

// Physically based metal base colours (linear reflectance of real metals).
const METALS: Record<TrophyTier, { color: string; rough: number; sparkle: string; label: string }> = {
  gold: { color: "#ffcf5a", rough: 0.16, sparkle: "#ffe27a", label: "oro" },
  silver: { color: "#e8ebf0", rough: 0.12, sparkle: "#e3e8fb", label: "plata" },
  bronze: { color: "#d08a52", rough: 0.24, sparkle: "#f0c08a", label: "bronce" },
};

// Cup profile (radius, height), revolved around Y. Hand-tuned silhouette:
// flared lip, deep bowl, collar, knotted stem and stepped foot.
const PROFILE: [number, number][] = [
  [0.0, 0.0], [0.2, 0.0], [0.205, 0.012], [0.2, 0.024], [0.17, 0.03], [0.165, 0.045], [0.13, 0.06],
  [0.07, 0.08], [0.05, 0.1], [0.045, 0.16], [0.07, 0.185], [0.075, 0.2], [0.07, 0.215], [0.045, 0.24],
  [0.04, 0.3], [0.06, 0.32], [0.09, 0.335], [0.1, 0.345], [0.09, 0.36],
  [0.11, 0.38], [0.17, 0.42], [0.22, 0.48], [0.255, 0.56], [0.27, 0.64], [0.275, 0.7], [0.29, 0.73],
  [0.3, 0.745], [0.292, 0.755], [0.27, 0.745], [0.255, 0.72], [0.25, 0.66], [0.235, 0.56], [0.2, 0.48],
  [0.14, 0.42], [0.08, 0.4], [0.0, 0.395],
];

function starShape(outer: number, inner: number) {
  const s = new Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer;
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  s.closePath();
  return s;
}

export function Trophy({ tier, position = [0, 0, 0], scale = 1 }: { tier: TrophyTier; position?: [number, number, number]; scale?: number }) {
  const m = METALS[tier];
  const spin = useRef<Group>(null);
  const appear = useRef(0);

  const [metalRough, metalNormal, marbleMap, marbleNormal, marbleRough, woodMap, woodNormal, woodRough] = useTexture([
    "/3d/textures/metal_plate_rough.webp",
    "/3d/textures/metal_plate_nor_gl.webp",
    "/3d/textures/marble_01_diffuse.webp",
    "/3d/textures/marble_01_nor_gl.webp",
    "/3d/textures/marble_01_rough.webp",
    "/3d/textures/wood_table_worn_diffuse.webp",
    "/3d/textures/wood_table_worn_nor_gl.webp",
    "/3d/textures/wood_table_worn_rough.webp",
  ]);
  useMemo(() => {
    for (const t of [metalRough, metalNormal]) {
      t.wrapS = t.wrapT = RepeatWrapping;
      t.repeat.set(2, 2);
    }
  }, [metalRough, metalNormal]);

  const geo = useMemo(() => {
    const cup = new LatheGeometry(PROFILE.map(([r, h]) => new Vector2(r, h)), 128);
    const handle = (side: number) =>
      new TubeGeometry(
        new CatmullRomCurve3([
          new Vector3(side * 0.25, 0.68, 0),
          new Vector3(side * 0.39, 0.7, 0),
          new Vector3(side * 0.43, 0.6, 0),
          new Vector3(side * 0.36, 0.5, 0),
          new Vector3(side * 0.22, 0.46, 0),
        ]),
        64,
        0.022,
        16,
        false,
      );
    const star = new ExtrudeGeometry(starShape(0.07, 0.03), { depth: 0.012, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 3 });
    return { cup, left: handle(-1), right: handle(1), star };
  }, []);
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);

  const metal = (
    <meshPhysicalMaterial
      color={m.color}
      metalness={1}
      roughness={m.rough}
      roughnessMap={metalRough}
      normalMap={metalNormal}
      normalScale={[0.08, 0.08]}
      clearcoat={0.6}
      clearcoatRoughness={0.08}
      envMapIntensity={1.4}
    />
  );

  useFrame((state, dt) => {
    appear.current = Math.min(1, appear.current + dt * 0.9);
    const k = 1 - Math.pow(1 - appear.current, 3);
    if (spin.current) {
      spin.current.rotation.y = state.clock.elapsedTime * 0.5;
      spin.current.scale.setScalar(k);
      spin.current.position.y = 0.21 + Math.sin(state.clock.elapsedTime * 1.5) * 0.008;
    }
  });

  return (
    <group position={position} scale={scale}>
      {/* Plinth: worn wood block with a marble slab */}
      <RoundedBox args={[0.5, 0.12, 0.5]} radius={0.015} smoothness={3} position={[0, 0.06, 0]} castShadow receiveShadow>
        <meshStandardMaterial map={woodMap} normalMap={woodNormal} roughnessMap={woodRough} roughness={0.8} color="#8a5a3c" />
      </RoundedBox>
      <RoundedBox args={[0.42, 0.09, 0.42]} radius={0.012} smoothness={3} position={[0, 0.165, 0]} castShadow receiveShadow>
        <meshPhysicalMaterial map={marbleMap} normalMap={marbleNormal} roughnessMap={marbleRough} roughness={0.25} clearcoat={0.7} color="#2a2f3a" />
      </RoundedBox>
      {/* Engraved plaque */}
      <mesh position={[0, 0.06, 0.252]}>
        <boxGeometry args={[0.26, 0.07, 0.006]} />
        {metal}
      </mesh>

      <group ref={spin}>
        <mesh geometry={geo.cup} castShadow receiveShadow>
          {metal}
        </mesh>
        <mesh geometry={geo.left} castShadow>
          {metal}
        </mesh>
        <mesh geometry={geo.right} castShadow>
          {metal}
        </mesh>
        <mesh geometry={geo.star} position={[0, 0.56, 0.255]} rotation={[-0.32, 0, 0]}>
          <meshPhysicalMaterial color={new Color(m.color).offsetHSL(0, 0.1, 0.05)} metalness={1} roughness={0.08} emissive={m.color} emissiveIntensity={0.15} />
        </mesh>
      </group>

      <Sparkles count={36} scale={[0.9, 1.1, 0.9]} position={[0, 0.65, 0]} size={4} speed={0.5} color={m.sparkle} />
    </group>
  );
}

export const TROPHY_LABEL = (t: TrophyTier) => METALS[t].label;
