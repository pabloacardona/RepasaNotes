"use client";

/* eslint-disable react-hooks/immutability -- three.js scene objects, textures and refs are mutated by design inside useFrame and setup effects */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, RoundedBox, Sparkles, useAnimations, useGLTF, useTexture } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import type { BloomEffect } from "postprocessing";
import { Suspense, useEffect, useMemo, useRef } from "react";
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  Box3,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  ExtrudeGeometry,
  LoopOnce,
  LoopRepeat,
  MathUtils,
  NormalBlending,
  Object3D,
  PCFSoftShadowMap,
  Quaternion,
  RepeatWrapping,
  Shape,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Vector3,
  type AnimationAction,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
  type PerspectiveCamera,
  type PointLight,
  type SpotLight,
  type Texture,
} from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";

// Hephaestus at work: a stocky smith hammering a glowing quiz tablet on a London-pattern anvil, in a stone forge lit
// by the hearth on one side and cool moonlight on the other.
// Character: KayKit "Adventurers" Barbarian (CC0, Kay Lousberg), rigged and animated. The head is rebuilt here and the
// smith is dressed with a leather apron, gauntlets, tool belt and a laurel wreath. Textures: Poly Haven (CC0) PBR at 2k.
//
// Coordination of the blow: when the scene loads, the chop clip is sampled once to find the exact instant the hammer is
// lowest and where it is. The anvil is placed under that point, and at that same clip time the sparks, shockwave, flash,
// smoke, tablet heat, bloom and camera kick all fire. The clip runs slow on the wind-up, fast on the strike and holds a
// beat on the anvil. After three blows the smith pauses to inspect the piece, then starts again.

const CLIP = "1H_Melee_Attack_Chop";
const REST = "Interact";
const BLOWS_PER_PIECE = 3;
const SMITH_X = -0.1;
const HEAD_HALF = 0.085; // half the height of the hammer head: its face touches the tablet this far below its centre
const FACE = 0.86; // authored height of the anvil face
const TABLET = 0.04; // thickness of the tablet being forged: the hammer lands on top of it
const HEARTH = new Vector3(-2.05, 0, -0.95);
const BG = "#110d14";

type Shared = {
  impact: { current: number }; // a fresh value (> 1) for each blow, so every system can detect it once
  flame: { current: number }; // 1 at the blow, gone in ~0.4 s: flash, shake, squint, bloom
  heat: { current: number }; // tablet heat 0..1: jumps at the blow, cools slowly
  blows: { current: number }; // blows landed on the current piece
  hit: Vector3; // where the hammer head centre is at the moment of impact
  top: { current: number }; // height of the surface the hammer lands on (tablet top)
  ready: { current: boolean };
};

function usePbr(name: string, low: boolean, repeat: [number, number] = [1, 1]) {
  const base = `/3d/forge/${low ? "lo/" : ""}${name}`;
  const [map, normalMap, arm] = useTexture([`${base}_diff.webp`, `${base}_nor.webp`, `${base}_arm.webp`]);
  useMemo(() => {
    map.colorSpace = SRGBColorSpace;
    for (const t of [map, normalMap, arm] as Texture[]) {
      t.wrapS = t.wrapT = RepeatWrapping;
      t.repeat.set(repeat[0], repeat[1]);
      t.anisotropy = low ? 2 : 8;
    }
  }, [map, normalMap, arm, repeat, low]);
  // Poly Haven "arm" map: R = ambient occlusion, G = roughness, B = metalness.
  return { map, normalMap, roughnessMap: arm, metalnessMap: arm };
}

// A soft radial blob, drawn once: used by the flames and the smoke.
function useSoftTexture() {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.3, "rgba(255,255,255,0.6)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

// ---------- Sparks: bright heads with motion-blur tails, cooling from white to deep red ----------

function Sparks({ shared, low }: { shared: Shared; low: boolean }) {
  const n = low ? 70 : 150;
  const st = useMemo(
    () => ({
      head: new Float32Array(n * 3),
      col: new Float32Array(n * 3),
      tail: new Float32Array(n * 6),
      tcol: new Float32Array(n * 6),
      vel: new Float32Array(n * 3),
      life: new Float32Array(n),
      max: new Float32Array(n),
      seen: 0,
    }),
    [n],
  );
  const geoP = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(st.head, 3));
    g.setAttribute("color", new BufferAttribute(st.col, 3));
    return g;
  }, [st]);
  const geoL = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(st.tail, 3));
    g.setAttribute("color", new BufferAttribute(st.tcol, 3));
    return g;
  }, [st]);
  useEffect(
    () => () => {
      geoP.dispose();
      geoL.dispose();
    },
    [geoP, geoL],
  );

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    if (shared.impact.current > 1 && st.seen !== shared.impact.current) {
      st.seen = shared.impact.current;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const out = 0.3 + Math.random() * 2.2;
        const up = 0.6 + Math.random() * 3.2;
        st.head.set([shared.hit.x + (Math.random() - 0.5) * 0.1, shared.top.current + 0.015, shared.hit.z + (Math.random() - 0.5) * 0.08], i * 3);
        // Slightly biased away from the smith, towards the camera: the metal spits forward.
        st.vel.set([Math.cos(a) * out + 0.35, up, Math.sin(a) * out + 0.25], i * 3);
        st.max[i] = st.life[i] = 0.3 + Math.random() * 0.9;
      }
    }
    for (let i = 0; i < n; i++) {
      const p = i * 3;
      if (st.life[i] <= 0) {
        st.head[p + 1] = -10;
        st.tail[p * 2 + 1] = st.tail[p * 2 + 4] = -10;
        st.col[p] = st.col[p + 1] = st.col[p + 2] = 0;
        continue;
      }
      st.life[i] -= d;
      st.vel[p + 1] -= 7.5 * d;
      const drag = 1 - 0.55 * d;
      st.vel[p] *= drag;
      st.vel[p + 2] *= drag;
      st.head[p] += st.vel[p] * d;
      st.head[p + 1] += st.vel[p + 1] * d;
      st.head[p + 2] += st.vel[p + 2] * d;
      if (st.head[p + 1] < 0.015) {
        st.head[p + 1] = 0.015;
        st.vel[p + 1] *= -0.35;
        st.vel[p] *= 0.6;
        st.vel[p + 2] *= 0.6;
      }
      // Colour cools with age: white-yellow, orange, then dim red that fades out.
      const k = Math.max(0, st.life[i] / st.max[i]);
      const b = Math.pow(k, 0.6) * 1.8;
      const r = b;
      const g = b * (0.18 + 0.82 * Math.pow(k, 1.6));
      const bl = b * 0.55 * Math.pow(k, 4);
      st.col[p] = r;
      st.col[p + 1] = g;
      st.col[p + 2] = bl;
      // The tail trails the head by a few milliseconds of travel.
      const t = 0.028;
      st.tail[p * 2] = st.head[p];
      st.tail[p * 2 + 1] = st.head[p + 1];
      st.tail[p * 2 + 2] = st.head[p + 2];
      st.tail[p * 2 + 3] = st.head[p] - st.vel[p] * t;
      st.tail[p * 2 + 4] = Math.max(0.01, st.head[p + 1] - st.vel[p + 1] * t);
      st.tail[p * 2 + 5] = st.head[p + 2] - st.vel[p + 2] * t;
      st.tcol[p * 2] = r;
      st.tcol[p * 2 + 1] = g;
      st.tcol[p * 2 + 2] = bl;
      st.tcol[p * 2 + 3] = r * 0.2;
      st.tcol[p * 2 + 4] = g * 0.2;
      st.tcol[p * 2 + 5] = bl * 0.2;
    }
    geoP.attributes.position.needsUpdate = true;
    geoP.attributes.color.needsUpdate = true;
    geoL.attributes.position.needsUpdate = true;
    geoL.attributes.color.needsUpdate = true;
  });

  return (
    <>
      <points geometry={geoP} frustumCulled={false}>
        <pointsMaterial vertexColors size={low ? 0.035 : 0.042} sizeAttenuation transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </points>
      <lineSegments geometry={geoL} frustumCulled={false}>
        <lineBasicMaterial vertexColors transparent opacity={0.85} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </lineSegments>
    </>
  );
}

