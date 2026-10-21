"use client";

import { useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { AdditiveBlending, Color, DoubleSide, InstancedMesh, MathUtils, Object3D, type Group, type MeshBasicMaterial, type MeshStandardMaterial } from "three";

const RAIN = 900;

// Deterministic pseudo-random in [0, 1): keeps render pure.
const rand = (i: number, k: number) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export function Rain({ amountRef }: { amountRef: RefObject<number> }) {
  const mesh = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const drops = useMemo(
    () => Array.from({ length: RAIN }, (_, i) => ({ x: (rand(i, 1) - 0.5) * 14, y: rand(i, 2) * 7, z: -8 + rand(i, 3) * 7.5, v: 7 + rand(i, 4) * 4 })),
    [],
  );

  useFrame((_, dt) => {
    const m = mesh.current;
    if (!m) return;
    const a = amountRef.current ?? 0;
    (m.material as MeshBasicMaterial).opacity = a * 0.38;
    m.visible = a > 0.02;
    if (!m.visible) return;
    const d = Math.min(dt, 0.05);
    drops.forEach((p, i) => {
      p.y -= p.v * d;
      p.x += 0.6 * d; // slanted by the wind
      if (p.y < 0) {
        p.y = 7;
        p.x = (Math.random() - 0.5) * 14;
      }
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.z = -0.08;
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, RAIN]} frustumCulled={false}>
      <boxGeometry args={[0.004, 0.2, 0.004]} />
      <meshBasicMaterial color="#c9d8ff" transparent opacity={0} depthWrite={false} blending={AdditiveBlending} />
    </instancedMesh>
  );
}

// Random lightning while the weather is stormy. Writes into flashRef (0..1).
// Flash decays by elapsed time, not per frame, so throttled frames never leave it stuck on.
export function Lightning({ stormRef, flashRef }: { stormRef: RefObject<number>; flashRef: RefObject<number> }) {
  const strike = useRef({ next: 4, at: -10, double: -10, n: 0 });
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const k = strike.current;
    if ((stormRef.current ?? 0) > 0.75 && t > k.next) {
      k.n += 1;
      k.at = t;
      k.double = rand(k.n, 11) < 0.5 ? t + 0.18 : -10;
      k.next = t + 3 + rand(k.n, 12) * 5;
    }
    const decay = (since: number) => (since >= 0 ? Math.exp(-since * 9) : 0);
    flashRef.current = Math.max(decay(t - k.at) * 0.9, decay(t - k.double) * 0.7);
  });
  return null;
}

