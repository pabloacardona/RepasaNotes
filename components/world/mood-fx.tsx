"use client";

import { useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import { useMemo, useRef } from "react";
import { DoubleSide, MathUtils, type Group, type Mesh, type MeshStandardMaterial } from "three";
import { glyphTexture } from "./sprites";

const BLUE = "#3651d4";

export type Fx = "question" | "exclaim" | "zzz" | "sweat" | "tear" | "tears" | "flame" | "sparkles" | "confetti" | "cloud";

// Effects around the character, laid out for a ~1 unit tall character standing at the origin.
export function FadeIn({ on, children, speed = 6 }: { on: boolean; children: React.ReactNode; speed?: number }) {
  const g = useRef<Group>(null);
  useFrame((_, dt) => {
    if (!g.current) return;
    const s = MathUtils.damp(g.current.scale.x, on ? 1 : 0, speed, Math.min(dt, 0.05));
    g.current.scale.setScalar(s);
    g.current.visible = s > 0.01;
  });
  return (
    <group ref={g} scale={0}>
      {children}
    </group>
  );
}

function Glyph({ glyph, color, position, float = 0.05, size = 0.22 }: { glyph: string; color: string; position: [number, number, number]; float?: number; size?: number }) {
  const ref = useRef<Group>(null);
  const map = useMemo(() => glyphTexture(glyph, color), [glyph, color]);
  useFrame((s) => {
    if (ref.current) {
      ref.current.position.y = position[1] + Math.sin(s.clock.elapsedTime * 3) * float;
      ref.current.rotation.z = Math.sin(s.clock.elapsedTime * 2) * 0.15;
    }
  });
  return (
    <group ref={ref} position={position}>
      <sprite scale={size}>
        <spriteMaterial map={map} transparent depthWrite={false} />
      </sprite>
    </group>
  );
}

function Zzz() {
  const refs = useRef<(Group | null)[]>([]);
  const map = useMemo(() => glyphTexture("Z", "#e3e8fb", BLUE), []);
  useFrame((s) => {
    refs.current.forEach((r, i) => {
      if (!r) return;
      const k = (s.clock.elapsedTime * 0.45 + i / 3) % 1;
      r.position.set(0.25 + k * 0.25, 0.9 + k * 0.5, 0);
      r.scale.setScalar(0.08 + k * 0.14);
      (r.children[0] as unknown as { material: { opacity: number } }).material.opacity = Math.sin(k * Math.PI);
    });
  });
  return (
    <>
      {[0, 1, 2].map((i) => (
        <group key={i} ref={(el) => { refs.current[i] = el; }}>
          <sprite>
            <spriteMaterial map={map} transparent depthWrite={false} />
          </sprite>
        </group>
      ))}
    </>
  );
}

function Flame() {
  const refs = useRef<(Mesh | null)[]>([]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    refs.current.forEach((r, i) => {
      if (!r) return;
      const a = (i / 7) * Math.PI * 2;
      const flick = 0.75 + Math.sin(t * 14 + i * 1.7) * 0.25;
      r.position.set(Math.cos(a) * 0.36, 0.5 + Math.sin(a) * 0.05, Math.sin(a) * 0.36 - 0.05);
      r.scale.set(flick * 0.9, flick * (1.2 + Math.sin(t * 9 + i) * 0.3), flick * 0.9);
    });
  });
  return (
    <>
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el; }}>
          <coneGeometry args={[0.08, 0.36, 12]} />
          <meshStandardMaterial color="#ff7a00" emissive="#ff4d00" emissiveIntensity={2.5} transparent opacity={0.75} depthWrite={false} />
        </mesh>
      ))}
      <pointLight position={[0, 0.6, 0.4]} color="#ff7a00" intensity={3} distance={2.5} />
    </>
  );
}

function RainCloud() {
  const g = useRef<Group>(null);
  const drops = useRef<(Mesh | null)[]>([]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (g.current) g.current.position.x = Math.sin(t * 0.8) * 0.05;
    drops.current.forEach((d, i) => {
      if (!d) return;
      const k = (t * 1.6 + i / 6) % 1;
      d.position.set(-0.15 + (i % 3) * 0.15, 1.28 - k * 0.42, (i % 2) * 0.08);
      (d.material as MeshStandardMaterial).opacity = 1 - k;
    });
  });
  return (
    <group ref={g}>
      {[[-0.12, 1.36, 0], [0.04, 1.4, 0.02], [0.18, 1.35, 0], [0.03, 1.32, 0.08]].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}>
          <sphereGeometry args={[0.11, 16, 12]} />
          <meshStandardMaterial color="#7d8597" roughness={1} />
        </mesh>
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} ref={(el) => { drops.current[i] = el; }}>
          <capsuleGeometry args={[0.007, 0.04, 2, 6]} />
          <meshStandardMaterial color="#8fd3ff" transparent />
        </mesh>
      ))}
    </group>
  );
}

function Confetti() {
  const refs = useRef<(Mesh | null)[]>([]);
  const seeds = useMemo(() => Array.from({ length: 40 }, (_, i) => ({ x: (Math.sin(i * 12.9898) * 43758.5453) % 1, z: (Math.sin(i * 78.233) * 12345.678) % 1, s: 0.6 + ((i * 37) % 10) / 10, c: ["#f6d44a", "#3651d4", "#24875a", "#ff8fa3", "#ffffff"][i % 5] })), []);
  useFrame((st) => {
    const t = st.clock.elapsedTime;
    refs.current.forEach((r, i) => {
      if (!r) return;
      const sd = seeds[i];
      const k = (t * 0.25 * sd.s + i / 40) % 1;
      r.position.set(sd.x * 1.6, 2.2 - k * 2.4, sd.z * 1.2);
      r.rotation.set(t * 3 * sd.s, t * 2 + i, t * sd.s);
    });
  });
  return (
    <>
      {seeds.map((sd, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el; }}>
          <planeGeometry args={[0.04, 0.07]} />
          <meshStandardMaterial color={sd.c} side={DoubleSide} emissive={sd.c} emissiveIntensity={0.3} />
        </mesh>
      ))}
    </>
  );
}

export function MoodFx({ fx }: { fx: Fx[] }) {
  const has = (f: Fx) => fx.includes(f);
  return (
    <>
      <FadeIn on={has("question")}>
        <Glyph glyph="?" color="#ffffff" position={[0.42, 1.15, 0]} />
      </FadeIn>
      <FadeIn on={has("exclaim")} speed={12}>
        <Glyph glyph="!" color="#f6d44a" position={[-0.42, 1.15, 0]} size={0.28} />
      </FadeIn>
      <FadeIn on={has("zzz")}>
        <Zzz />
      </FadeIn>
      <FadeIn on={has("flame")} speed={8}>
        <Flame />
      </FadeIn>
      <FadeIn on={has("cloud")}>
        <RainCloud />
      </FadeIn>
      <FadeIn on={has("confetti")}>
        <Confetti />
      </FadeIn>
      <FadeIn on={has("sparkles")}>
        <Sparkles count={28} scale={[1.6, 1.6, 1.2]} position={[0, 0.6, 0]} size={5} speed={0.8} color="#ffe27a" />
      </FadeIn>
    </>
  );
}