// Two rings of light that race over the anvil face the instant the blow lands.
function Shockwave({ shared }: { shared: Shared }) {
  const ring0 = useRef<Mesh>(null);
  const ring1 = useRef<Mesh>(null);
  const mat0 = useRef<MeshBasicMaterial>(null);
  const mat1 = useRef<MeshBasicMaterial>(null);
  const age = useRef(9);
  const seen = useRef(0);
  useFrame((_, dt) => {
    if (shared.impact.current > 1 && seen.current !== shared.impact.current) {
      seen.current = shared.impact.current;
      age.current = 0;
    }
    age.current += dt;
    const rings = [ring0.current, ring1.current];
    const mats = [mat0.current, mat1.current];
    for (let i = 0; i < 2; i++) {
      const r = rings[i];
      const m = mats[i];
      if (!r || !m) continue;
      const k = Math.min(1, Math.max(0, (age.current - i * 0.07) / 0.42));
      r.visible = k > 0 && k < 1;
      r.position.set(shared.hit.x, shared.top.current + 0.01 + i * 0.004, shared.hit.z);
      r.scale.setScalar(0.06 + k * (0.75 - i * 0.2));
      m.opacity = (1 - k) * (1 - k) * (i ? 0.5 : 0.95);
    }
  });
  return (
    <>
      <mesh ref={ring0} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.78, 1, 56]} />
        <meshBasicMaterial ref={mat0} color="#fff0d0" transparent opacity={0} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} toneMapped={false} />
      </mesh>
      <mesh ref={ring1} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.78, 1, 56]} />
        <meshBasicMaterial ref={mat1} color="#ff9a4a" transparent opacity={0} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} toneMapped={false} />
      </mesh>
    </>
  );
}

// ---------- Embers: a steady drift of glowing motes rising from the hearth ----------

// Cheap deterministic pseudo-random in [0, 1): render must stay pure, so no Math.random at setup.
function hash(i: number, k: number) {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function Embers({ shared, low }: { shared: Shared; low: boolean }) {
  const n = low ? 28 : 70;
  const st = useMemo(() => {
    const s = { pos: new Float32Array(n * 3), col: new Float32Array(n * 3), vel: new Float32Array(n * 3), life: new Float32Array(n), max: new Float32Array(n) };
    // Staggered deterministically so the first frame already shows a spread of embers, not a burst.
    for (let i = 0; i < n; i++) {
      s.max[i] = 1.6 + hash(i, 1) * 1.8;
      s.life[i] = hash(i, 2) * s.max[i];
      s.pos.set([HEARTH.x + (hash(i, 3) - 0.5) * 0.7, HEARTH.y + 0.8 + hash(i, 4) * 1.4, HEARTH.z + (hash(i, 5) - 0.5) * 0.3], i * 3);
      s.vel.set([(hash(i, 6) - 0.5) * 0.2, 0.3 + hash(i, 7) * 0.45, (hash(i, 8) - 0.5) * 0.2], i * 3);
    }
    return s;
  }, [n]);
  const geo = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(st.pos, 3));
    g.setAttribute("color", new BufferAttribute(st.col, 3));
    return g;
  }, [st]);
  useEffect(() => () => geo.dispose(), [geo]);

  useFrame(({ clock }, dt) => {
    const d = Math.min(dt, 0.05);
    const t = clock.elapsedTime;
    const whoosh = shared.flame.current * 1.4;
    for (let i = 0; i < n; i++) {
      const p = i * 3;
      st.life[i] -= d;
      if (st.life[i] <= 0) {
        st.max[i] = st.life[i] = 1.6 + Math.random() * 1.8;
        st.pos.set([HEARTH.x + (Math.random() - 0.5) * 0.8, HEARTH.y + 0.78, HEARTH.z + (Math.random() - 0.5) * 0.36], p);
        st.vel.set([(Math.random() - 0.5) * 0.25, 0.3 + Math.random() * 0.5, (Math.random() - 0.5) * 0.25], p);
      }
      st.vel[p] += Math.sin(t * 2.1 + i * 1.7) * 0.45 * d;
      st.vel[p + 2] += Math.cos(t * 1.6 + i * 1.3) * 0.45 * d;
      st.vel[p + 1] += (0.12 + whoosh) * d;
      st.pos[p] += st.vel[p] * d;
      st.pos[p + 1] += st.vel[p + 1] * d;
      st.pos[p + 2] += st.vel[p + 2] * d;
      const k = st.life[i] / st.max[i];
      const bright = k * k * (0.65 + 0.35 * Math.sin(t * 9 + i * 2.3)) * 1.7;
      st.col[p] = bright;
      st.col[p + 1] = bright * 0.4;
      st.col[p + 2] = bright * 0.07;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  });
  return (
    <points geometry={geo} frustumCulled={false}>
      <pointsMaterial vertexColors size={0.032} sizeAttenuation transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
    </points>
  );
}

// ---------- Smoke: slow puffs from the hearth, and a burst of scale off the tablet at each blow ----------

type Puff = { s: Sprite; m: SpriteMaterial; life: number; max: number; vel: Vector3; base: number; grow: number };

function spawnPuff(p: Puff, x: number, y: number, z: number, vel: Vector3, base: number, grow: number, max: number, color: string) {
  p.s.position.set(x, y, z);
  p.vel.copy(vel);
  p.base = base;
  p.grow = grow;
  p.max = p.life = max;
  p.m.color.set(color);
  p.m.rotation = Math.random() * Math.PI * 2;
  p.s.visible = true;
}