// Rainbow that fades in on a comeback or a great run.
export function Rainbow({ show }: { show: boolean }) {
  const g = useRef<Group>(null);
  const colors = useMemo(() => ["#ff5a5f", "#ff9f1c", "#ffe066", "#7bd389", "#4cc9f0", "#4361ee", "#9d4edd"], []);
  useFrame((_, dt) => {
    if (!g.current) return;
    const o = MathUtils.damp((g.current.userData.o as number) ?? 0, show ? 1 : 0, 1.5, Math.min(dt, 0.05));
    g.current.userData.o = o;
    g.current.visible = o > 0.01;
    g.current.children.forEach((c) => (((c as unknown as { material: MeshStandardMaterial }).material).opacity = o * 0.32));
  });
  return (
    <group ref={g} position={[0.5, -0.5, -9]} visible={false}>
      {colors.map((c, i) => (
        <mesh key={c}>
          <torusGeometry args={[6.4 - i * 0.16, 0.08, 8, 96, Math.PI]} />
          <meshBasicMaterial color={c} transparent opacity={0} depthWrite={false} side={DoubleSide} blending={AdditiveBlending} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

// Warm fireflies that multiply with the streak.
export function Fireflies({ streak, sunny }: { streak: number; sunny: number }) {
  const count = Math.min(10 + streak * 14, 90);
  const color = useMemo(() => new Color(sunny > 0.5 ? "#ffe27a" : "#9fe7ff"), [sunny]);
  return (
    <Sparkles key={count} count={count} scale={[7, 3, 5]} position={[0, 1.4, -1]} size={streak >= 3 ? 7 : 4} speed={0.35 + streak * 0.08} color={color} opacity={0.9} />
  );
}

// Falling petals while celebrating.
export function Petals({ active }: { active: boolean }) {
  const mesh = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const seeds = useMemo(() => Array.from({ length: 120 }, (_, i) => ({ x: (rand(i, 5) - 0.5) * 8, y: rand(i, 6) * 6, z: -4 + rand(i, 7) * 6, s: 0.5 + rand(i, 8), r: rand(i, 9) * 6 })), []);
  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const palette = ["#ff8fa3", "#ffd6e0", "#f6d44a", "#ffffff"];
    seeds.forEach((_, i) => m.setColorAt(i, new Color(palette[i % palette.length])));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [seeds]);
  useFrame((state, dt) => {
    const m = mesh.current;
    if (!m) return;
    m.visible = active;
    if (!active) return;
    const t = state.clock.elapsedTime;
    seeds.forEach((p, i) => {
      p.y -= 0.6 * p.s * Math.min(dt, 0.05);
      if (p.y < 0) p.y = 6;
      dummy.position.set(p.x + Math.sin(t + p.r) * 0.4, p.y, p.z);
      dummy.rotation.set(t * p.s + p.r, t * 0.7 + p.r, t * 0.5);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, seeds.length]} frustumCulled={false} visible={false}>
      <circleGeometry args={[0.035, 6]} />
      <meshStandardMaterial side={DoubleSide} roughness={0.6} />
    </instancedMesh>
  );
}

// Butterflies wander around the garden while the weather is good.
export function Butterflies({ sunnyRef }: { sunnyRef: RefObject<number> }) {
  const refs = useRef<(Group | null)[]>([]);
  const wings = useRef<(Group | null)[]>([]);
  const colors = ["#ff9f1c", "#4cc9f0", "#ffffff", "#f6d44a", "#ff8fa3", "#9d4edd"];
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const vis = MathUtils.smoothstep(sunnyRef.current ?? 0, 0.45, 0.7);
    refs.current.forEach((g, i) => {
      if (!g) return;
      const a = t * (0.25 + rand(i, 20) * 0.2) + i * 1.7;
      const r = 1.1 + rand(i, 21) * 1.6;
      g.position.set(Math.cos(a) * r, 0.5 + Math.sin(t * 0.9 + i) * 0.35 + rand(i, 22) * 0.8, Math.sin(a) * r * 0.7 - 0.6);
      g.rotation.y = -a + Math.PI / 2;
      g.scale.setScalar(vis);
      g.visible = vis > 0.02;
    });
    wings.current.forEach((w, i) => {
      if (w) w.rotation.z = Math.sin(t * 18 + i) * 0.9 * (i % 2 ? 1 : -1);
    });
  });
  return (
    <>
      {colors.map((c, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el; }}>
          {[0, 1].map((side) => (
            <group key={side} ref={(el) => { wings.current[i * 2 + side] = el; }}>
              <mesh position={[side ? 0.045 : -0.045, 0, 0]}>
                <circleGeometry args={[0.05, 12]} />
                <meshStandardMaterial color={c} side={DoubleSide} emissive={c} emissiveIntensity={0.25} roughness={0.6} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </>
  );
}

// Leaves drifting down all the time; the wind blows them sideways.
export function Leaves({ windRef }: { windRef: RefObject<number> }) {
  const mesh = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const leaves = useMemo(
    () => Array.from({ length: 45 }, (_, i) => ({ x: (rand(i, 30) - 0.5) * 9, y: rand(i, 31) * 5, z: -5 + rand(i, 32) * 6.5, s: 0.6 + rand(i, 33) * 0.8, r: rand(i, 34) * 6 })),
    [],
  );
  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const palette = ["#7fa34a", "#b8a03a", "#c7742d", "#5f8a3a"];
    leaves.forEach((_, i) => m.setColorAt(i, new Color(palette[i % palette.length])));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [leaves]);
  useFrame((state, dt) => {
    const m = mesh.current;
    if (!m) return;
    const t = state.clock.elapsedTime;
    const w = windRef.current ?? 0;
    const d = Math.min(dt, 0.05);
    leaves.forEach((p, i) => {
      p.y -= (0.25 + w * 0.6) * p.s * d;
      p.x += (0.15 + w * 1.6) * d;
      if (p.y < 0 || p.x > 5) {
        p.y = 4.5 + rand(i, t) * 1.5;
        p.x = -5 + rand(i, t + 1) * 3;
      }
      dummy.position.set(p.x + Math.sin(t * 1.3 + p.r) * 0.3, p.y, p.z);
      dummy.rotation.set(t * p.s + p.r, t * 0.8 + p.r, Math.sin(t * 2 + p.r));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, leaves.length]} frustumCulled={false}>
      <planeGeometry args={[0.07, 0.045]} />
      <meshStandardMaterial side={DoubleSide} roughness={0.7} />
    </instancedMesh>
  );
}