function Smoke({ shared, tex }: { shared: Shared; tex: Texture }) {
  const puffs = useMemo<Puff[]>(
    () =>
      Array.from({ length: 16 }, () => {
        const m = new SpriteMaterial({ map: tex, color: "#5a4e58", transparent: true, opacity: 0, depthWrite: false, blending: NormalBlending });
        const s = new Sprite(m);
        s.visible = false;
        return { s, m, life: 0, max: 1, vel: new Vector3(), base: 0.2, grow: 0.6 };
      }),
    [tex],
  );
  useEffect(() => () => puffs.forEach((p) => p.m.dispose()), [puffs]);
  const timer = useRef(0);
  const seen = useRef(0);

  useFrame(({ clock }, dt) => {
    const d = Math.min(dt, 0.05);
    const t = clock.elapsedTime;
    timer.current -= d;
    if (timer.current <= 0) {
      timer.current = 0.42;
      const p = puffs.find((q) => q.life <= 0);
      if (p) {
        spawnPuff(
          p,
          HEARTH.x + (Math.random() - 0.5) * 0.5,
          HEARTH.y + 1.0,
          HEARTH.z + (Math.random() - 0.5) * 0.2,
          new Vector3((Math.random() - 0.5) * 0.1, 0.32 + Math.random() * 0.15, 0),
          0.26,
          0.5,
          2.8,
          "#4a4048",
        );
      }
    }
    if (shared.impact.current > 1 && seen.current !== shared.impact.current) {
      seen.current = shared.impact.current;
      let k = 0;
      for (const p of puffs) {
        if (p.life > 0 || k >= 5) continue;
        k++;
        const a = Math.random() * Math.PI * 2;
        spawnPuff(
          p,
          shared.hit.x,
          shared.top.current + 0.05,
          shared.hit.z,
          new Vector3(Math.cos(a) * 0.35, 0.45 + Math.random() * 0.3, Math.sin(a) * 0.35),
          0.1,
          0.45,
          0.9 + Math.random() * 0.4,
          "#8a7a80",
        );
      }
    }
    for (const p of puffs) {
      if (p.life <= 0) {
        if (p.s.visible) p.s.visible = false;
        continue;
      }
      p.life -= d;
      const k = 1 - Math.max(0, p.life / p.max);
      p.vel.x += Math.sin(t * 1.3 + p.s.position.z * 7) * 0.12 * d;
      p.s.position.addScaledVector(p.vel, d);
      const sc = p.base + k * p.grow;
      p.s.scale.set(sc, sc, 1);
      p.m.opacity = Math.sin(k * Math.PI) * 0.32;
      p.m.rotation += d * 0.25;
    }
  });
  return (
    <group>
      {puffs.map((p, i) => (
        <primitive key={i} object={p.s} />
      ))}
    </group>
  );
}

// ---------- Hearth: stone block, coal bed, flames, hood and chimney against a back wall ----------

const COALS = Array.from({ length: 14 }, (_, i) => {
  const a = i * 2.399; // golden angle: an even, non-grid scatter
  const r = 0.08 + (i % 5) * 0.085;
  return { x: Math.cos(a) * r * 1.6, z: Math.sin(a) * r * 0.55, s: 0.05 + ((i * 7) % 4) * 0.012, ph: i * 1.9 };
});

function Hearth({ low, shared, tex }: { low: boolean; shared: Shared; tex: Texture }) {
  const stone = usePbr("anvil", low, [1.6, 1.6]);
  const light = useRef<PointLight>(null);
  const coals = useRef<Group>(null);
  const flames = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const f = 1 + Math.sin(t * 11) * 0.08 + Math.sin(t * 23.7) * 0.05 + Math.sin(t * 5.3) * 0.04;
    const whoosh = shared.flame.current;
    if (light.current) light.current.intensity = 9 * f + whoosh * 18;
    coals.current?.children.forEach((c, i) => {
      const m = (c as Mesh).material as MeshStandardMaterial;
      m.emissiveIntensity = 1.3 + 0.9 * Math.sin(t * (4.5 + i * 0.6) + i * 2) + whoosh * 3;
    });
    flames.current?.children.forEach((c, i) => {
      const w = 0.8 + Math.sin(t * (8 + i * 2.1) + i) * 0.2;
      const h = 0.85 + Math.sin(t * (10 + i * 1.7) + i * 2) * 0.28 + whoosh * 0.5;
      c.scale.set(0.42 * w, 0.62 * h, 1);
      c.position.x = (i - 1.5) * 0.17 + Math.sin(t * 3 + i) * 0.03;
    });
  });
  const dark = { color: "#2a2429", roughness: 0.75, metalness: 0.8 } as const;
  return (
    <group position={[HEARTH.x, HEARTH.y, HEARTH.z]}>
      {/* back wall slab that catches the firelight */}
      <mesh position={[0, 1.9, -0.62]} receiveShadow>
        <boxGeometry args={[2.2, 3.8, 0.3]} />
        <meshStandardMaterial {...stone} color="#4f4549" roughness={1} metalness={0} />
      </mesh>
      <mesh position={[0, 0.36, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.35, 0.72, 0.82]} />
        <meshStandardMaterial {...stone} color="#5c524f" roughness={1} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.745, 0]}>
        <boxGeometry args={[1.45, 0.05, 0.92]} />
        <meshStandardMaterial {...dark} />
      </mesh>
      {/* coal bed */}
      <mesh position={[0, 0.775, 0]}>
        <boxGeometry args={[1.05, 0.02, 0.54]} />
        <meshStandardMaterial color="#1a0804" emissive="#ff3a00" emissiveIntensity={1.6} roughness={1} />
      </mesh>
      <group ref={coals} position={[0, 0.8, 0]}>
        {COALS.map((c, i) => (
          <mesh key={i} position={[c.x, c.s * 0.6, c.z]} rotation={[c.ph, c.ph * 0.7, 0]}>
            <dodecahedronGeometry args={[c.s, 0]} />
            <meshStandardMaterial color="#1c0a06" emissive="#ff5a10" emissiveIntensity={1.5} roughness={0.9} />
          </mesh>
        ))}
      </group>
      <group ref={flames} position={[0, 0.98, 0.02]}>
        {[0, 1, 2, 3].map((i) => (
          <sprite key={i} position={[(i - 1.5) * 0.17, 0.12 + (i % 2) * 0.08, 0]}>
            <spriteMaterial map={tex} color={i % 2 ? "#ffd27a" : "#ff7a22"} transparent opacity={0.55} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
          </sprite>
        ))}
      </group>
      {/* hood and chimney */}
      <mesh position={[0, 1.78, -0.05]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.95, 0.62, 4, 1]} />
        <meshStandardMaterial {...dark} />
      </mesh>
      <mesh position={[0, 2.9, -0.05]}>
        <boxGeometry args={[0.46, 1.7, 0.46]} />
        <meshStandardMaterial {...dark} />
      </mesh>
      <pointLight ref={light} position={[0.1, 1.15, 0.7]} color="#ff8a3a" distance={7.5} decay={1.7} intensity={9} />
      <pointLight position={[0, 0.9, 0]} color="#ff4a10" distance={2.2} decay={2} intensity={4} />
    </group>
  );
}

// ---------- Anvil: London pattern on a banded stump, with the glowing tablet and resting tongs ----------

function useGlyphTexture(glyph: string) {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 128;
    const ctx = c.getContext("2d")!;
    const family = getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim() || "serif";
    ctx.font = `800 104px ${family}`;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(glyph, 128, 68);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [glyph]);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

const MARK_COLOR = new Color(2.6, 1.9, 0.7);

function Anvil({ low, shared }: { low: boolean; shared: Shared }) {
  const iron = usePbr("anvil", low, [1.2, 1.2]);
  const wood = usePbr("leather", low, [2, 2]);
  const glyph = useGlyphTexture("?");
  const group = useRef<Group>(null);
  const hot = useRef<MeshStandardMaterial>(null);
  const mark = useRef<MeshBasicMaterial>(null);
  const glow = useRef<PointLight>(null);
  const body = useMemo(() => {
    // Side profile, extruded: foot, waist, heel on the left, body up to the face at y = 0.44.
    const s = new Shape();
    s.moveTo(-0.27, 0);
    s.lineTo(0.27, 0);
    s.lineTo(0.21, 0.07);
    s.lineTo(0.18, 0.2);
    s.lineTo(0.3, 0.3);
    s.lineTo(0.46, 0.33);
    s.lineTo(0.46, 0.44);
    s.lineTo(-0.5, 0.44);
    s.lineTo(-0.5, 0.35);
    s.lineTo(-0.31, 0.3);
    s.lineTo(-0.18, 0.2);
    s.lineTo(-0.21, 0.07);
    s.closePath();
    const g = new ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: true, bevelSize: 0.022, bevelThickness: 0.022, bevelSegments: 3 });
    g.translate(0, 0, -0.15);
    return g;
  }, []);
  useEffect(() => () => body.dispose(), [body]);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    // Authored with the tablet top at FACE + TABLET: scale and move so the tablet is exactly where the hammer lands.
    g.visible = shared.ready.current;
    const s = shared.top.current / (FACE + TABLET);
    const w = Math.max(s, 0.85);
    g.scale.set(w, s, w);
    g.position.set(shared.hit.x - 0.06 * w, 0, shared.hit.z);
    const heat = shared.heat.current;
    if (hot.current) {
      hot.current.emissiveIntensity = 0.6 + heat * 5.5;
      hot.current.emissive.setRGB(1, 0.25 + heat * 0.35, 0.02 + heat * 0.12);
    }
    if (mark.current) mark.current.opacity = 0.25 + Math.min(1, shared.blows.current / BLOWS_PER_PIECE) * 0.75;
    if (glow.current) glow.current.intensity = 0.6 + heat * 3.5;
  });

  const band = { ...iron, color: "#3a3337", roughness: 0.9, metalness: 1 } as const;
  const steel = { color: "#b8bcc4", roughness: 0.32, metalness: 1, envMapIntensity: 1.4 } as const;
  return (
    <group ref={group} visible={false}>
      {/* stump with two iron bands */}
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.33, 0.38, 0.4, 32]} />
        <meshStandardMaterial {...wood} color="#7a5838" roughness={1} metalness={0} />
      </mesh>
      {[0.09, 0.31].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[0.345 + (0.31 - y) * 0.12, 0.345 + (0.31 - y) * 0.12, 0.05, 32, 1, true]} />
          <meshStandardMaterial {...band} side={DoubleSide} />
        </mesh>
      ))}
      {/* body, horn, polished face plate and hardy hole */}
      <mesh geometry={body} position={[0, 0.4, 0]} castShadow receiveShadow>
        <meshStandardMaterial {...iron} roughness={1} metalness={1} envMapIntensity={1.1} />
      </mesh>
      <mesh position={[0.68, 0.77, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[1, 1, 0.8]} castShadow>
        <coneGeometry args={[0.1, 0.46, 20]} />
        <meshStandardMaterial {...iron} roughness={1} metalness={1} />
      </mesh>
      <mesh position={[-0.02, FACE - 0.012, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.96, 0.024, 0.3]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      <mesh position={[-0.4, FACE + 0.002, 0.07]}>
        <boxGeometry args={[0.05, 0.01, 0.05]} />
        <meshStandardMaterial color="#050305" roughness={1} />
      </mesh>
      {/* the quiz tablet, glowing, with the question mark emerging blow by blow */}
      <group position={[0.06, FACE + TABLET / 2, 0]}>
        <RoundedBox args={[0.36, TABLET, 0.17]} radius={0.008} smoothness={2} castShadow>
          <meshStandardMaterial ref={hot} color="#2a1208" emissive="#ff6a1a" emissiveIntensity={2} roughness={0.55} metalness={0.5} />
        </RoundedBox>
        <mesh position={[0, TABLET / 2 + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.2, 0.1]} />
          <meshBasicMaterial ref={mark} map={glyph} transparent opacity={0.3} color={MARK_COLOR} toneMapped={false} depthWrite={false} />
        </mesh>
        <pointLight ref={glow} position={[0, 0.12, 0.08]} color="#ff7a2a" distance={1.6} decay={2} intensity={1} />
      </group>
      {/* tongs gripping the cold end of the tablet, handles hanging off the front edge towards the camera */}
      <group position={[-0.185, FACE + 0.02, 0.1]} rotation={[0, 1, 0]}>
        {[-1, 1].map((k) => (
          <group key={k}>
            <mesh position={[-0.2, 0, k * 0.012]} rotation={[0, k * 0.05, 0]}>
              <boxGeometry args={[0.52, 0.022, 0.022]} />
              <meshStandardMaterial {...band} color="#4a4247" />
            </mesh>
            <mesh position={[0.1, 0, k * 0.03]}>
              <boxGeometry args={[0.12, 0.03, 0.02]} />
              <meshStandardMaterial {...band} color="#4a4247" />
            </mesh>
          </group>
        ))}
        <mesh position={[-0.02, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.022, 0.022, 0.05, 12]} />
          <meshStandardMaterial {...steel} />
        </mesh>
      </group>
    </group>
  );
}

// ---------- Blacksmith ----------

// Props and clothes of the Barbarian that do not belong to a smith. Its head is rebuilt below.
// Props only: the original head still counts for the size, because the rebuilt head replaces it at the same height.
const PROPS = ["1H_Axe_Offhand", "Barbarian_Round_Shield", "1H_Axe", "2H_Axe", "Mug", "Barbarian_Hat", "Barbarian_Cape"];
const HIDE = [...PROPS, "Barbarian_Head"];

// Puts `obj` on a bone but keeps its size in world units, whatever scale the rig has. With `upright`, the object also
// ignores the bone's own axes: +Y is up and +Z is forward for the character, so offsets can be written in plain metres.
function mount(bone: Object3D, obj: Object3D, upright?: Object3D) {
  bone.updateWorldMatrix(true, false);
  const s = new Vector3();
  bone.getWorldScale(s);
  obj.scale.setScalar(1 / s.x);
  if (upright) {
    const qb = new Quaternion();
    const qr = new Quaternion();
    bone.getWorldQuaternion(qb);
    upright.getWorldQuaternion(qr);
    obj.quaternion.copy(qb.invert().multiply(qr));
  }
  bone.add(obj);
}

function BoneMount({ bone, upright, children }: { bone: Object3D; upright?: Object3D; children: React.ReactNode }) {
  const holder = useMemo(() => new Object3D(), []);
  useEffect(() => {
    mount(bone, holder, upright);
    return () => {
      bone.remove(holder);
    };
  }, [bone, holder, upright]);
  return <primitive object={holder}>{children}</primitive>;
}

const SKIN = "#dca07a";
const HAIR = "#3e2d22";
const GOLD = { color: "#e9bd58", roughness: 0.3, metalness: 0.85, emissive: "#5a3c0c", emissiveIntensity: 0.35 } as const;

function Head({ shared }: { shared: Shared }) {
  const eyeL = useRef<Group>(null);
  const eyeR = useRef<Group>(null);
  useFrame(() => {
    // The smith squints as the hammer lands.
    const squint = 1 - Math.min(1, Math.max(0, shared.flame.current - 0.25) / 0.75) * 0.8;
    eyeL.current?.scale.set(1, squint, 1);
    eyeR.current?.scale.set(1, squint, 1);
  });
  const skin = { color: SKIN, roughness: 0.62 } as const;
  const hair = { color: HAIR, roughness: 0.95 } as const;
  return (
    <group>
      {/* neck */}
      <mesh position={[0, 0.06, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.16, 0.2, 20]} />
        <meshStandardMaterial {...skin} />
      </mesh>
      {/* skull and brow ridge */}
      <mesh position={[0, 0.42, 0]} scale={[1, 1.03, 0.95]} castShadow>
        <sphereGeometry args={[0.36, 36, 28]} />
        <meshStandardMaterial {...skin} />
      </mesh>
      <mesh position={[0, 0.56, 0.24]} rotation={[0.35, 0, 0]} castShadow>
        <boxGeometry args={[0.44, 0.07, 0.16]} />
        <meshStandardMaterial {...skin} />
      </mesh>
      {/* hair at the sides and back, leaving the crown and forehead bare */}
      <mesh position={[0, 0.4, -0.05]} rotation={[-0.55, 0, 0]}>
        <sphereGeometry args={[0.374, 28, 20, 0, Math.PI * 2, 0.55, 1.6]} />
        <meshStandardMaterial {...hair} side={DoubleSide} />
      </mesh>
      {/* ears */}
      {[-1, 1].map((x) => (
        <mesh key={x} position={[x * 0.355, 0.4, 0]} scale={[0.55, 1, 0.8]} castShadow>
          <sphereGeometry args={[0.085, 14, 12]} />
          <meshStandardMaterial {...skin} />
        </mesh>
      ))}
      {/* eyes, stern brows and rosy cheeks */}
      {[-1, 1].map((x) => (
        <group key={x}>
          <group ref={x < 0 ? eyeL : eyeR} position={[x * 0.125, 0.47, 0.305]}>
            <mesh scale={[1, 1.15, 0.6]}>
              <sphereGeometry args={[0.062, 16, 12]} />
              <meshStandardMaterial color="#fffaf0" roughness={0.3} />
            </mesh>
            <mesh position={[0, -0.005, 0.04]}>
              <sphereGeometry args={[0.032, 14, 10]} />
              <meshStandardMaterial color="#1d1510" roughness={0.2} />
            </mesh>
            <mesh position={[0.012, 0.008, 0.066]}>
              <sphereGeometry args={[0.009, 8, 6]} />
              <meshBasicMaterial color="#ffffff" toneMapped={false} />
            </mesh>
          </group>
          <mesh position={[x * 0.13, 0.555, 0.32]} rotation={[0, 0, x * -0.32]} castShadow>
            <boxGeometry args={[0.17, 0.045, 0.05]} />
            <meshStandardMaterial {...hair} />
          </mesh>
          <mesh position={[x * 0.2, 0.34, 0.27]} scale={[1, 0.7, 0.4]}>
            <sphereGeometry args={[0.06, 12, 10]} />
            <meshStandardMaterial color="#d9826f" roughness={0.8} />
          </mesh>
        </group>
      ))}
      {/* round nose */}
      <mesh position={[0, 0.375, 0.345]} castShadow>
        <sphereGeometry args={[0.08, 18, 14]} />
        <meshStandardMaterial color="#e08e74" roughness={0.6} />
      </mesh>
      {/* moustache and a full beard that tapers to a gold-ringed tip */}
      {[-1, 1].map((x) => (
        <mesh key={x} position={[x * 0.085, 0.3, 0.335]} rotation={[0, 0, x * 0.35]} scale={[1.5, 0.8, 0.8]} castShadow>
          <sphereGeometry args={[0.07, 14, 10]} />
          <meshStandardMaterial {...hair} />
        </mesh>
      ))}
      <mesh position={[0, 0.13, 0.19]} scale={[1, 1.25, 0.78]} castShadow>
        <sphereGeometry args={[0.25, 24, 18]} />
        <meshStandardMaterial {...hair} />
      </mesh>
      <mesh position={[0, -0.12, 0.24]} scale={[0.75, 1.1, 0.7]} castShadow>
        <sphereGeometry args={[0.12, 16, 12]} />
        <meshStandardMaterial {...hair} />
      </mesh>
      <mesh position={[0, -0.07, 0.24]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.075, 0.018, 8, 24]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      <mesh position={[0, 0.22, 0.31]} scale={[1.2, 0.5, 0.5]}>
        <sphereGeometry args={[0.07, 12, 10]} />
        <meshStandardMaterial color="#c9695a" roughness={0.5} />
      </mesh>
    </group>
  );
}

// Time scale of the chop clip around the measured impact instant: slow wind-up, fast strike, a held beat on the anvil.
function strikeTempo(t: number, t0: number) {
  const d = t - t0;
  if (d > -0.24 && d < 0) return 1.7;
  if (d >= 0 && d < 0.09) return 0.3;
  if (d >= 0.09 && d < 0.4) return 0.9;
  return 0.78;
}

type Phase = { mode: "chop" | "rest"; blows: number; restAct: AnimationAction | null };

function Smith({ low, shared }: { low: boolean; shared: Shared }) {
  const gltf = useGLTF("/3d/forge/smith.opt.glb");
  const root = useRef<Group>(null);
  const hammerHead = useRef<Object3D>(null);
  const face = useRef<MeshStandardMaterial>(null);
  const bronze = usePbr("bronze", low, [2, 2]);
  const leather = usePbr("leather", low, [1.5, 1.5]);
  const cloth = usePbr("chiton", low, [3, 2]);
  const iron = usePbr("anvil", low, [1, 1]);

  const model = useMemo(() => {
    const m = cloneSkinned(gltf.scene);
    m.traverse((o) => {
      if (HIDE.includes(o.name)) o.visible = false;
      if ("isMesh" in o) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return m;
  }, [gltf.scene]);

  // The pack is authored small: scale the character to a stocky 1.75 m.
  const scale = useMemo(() => {
    // Only the parts that stay visible: the hidden props would stretch the box.
    const box = new Box3();
    model.traverse((o) => {
      if ("isMesh" in o && !PROPS.includes(o.name) && o.parent && !PROPS.includes(o.parent.name)) box.union(new Box3().setFromObject(o));
    });
    return 1.75 / Math.max(0.01, box.max.y - box.min.y);
  }, [model]);

  const { actions } = useAnimations(gltf.animations, root);
  const impactTime = useRef(0);
  const lastTime = useRef(0);
  const phase = useRef<Phase>({ mode: "chop", blows: 0, restAct: null });

  // Sample the clip once: when and where is the hammer lowest? Then start it for real.
  useEffect(() => {
    const act = actions[CLIP];
    const head = hammerHead.current;
    const group = root.current;
    if (!act || !head || !group) return;
    const mixer = act.getMixer();
    const dur = act.getClip().duration;
    const v = new Vector3();
    let best = { y: Infinity, t: 0, p: new Vector3() };
    act.reset().setLoop(LoopRepeat, Infinity).play();
    act.paused = true;
    const steps = 160;
    for (let i = 0; i < steps; i++) {
      const t = (dur * i) / steps;
      act.time = t;
      mixer.update(0);
      group.updateMatrixWorld(true);
      head.getWorldPosition(v);
      if (v.y < best.y) best = { y: v.y, t, p: v.clone() };
    }
    impactTime.current = best.t;
    shared.hit.copy(best.p);
    shared.top.current = best.p.y - HEAD_HALF;
    shared.ready.current = true;
    act.paused = false;
    act.time = 0;
    lastTime.current = 0;
    act.setEffectiveTimeScale(0.78);
    const rest = actions[REST];
    if (rest) {
      rest.setLoop(LoopOnce, 1);
      rest.clampWhenFinished = true;
    }
    phase.current = { mode: "chop", blows: 0, restAct: rest ?? null };
    return () => {
      act.stop();
      rest?.stop();
    };
  }, [actions, shared]);

  // Drive the tempo, fire the effects at the measured instant of the clip, and rest after a few blows.
  useFrame(() => {
    const act = actions[CLIP];
    if (!act || !shared.ready.current) return;
    const ph = phase.current;
    const t0 = impactTime.current;
    if (ph.mode === "chop") {
      const t = act.time;
      act.setEffectiveTimeScale(strikeTempo(t, t0));
      const prev = lastTime.current;
      const crossed = t >= prev ? prev < t0 && t >= t0 : t0 > prev || t >= t0;
      if (crossed && act.getEffectiveWeight() > 0.5) {
        shared.impact.current = 1 + Math.random() * 0.01;
        ph.blows++;
        shared.blows.current = ph.blows;
      }
      // After the last blow's follow-through, lower the hammer and look the piece over.
      const sinceBlow = t >= t0 ? t - t0 : t + act.getClip().duration - t0;
      if (ph.blows >= BLOWS_PER_PIECE && sinceBlow > 0.45 && ph.restAct) {
        ph.mode = "rest";
        ph.restAct.reset().fadeIn(0.35).play();
        act.fadeOut(0.35);
      }
      lastTime.current = t;
    } else if (ph.restAct) {
      const r = ph.restAct;
      const left = r.getClip().duration - r.time;
      if (left < 0.4 || !r.isRunning()) {
        ph.mode = "chop";
        ph.blows = 0;
        shared.blows.current = 0;
        act.reset().fadeIn(0.35).play();
        act.setEffectiveTimeScale(0.78);
        lastTime.current = 0;
        r.fadeOut(0.35);
      }
    }
    if (face.current) face.current.emissiveIntensity = shared.flame.current * 2.5;
  });

  const leaves = useMemo(() => Array.from({ length: 18 }, (_, i) => ({ a: (i / 18) * Math.PI * 2, t: i % 2 ? 0.4 : -0.4 })), []);
  const handBone = model.getObjectByName("handslotr");
  const headBone = model.getObjectByName("head");
  const hipsBone = model.getObjectByName("hips");
  const chestBone = model.getObjectByName("chest");
  const lowerArmR = model.getObjectByName("lowerarmr");
  const lowerArmL = model.getObjectByName("lowerarml");

  const leatherMat = { ...leather, color: "#86562f", roughness: 1, metalness: 0 } as const;
  const steel = { color: "#c2c6cc", roughness: 0.3, metalness: 1, envMapIntensity: 1.4 } as const;

  return (
    <group ref={root} position={[SMITH_X, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={scale}>
      <primitive object={model} />

      {/* Hammer: wrapped grip, bronze ferrule, banded iron head with polished faces that flash on impact. */}
      {handBone && (
        <BoneMount bone={handBone}>
          <mesh position={[0, 0.12, 0]} castShadow>
            <cylinderGeometry args={[0.028, 0.034, 0.5, 16]} />
            <meshStandardMaterial {...leather} color="#8a6646" roughness={1} metalness={0} />
          </mesh>
          <mesh position={[0, -0.03, 0]} castShadow>
            <cylinderGeometry args={[0.037, 0.04, 0.17, 16]} />
            <meshStandardMaterial {...leatherMat} color="#4a2d1a" />
          </mesh>
          {[-0.08, -0.03, 0.02].map((y) => (
            <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.039, 0.006, 6, 20]} />
              <meshStandardMaterial color="#2a1a10" roughness={0.9} />
            </mesh>
          ))}
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.038, 0.034, 0.035, 16]} />
            <meshStandardMaterial {...bronze} roughness={1} metalness={1} color="#b08a50" />
          </mesh>
          <group position={[0, 0.4, 0]}>
            <RoundedBox args={[0.3, 0.17, 0.15]} radius={0.03} smoothness={4} castShadow>
              <meshStandardMaterial {...iron} roughness={1} metalness={1} />
            </RoundedBox>
            {[-0.075, 0.075].map((x) => (
              <mesh key={x} position={[x, 0, 0]}>
                <boxGeometry args={[0.045, 0.182, 0.162]} />
                <meshStandardMaterial {...bronze} roughness={1} metalness={1} color="#a8824a" />
              </mesh>
            ))}
            <mesh position={[-0.155, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.062, 0.07, 0.02, 20]} />
              <meshStandardMaterial ref={face} {...steel} emissive="#ffb060" emissiveIntensity={0} />
            </mesh>
            <mesh position={[0.155, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.062, 0.07, 0.02, 20]} />
              <meshStandardMaterial {...steel} />
            </mesh>
            <object3D ref={hammerHead} />
          </group>
        </BoneMount>
      )}

      {/* Rebuilt head with laurel wreath and gold berries */}
      {headBone && (
        <BoneMount bone={headBone} upright={model}>
          <Head shared={shared} />
          <group position={[0, 0.66, 0]} rotation={[-0.15, 0, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.33, 0.018, 8, 48]} />
              <meshStandardMaterial {...GOLD} />
            </mesh>
            {leaves.map((l, i) => (
              <mesh key={i} position={[Math.cos(l.a) * 0.335, l.t * 0.03, Math.sin(l.a) * 0.335]} rotation={[0, -l.a, l.t]} scale={[1, 0.35, 0.6]} castShadow>
                <sphereGeometry args={[0.08, 10, 8]} />
                <meshStandardMaterial color="#79a83c" roughness={0.5} metalness={0.2} />
              </mesh>
            ))}
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const a = (i / 6) * Math.PI * 2 + 0.3;
              return (
                <mesh key={i} position={[Math.cos(a) * 0.35, 0.04, Math.sin(a) * 0.35]}>
                  <sphereGeometry args={[0.022, 10, 8]} />
                  <meshStandardMaterial {...GOLD} />
                </mesh>
              );
            })}
          </group>
        </BoneMount>
      )}

      {/* Short tunic and belt with buckle, pouch and spare tongs */}
      {hipsBone && (
        <BoneMount bone={hipsBone} upright={model}>
          <mesh position={[0, -0.04, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.32, 0.34, 32, 1, true]} />
            <meshStandardMaterial {...cloth} color="#e3d6ba" roughness={1} metalness={0} side={DoubleSide} />
          </mesh>
          <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[0.22, 0.04, 12, 40]} />
            <meshStandardMaterial {...leatherMat} />
          </mesh>
          <mesh position={[0, 0.12, 0.235]}>
            <boxGeometry args={[0.07, 0.06, 0.02]} />
            <meshStandardMaterial {...bronze} roughness={1} metalness={1} color="#b08a50" />
          </mesh>
          <mesh position={[0.2, 0.0, 0.1]} scale={[1, 1.1, 0.8]} castShadow>
            <sphereGeometry args={[0.08, 14, 12]} />
            <meshStandardMaterial {...leatherMat} />
          </mesh>
          {[-0.014, 0.014].map((o) => (
            <mesh key={o} position={[-0.2 + o, -0.04, 0.12]} rotation={[0.1, 0, o * 6]} castShadow>
              <boxGeometry args={[0.02, 0.3, 0.02]} />
              <meshStandardMaterial {...bronze} roughness={1} metalness={1} color="#8a6a44" />
            </mesh>
          ))}
        </BoneMount>
      )}

      {/* Leather apron over the chest */}
      {chestBone && (
        <BoneMount bone={chestBone} upright={model}>
          <mesh position={[0, -0.12, 0.2]} rotation={[0.05, 0, 0]} castShadow>
            <boxGeometry args={[0.46, 0.7, 0.05]} />
            <meshStandardMaterial {...leatherMat} />
          </mesh>
          <mesh position={[0, 0.2, 0.2]} castShadow>
            <boxGeometry args={[0.28, 0.14, 0.055]} />
            <meshStandardMaterial {...leatherMat} color="#70452a" />
          </mesh>
          {[-1, 1].map((x) => (
            <mesh key={x} position={[x * 0.13, 0.34, 0.12]} rotation={[0.4, 0, x * -0.25]} castShadow>
              <boxGeometry args={[0.05, 0.3, 0.03]} />
              <meshStandardMaterial {...leatherMat} color="#58361f" />
            </mesh>
          ))}
        </BoneMount>
      )}

      {/* Leather gauntlets with a bronze band */}
      {[lowerArmR, lowerArmL].map((b, i) =>
        b ? (
          <BoneMount key={i} bone={b}>
            <mesh position={[0, 0.17, 0]} castShadow>
              <cylinderGeometry args={[0.095, 0.085, 0.2, 20]} />
              <meshStandardMaterial {...leatherMat} color="#58361f" />
            </mesh>
            <mesh position={[0, 0.17, 0]}>
              <cylinderGeometry args={[0.1, 0.1, 0.03, 20]} />
              <meshStandardMaterial {...bronze} roughness={1} metalness={1} color="#a8824a" />
            </mesh>
          </BoneMount>
        ) : null,
      )}
    </group>
  );
}

// ---------- Floor, columns and the dust in the moonlight ----------

function Surroundings({ low }: { low: boolean }) {
  const marble = usePbr("floor", low, [3, 3]);
  const col = usePbr("floor", low, [1, 3]);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[4.6, 64]} />
        <meshStandardMaterial {...marble} roughness={0.72} metalness={0} color="#7d6f78" envMapIntensity={0.8} />
      </mesh>
      {[-3.4, 2.7].map((x, i) => (
        <group key={x} position={[x, 0, -1.6 - i * 0.3]}>
          <mesh position={[0, 1.7, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.2, 0.22, 3.4, 40]} />
            <meshStandardMaterial {...col} roughness={1} metalness={0} color="#d8cdc4" />
          </mesh>
          <mesh position={[0, 0.07, 0]}>
            <boxGeometry args={[0.6, 0.14, 0.6]} />
            <meshStandardMaterial {...col} roughness={1} metalness={0} color="#d8cdc4" />
          </mesh>
          <mesh position={[0, 3.45, 0]}>
            <boxGeometry args={[0.6, 0.12, 0.6]} />
            <meshStandardMaterial {...col} roughness={1} metalness={0} color="#d8cdc4" />
          </mesh>
        </group>
      ))}
      {!low && <Sparkles count={40} scale={[4.5, 2.6, 3]} position={[0.6, 1.5, 0]} size={1.5} speed={0.22} opacity={0.3} color="#b8c8ff" noise={0.5} />}
    </group>
  );
}

// ---------- Camera, lights that react to the blow, and the pool of light over the anvil ----------

function Director({ shared }: { shared: Shared }) {
  const { camera, size, gl } = useThree();
  const flash = useRef<PointLight>(null);
  const spot = useRef<SpotLight>(null);
  const target = useMemo(() => new Object3D(), []);
  const shake = useRef(0);
  const lastSeen = useRef(0);
  const base = useRef({ pos: new Vector3(1, 1.3, 6), look: new Vector3(0, 0.9, 0.2) });
  const pointer = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  useEffect(() => {
    const cam = camera as PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    const tan = Math.tan(MathUtils.degToRad(cam.fov / 2));
    const dist = Math.max(2.5 / (2 * tan), 2.7 / (2 * tan * aspect));
    // On wide banners the title sits on the left, so the scene is pushed to the right.
    const lx = aspect > 2 ? -0.75 : aspect > 1.2 ? -0.45 : -0.15;
    base.current.pos.set(lx + dist * 0.2, 1.3, dist * 0.97);
    base.current.look.set(lx, 0.9, 0.2);
    cam.position.copy(base.current.pos);
    cam.lookAt(base.current.look);
    cam.updateProjectionMatrix();
  }, [camera, size]);

  // The camera leans a little with the pointer, wherever it is over the banner.
  useEffect(() => {
    const el = gl.domElement;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const x = ((e.clientX - r.left) / r.width) * 2 - 1;
      const y = ((e.clientY - r.top) / r.height) * 2 - 1;
      const inside = x >= -1.2 && x <= 1.2 && y >= -1.2 && y <= 1.2;
      pointer.current.tx = inside ? MathUtils.clamp(x, -1, 1) : 0;
      pointer.current.ty = inside ? MathUtils.clamp(y, -1, 1) : 0;
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [gl]);

  useFrame(({ camera: cam, clock }, dt) => {
    const t = clock.elapsedTime;
    // Everything reacts on the very frame the blow lands.
    if (shared.impact.current > 1 && shared.impact.current !== lastSeen.current) {
      lastSeen.current = shared.impact.current;
      shake.current = 1;
      shared.flame.current = 1;
      shared.heat.current = 1;
    }
    shared.flame.current = Math.max(0, shared.flame.current - dt * 2.4);
    shared.heat.current = Math.max(0.35, shared.heat.current - dt * 0.22);
    shake.current = Math.max(0, shake.current - dt * 6);
    if (flash.current) {
      flash.current.intensity = shared.flame.current > 0.45 ? (shared.flame.current - 0.45) * 40 : 0;
      flash.current.position.set(shared.hit.x, shared.top.current + 0.22, shared.hit.z + 0.35);
    }
    if (spot.current) {
      target.position.set(shared.hit.x, shared.top.current, shared.hit.z);
      spot.current.position.set(shared.hit.x + 0.4, 3.6, shared.hit.z + 1.1);
      spot.current.target = target;
    }
    const p = pointer.current;
    p.x += (p.tx - p.x) * Math.min(1, dt * 3);
    p.y += (p.ty - p.y) * Math.min(1, dt * 3);
    const b = base.current;
    const kick = shake.current * shake.current;
    cam.position.set(
      b.pos.x + Math.sin(t * 0.37) * 0.035 + p.x * 0.12 + Math.sin(t * 52) * 0.012 * kick,
      b.pos.y + Math.sin(t * 0.53) * 0.02 - p.y * 0.06 + Math.sin(t * 61) * 0.02 * kick,
      b.pos.z,
    );
    cam.lookAt(b.look.x + p.x * 0.05, b.look.y - p.y * 0.03, b.look.z);
  });
  return (
    <>
      <pointLight ref={flash} color="#ffc070" distance={3.6} decay={2} intensity={0} />
      <spotLight ref={spot} color="#ffdcb8" intensity={26} angle={0.4} penumbra={0.85} decay={1.6} distance={9} />
      <primitive object={target} />
    </>
  );
}

function Effects({ shared }: { shared: Shared }) {
  const bloom = useRef<BloomEffect>(null);
  useFrame(() => {
    if (bloom.current) bloom.current.intensity = 0.7 + shared.flame.current * 1.5;
  });
  return (
    <EffectComposer multisampling={4}>
      <Bloom ref={bloom} mipmapBlur luminanceThreshold={0.92} luminanceSmoothing={0.18} intensity={0.7} radius={0.68} />
      <Vignette eskil={false} offset={0.18} darkness={0.58} />
    </EffectComposer>
  );
}

function Ready({ onReady }: { onReady: () => void }) {
  useEffect(onReady, [onReady]);
  return null;
}

function Scene({ low, shared }: { low: boolean; shared: Shared }) {
  const soft = useSoftTexture();
  return (
    <>
      <Surroundings low={low} />
      <Hearth low={low} shared={shared} tex={soft} />
      <Anvil low={low} shared={shared} />
      <Smith low={low} shared={shared} />
      <Sparks shared={shared} low={low} />
      <Shockwave shared={shared} />
      <Embers shared={shared} low={low} />
      <Smoke shared={shared} tex={soft} />
    </>
  );
}

export default function ForgeScene({ low, active, onReady }: { low: boolean; active: boolean; onReady: () => void }) {
  const shared = useMemo<Shared>(
    () => ({
      impact: { current: 0 },
      flame: { current: 0 },
      heat: { current: 0.5 },
      blows: { current: 0 },
      hit: new Vector3(0.39, 0.5, 0.45),
      top: { current: 0.43 },
      ready: { current: false },
    }),
    [],
  );
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={low ? 1 : [1, 1.75]}
      shadows={low ? false : { type: PCFSoftShadowMap }}
      camera={{ fov: 30, near: 0.1, far: 40, position: [1, 1.3, 6] }}
      gl={{ antialias: !low, alpha: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = SRGBColorSpace;
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 6.5, 13]} />
      <Environment files="/3d/env.hdr" environmentIntensity={0.35} />
      {/* Two-tone light: the hearth warms the left, cool moonlight rims the right. */}
      <hemisphereLight args={["#4a5a8a", "#2a1a12", 0.45]} />
      <directionalLight
        position={[2.2, 3.6, 3]}
        intensity={1.5}
        color="#ffe2c4"
        castShadow={!low}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-2.4}
        shadow-camera-right={2.4}
        shadow-camera-top={3}
        shadow-camera-bottom={-0.5}
        shadow-camera-near={0.5}
        shadow-camera-far={10}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[3.2, 2.6, -3.2]} intensity={2.4} color="#7f9fff" />
      <Suspense fallback={null}>
        <Scene low={low} shared={shared} />
        <Ready onReady={onReady} />
      </Suspense>
      <Director shared={shared} />
      {!low && <Effects shared={shared} />}
    </Canvas>
  );
}
