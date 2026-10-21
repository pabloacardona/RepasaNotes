"use client";

import { useFrame } from "@react-three/fiber";
import { Sparkles, useTexture } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import {
  CapsuleGeometry,
  DoubleSide,
  ExtrudeGeometry,
  SphereGeometry,
  MathUtils,
  RepeatWrapping,
  Shape,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
} from "three";
import type { Mood } from "@/lib/mood";
import { glyphTexture } from "./sprites";
import { Fur } from "./fur";

const YELLOW = "#ffc72c";
const INK = "#1b2433";
const BLUE = "#3651d4";

// ---------- Expression table ----------

type EyeKind = "open" | "happy" | "closed" | "star";
type Fx = "question" | "exclaim" | "zzz" | "sweat" | "tear" | "tears" | "flame" | "sparkles" | "confetti" | "cloud";

type Face = {
  eye: EyeKind;
  lid: number; // eye height: 0.5 squint, 1 normal, 1.3 wide
  pupil: number;
  lookY: number;
  brow: number; // + angry (inner ends down), - worried
  browY: number;
  curve: number; // mouth: -1 frown .. 1 smile
  open: number; // mouth open 0..1
  width: number;
  blush: number;
  bob: number;
  bobSpeed: number;
  hop: number;
  hopSpeed: number;
  tremble: number;
  lean: number; // roll
  pitch: number; // + leans back (chest out), - forward/droop
  armL: number;
  armR: number;
  wave: number;
  fx: Fx[];
};

const BASE: Face = {
  eye: "open", lid: 1, pupil: 1, lookY: 0, brow: 0, browY: 0, curve: 0.45, open: 0, width: 1, blush: 0.3,
  bob: 0.02, bobSpeed: 1.6, hop: 0, hopSpeed: 6, tremble: 0, lean: 0, pitch: 0, armL: 0.25, armR: 0.25, wave: 0, fx: [],
};

const FACES: Record<Mood, Partial<Face>> = {
  idle: {},
  curious: { lid: 1.12, pupil: 1.1, brow: -0.12, browY: 0.02, curve: 0.25, open: 0.15, width: 0.6, lean: 0.16, fx: [] },
  thinking: { lid: 0.85, pupil: 0.9, lookY: 1, brow: 0.12, curve: 0.05, width: 0.6, lean: -0.12, armR: 2.3, fx: ["question"] },
  sleepy: { eye: "closed", curve: 0.1, open: 0.18, width: 0.5, bob: 0.015, bobSpeed: 0.7, pitch: -0.12, armL: 0.1, armR: 0.1, fx: ["zzz"] },
  happy: { eye: "happy", curve: 0.9, open: 0.35, blush: 0.7, hop: 0.05, hopSpeed: 5.5, armL: 0.8, armR: 0.8, fx: ["sparkles"] },
  excited: { lid: 1.25, pupil: 1.3, brow: -0.1, browY: 0.04, curve: 1, open: 0.7, blush: 0.85, hop: 0.12, hopSpeed: 8, armL: 2.6, armR: 2.6, fx: ["sparkles"] },
  onFire: { eye: "star", curve: 1, open: 0.8, blush: 1, hop: 0.14, hopSpeed: 8.5, armL: 2.7, armR: 2.7, fx: ["flame", "sparkles"] },
  comeback: { eye: "happy", curve: 1, open: 0.6, blush: 0.9, hop: 0.1, hopSpeed: 7, armL: 2.3, armR: 2.3, wave: 1, fx: ["sparkles", "exclaim"] },
  confident: { lid: 0.78, brow: 0.15, curve: 0.75, width: 1.1, lean: 0.06, pitch: 0.06, armL: 0.95, armR: 0.95, blush: 0.4 },
  oops: { lid: 1.1, brow: -0.32, browY: 0.02, curve: -0.25, open: 0.12, width: 0.7, blush: 0.55, tremble: 0.006, fx: ["sweat"] },
  sad: { lid: 0.82, pupil: 1.12, brow: -0.45, curve: -0.7, width: 0.8, pitch: -0.18, bob: 0.01, bobSpeed: 1, armL: 0.08, armR: 0.08, fx: ["tear"] },
  shocked: { lid: 1.38, pupil: 0.55, brow: -0.22, browY: 0.07, curve: 0, open: 0.95, width: 0.55, tremble: 0.02, armL: 1.9, armR: 1.9, fx: ["exclaim"] },
  crying: { eye: "closed", brow: -0.5, curve: -0.9, open: 0.55, width: 0.9, tremble: 0.012, pitch: -0.15, armL: 0.1, armR: 0.1, fx: ["tears"] },
  nervous: { lid: 1.05, pupil: 0.8, brow: -0.36, curve: -0.12, width: 0.75, tremble: 0.007, armL: 0.12, armR: 0.12, blush: 0.5, fx: ["sweat"] },
  determined: { lid: 0.7, brow: 0.38, curve: 0.05, width: 0.8, pitch: -0.08, armL: 0.6, armR: 0.6, bob: 0.03, bobSpeed: 2.6 },
  celebrating: { eye: "happy", curve: 1, open: 0.85, blush: 1, hop: 0.18, hopSpeed: 7, armL: 2.6, armR: 2.6, wave: 1, fx: ["confetti", "sparkles"] },
  proud: { eye: "happy", curve: 0.8, blush: 0.6, pitch: 0.1, armL: 0.95, armR: 0.95, bob: 0.03, fx: ["sparkles"] },
  relieved: { eye: "happy", brow: -0.12, curve: 0.5, blush: 0.4, bob: 0.02, armL: 0.4, armR: 0.4, fx: ["sweat"] },
  heartbroken: { lid: 0.72, pupil: 1.12, brow: -0.5, curve: -0.9, width: 0.85, pitch: -0.25, armL: 0.05, armR: 0.05, bob: 0.01, bobSpeed: 0.8, fx: ["cloud", "tear"] },
};

const SPIN_MOODS = new Set<Mood>(["onFire", "comeback", "celebrating"]);

type Num = Exclude<keyof Face, "eye" | "fx">;
const NUM_KEYS: Num[] = ["lid", "pupil", "lookY", "brow", "browY", "curve", "open", "width", "blush", "bob", "bobSpeed", "hop", "hopSpeed", "tremble", "lean", "pitch", "armL", "armR", "wave"];

// Body surface: sphere centred at y = BODY_Y with radius R.
const R = 0.42;
const BODY_Y = 0.43;
function onSurface(x: number, y: number, lift = 0): [number, number, number] {
  const dy = y - BODY_Y;
  return [x, y, Math.sqrt(Math.max(R * R - x * x - dy * dy, 0)) + lift];
}
function facing(x: number, y: number): [number, number, number] {
  return [-Math.asin((y - BODY_Y) / R) * 0.9, Math.asin(x / R) * 0.9, 0];
}

function starShape(outer = 0.07, inner = 0.032) {
  const s = new Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer;
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const p = [Math.cos(a) * r, Math.sin(a) * r] as const;
    if (i === 0) s.moveTo(p[0], p[1]);
    else s.lineTo(p[0], p[1]);
  }
  s.closePath();
  return s;
}

// ---------- Component ----------

export function Mascot({
  mood,
  pulse,
  lastHit,
  windRef,
  furShells = 36,
}: {
  mood: Mood;
  pulse: number;
  lastHit: boolean | null;
  windRef?: React.RefObject<number>;
  furShells?: number;
}) {
  const bodyGeo = useMemo(() => new SphereGeometry(R, 72, 54), []);
  const armGeo = useMemo(() => new CapsuleGeometry(0.055, 0.13, 8, 16), []);
  useEffect(() => () => {
    bodyGeo.dispose();
    armGeo.dispose();
  }, [bodyGeo, armGeo]);
  const face = useMemo<Face>(() => ({ ...BASE, ...FACES[mood] }), [mood]);
  const p = useRef<Record<Num, number>>(Object.fromEntries(NUM_KEYS.map((k) => [k, BASE[k]])) as Record<Num, number>);
  const eyeMix = useRef({ open: 1, happy: 0, closed: 0, star: 0 });
  const motion = useRef({ hopV: 0, hopY: 0, shake: 0, spin: 1, blinkAt: 2, blink: 0 });

  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const eyes = useRef<(Group | null)[]>([]);
  const pupils = useRef<(Group | null)[]>([]);
  const happyEyes = useRef<(Mesh | null)[]>([]);
  const closedEyes = useRef<(Mesh | null)[]>([]);
  const starEyes = useRef<(Mesh | null)[]>([]);
  const brows = useRef<(Mesh | null)[]>([]);
  const mouthLine = useRef<Mesh>(null);
  const mouthOpen = useRef<Group>(null);
  const cheeks = useRef<(Mesh | null)[]>([]);
  const arms = useRef<(Group | null)[]>([]);
  const tassel = useRef<Group>(null);

  const [fleeceNormal, fleeceRough] = useTexture(["/3d/textures/knitted_fleece_nor_gl.webp", "/3d/textures/knitted_fleece_rough.webp"]);
  useMemo(() => {
    for (const t of [fleeceNormal, fleeceRough]) {
      t.wrapS = t.wrapT = RepeatWrapping;
      t.repeat.set(3, 3);
    }
  }, [fleeceNormal, fleeceRough]);

  const starGeo = useMemo(() => new ExtrudeGeometry(starShape(0.085, 0.038), { depth: 0.02, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2 }), []);
  useEffect(() => () => starGeo.dispose(), [starGeo]);

  // One-shot reactions on every answer.
  useEffect(() => {
    if (!pulse) return;
    if (lastHit) motion.current.hopV = 2.6;
    else motion.current.shake = 1;
  }, [pulse, lastHit]);

  useEffect(() => {
    if (SPIN_MOODS.has(mood)) motion.current.spin = 0;
  }, [mood]);

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05);
    const t = state.clock.elapsedTime;
    const v = p.current;
    for (const k of NUM_KEYS) v[k] = MathUtils.damp(v[k], face[k], 7, d);
    const em = eyeMix.current;
    for (const k of ["open", "happy", "closed", "star"] as const) em[k] = MathUtils.damp(em[k], face.eye === k ? 1 : 0, 10, d);

    const m = motion.current;
    // Hop impulse with gravity.
    m.hopV -= 9.8 * d;
    m.hopY = Math.max(0, m.hopY + m.hopV * d);
    if (m.hopY === 0) m.hopV = 0;
    m.shake = MathUtils.damp(m.shake, 0, 4, d);
    m.spin = Math.min(1, m.spin + d / 0.9);
    // Blink every few seconds.
    if (t > m.blinkAt) {
      m.blink = 1;
      m.blinkAt = t + 2.5 + Math.random() * 3;
    }
    m.blink = MathUtils.damp(m.blink, 0, 18, d);

    if (root.current) {
      const hopLoop = Math.abs(Math.sin(t * v.hopSpeed)) * v.hop;
      const breathe = Math.sin(t * v.bobSpeed) * v.bob;
      const tremble = (Math.sin(t * 47) + Math.sin(t * 31)) * 0.5 * (v.tremble + m.shake * 0.03);
      root.current.position.set(tremble, hopLoop + breathe + m.hopY, 0);
      const spin = 1 - Math.pow(1 - m.spin, 3);
      root.current.rotation.set(
        v.pitch,
        state.pointer.x * 0.35 + spin * Math.PI * 2 + Math.sin(t * 0.6) * 0.06,
        v.lean + Math.sin(t * 1.3) * 0.02,
      );
    }
    if (body.current) {
      // Squash and stretch with the hop.
      const s = 1 + Math.sin(t * v.hopSpeed * 2) * v.hop * 0.6 + Math.sin(t * v.bobSpeed) * v.bob * 0.8 + m.hopV * 0.02;
      body.current.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
    }

    const lidScale = v.lid * (1 - m.blink * 0.92);
    eyes.current.forEach((e) => e?.scale.set(em.open, Math.max(em.open * lidScale, 0.001), em.open));
    pupils.current.forEach((pp) => {
      if (!pp) return;
      pp.scale.setScalar(v.pupil);
      pp.position.x = state.pointer.x * 0.018;
      pp.position.y = state.pointer.y * 0.012 + v.lookY * 0.03;
    });
    happyEyes.current.forEach((e) => e?.scale.setScalar(Math.max(em.happy, 0.001)));
    closedEyes.current.forEach((e) => e?.scale.setScalar(Math.max(em.closed, 0.001)));
    starEyes.current.forEach((e, i) => {
      if (!e) return;
      e.scale.setScalar(Math.max(em.star * (1 + Math.sin(t * 8) * 0.12), 0.001));
      e.rotation.z = t * 2 * (i ? -1 : 1);
    });

    brows.current.forEach((b, i) => {
      if (!b) return;
      const side = i === 0 ? -1 : 1;
      b.rotation.z = Math.PI / 2 + v.brow * side;
      b.position.y = 0.63 + v.browY;
    });

    if (mouthLine.current) {
      // Half torus: positive y-scale = smile, negative = frown.
      const curve = v.curve * (1 - v.open);
      mouthLine.current.scale.set(v.width, curve >= 0 ? Math.max(curve, 0.06) : Math.min(curve, -0.06), 1);
      mouthLine.current.visible = v.open < 0.85;
    }
    if (mouthOpen.current) {
      const o = Math.max(v.open, 0.001);
      mouthOpen.current.scale.set(v.width * (0.7 + 0.3 * o) * (v.curve < 0 ? 0.85 : 1), o, 1);
      mouthOpen.current.position.y = 0.33 + (v.curve >= 0 ? -0.01 : 0.005) * o;
    }
    cheeks.current.forEach((c) => {
      if (c) (c.material as MeshBasicMaterial).opacity = v.blush * 0.75;
    });

    arms.current.forEach((a, i) => {
      if (!a) return;
      const side = i === 0 ? -1 : 1;
      const base = i === 0 ? v.armL : v.armR;
      const wave = v.wave * Math.sin(t * 9 + i) * 0.35 + (v.hop > 0.04 ? Math.sin(t * v.hopSpeed * 2) * 0.15 : 0);
      a.rotation.z = side * (base + wave);
    });

    if (tassel.current) {
      tassel.current.rotation.z = Math.sin(t * 3) * 0.15 + m.hopV * 0.08 + (root.current?.rotation.z ?? 0) * -0.8;
      tassel.current.rotation.x = Math.sin(t * 2.2) * 0.1;
    }
  });

  const eyePos = [-0.15, 0.15];

  return (
    <group ref={root}>
      <group ref={body}>
        {/* Body */}
        <mesh geometry={bodyGeo} position={[0, BODY_Y, 0]} castShadow receiveShadow>
          <meshPhysicalMaterial
            color="#d99a12"
            roughness={0.8}
            roughnessMap={fleeceRough}
            normalMap={fleeceNormal}
            normalScale={[0.5, 0.5]}
          />
        </mesh>
        {/* Hair: short body fur, a fringe and a mane that swing with every move */}
        <group position={[0, BODY_Y, 0]}>
          <Fur
            geometry={bodyGeo}
            shells={furShells}
            length={0.13}
            density={68}
            regions="head"
            color={YELLOW}
            rootColor="#9a6400"
            tipColor="#fff1b8"
            windRef={windRef}
          />
        </group>

        {/* Eyes */}
        {eyePos.map((x, i) => (
          <group key={i} position={onSurface(x, 0.5, -0.005)} rotation={facing(x, 0.5)}>
            <group ref={(el) => { eyes.current[i] = el; }}>
              <mesh scale={[1, 1.18, 0.55]}>
                <sphereGeometry args={[0.098, 32, 24]} />
                <meshPhysicalMaterial color="#ffffff" roughness={0.15} clearcoat={1} />
              </mesh>
              <group ref={(el) => { pupils.current[i] = el; }}>
                <mesh position={[0, 0, 0.044]} scale={[1, 1.1, 0.5]}>
                  <sphereGeometry args={[0.058, 24, 16]} />
                  <meshPhysicalMaterial color={INK} roughness={0.2} clearcoat={1} />
                </mesh>
                <mesh position={[0.02, 0.026, 0.072]}>
                  <sphereGeometry args={[0.016, 12, 8]} />
                  <meshBasicMaterial color="#ffffff" />
                </mesh>
              </group>
            </group>
            {/* ^ happy */}
            <mesh ref={(el) => { happyEyes.current[i] = el; }} position={[0, -0.02, 0.03]}>
              <torusGeometry args={[0.07, 0.02, 10, 28, Math.PI]} />
              <meshStandardMaterial color={INK} roughness={0.4} />
            </mesh>
            {/* u closed */}
            <mesh ref={(el) => { closedEyes.current[i] = el; }} position={[0, 0.02, 0.03]} rotation={[0, 0, Math.PI]}>
              <torusGeometry args={[0.065, 0.019, 10, 28, Math.PI]} />
              <meshStandardMaterial color={INK} roughness={0.4} />
            </mesh>
            {/* ★ star */}
            <mesh ref={(el) => { starEyes.current[i] = el; }} geometry={starGeo} position={[0, 0, 0.02]}>
              <meshStandardMaterial color="#ffb703" emissive="#ff8a00" emissiveIntensity={1.4} roughness={0.3} />
            </mesh>
          </group>
        ))}

        {/* Brows */}
        {eyePos.map((x, i) => (
          <mesh key={i} ref={(el) => { brows.current[i] = el; }} position={onSurface(x, 0.63, 0.006)} rotation={[0, 0, Math.PI / 2]}>
            <capsuleGeometry args={[0.016, 0.075, 4, 8]} />
            <meshStandardMaterial color={INK} roughness={0.5} />
          </mesh>
        ))}

        {/* Mouth: smile/frown line and open mouth */}
        <group position={onSurface(0, 0.33, 0.004)} rotation={facing(0, 0.33)}>
          <mesh ref={mouthLine} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.08, 0.017, 10, 32, Math.PI]} />
            <meshStandardMaterial color={INK} roughness={0.4} />
          </mesh>
        </group>
        <group ref={mouthOpen} position={[0, 0.33, 0]}>
          <group position={[0, 0, onSurface(0, 0.33, 0.002)[2]]} rotation={facing(0, 0.33)}>
            <mesh scale={[0.1, 0.09, 1]}>
              <circleGeometry args={[1, 32]} />
              <meshStandardMaterial color="#5b1a1a" roughness={0.6} side={DoubleSide} />
            </mesh>
            <mesh position={[0, -0.045, 0.001]} scale={[0.06, 0.035, 1]}>
              <circleGeometry args={[1, 24]} />
              <meshStandardMaterial color="#ef7d8a" roughness={0.6} side={DoubleSide} />
            </mesh>
          </group>
        </group>

        {/* Cheeks */}
        {[-0.25, 0.25].map((x, i) => (
          <mesh key={i} ref={(el) => { cheeks.current[i] = el; }} position={onSurface(x, 0.39, 0.003)} rotation={facing(x, 0.39)}>
            <circleGeometry args={[0.06, 24]} />
            <meshBasicMaterial color="#ff6f91" transparent opacity={0.3} depthWrite={false} />
          </mesh>
        ))}

        {/* Arms */}
        {[-1, 1].map((side, i) => (
          <group key={side} ref={(el) => { arms.current[i] = el; }} position={[side * 0.39, 0.44, 0.02]}>
            <group position={[0, -0.12, 0]}>
              <mesh geometry={armGeo} castShadow>
                <meshPhysicalMaterial color="#d99a12" roughness={0.85} />
              </mesh>
              <Fur geometry={armGeo} shells={Math.round(furShells * 0.5)} length={0.03} density={90} color={YELLOW} rootColor="#9a6400" tipColor="#fff1b8" windRef={windRef} />
            </group>
          </group>
        ))}

        {/* Feet */}
        {[-0.16, 0.16].map((x) => (
          <mesh key={x} position={[x, 0.04, 0.12]} scale={[1, 0.55, 1.35]} castShadow>
            <sphereGeometry args={[0.1, 24, 16]} />
            <meshPhysicalMaterial color={BLUE} roughness={0.35} clearcoat={0.6} />
          </mesh>
        ))}

        {/* Graduation cap */}
        <group position={[0, 0.83, -0.02]} rotation={[-0.08, 0, 0.06]}>
          <mesh position={[0, 0.03, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.23, 0.12, 32]} />
            <meshPhysicalMaterial color={INK} roughness={0.55} sheen={0.6} sheenColor="#3651d4" />
          </mesh>
          <mesh position={[0, 0.1, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <boxGeometry args={[0.52, 0.03, 0.52]} />
            <meshPhysicalMaterial color={INK} roughness={0.5} sheen={0.6} sheenColor="#3651d4" />
          </mesh>
          <mesh position={[0, 0.122, 0]}>
            <cylinderGeometry args={[0.022, 0.022, 0.014, 16]} />
            <meshStandardMaterial color={YELLOW} roughness={0.4} />
          </mesh>
          {/* Tassel swings from the button to the corner */}
          <group position={[0, 0.12, 0]}>
            <mesh position={[0.13, 0, 0.13]} rotation={[Math.PI / 2, 0, -Math.PI / 4]}>
              <cylinderGeometry args={[0.006, 0.006, 0.36, 6]} />
              <meshStandardMaterial color={YELLOW} />
            </mesh>
            <group ref={tassel} position={[0.26, -0.01, 0.26]}>
              <mesh position={[0, -0.09, 0]}>
                <cylinderGeometry args={[0.006, 0.006, 0.18, 6]} />
                <meshStandardMaterial color={YELLOW} />
              </mesh>
              <mesh position={[0, -0.2, 0]}>
                <coneGeometry args={[0.03, 0.08, 12]} />
                <meshStandardMaterial color={YELLOW} roughness={0.6} />
              </mesh>
            </group>
          </group>
        </group>
      </group>

      <MoodFx fx={face.fx} />
    </group>
  );
}

// ---------- Effects around the mascot ----------

function FadeIn({ on, children, speed = 6 }: { on: boolean; children: React.ReactNode; speed?: number }) {
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

function Drops({ count, side, speed = 1.2 }: { count: number; side: number[]; speed?: number }) {
  const refs = useRef<(Mesh | null)[]>([]);
  useFrame((s) => {
    refs.current.forEach((r, i) => {
      if (!r) return;
      const k = (s.clock.elapsedTime * speed + i / count) % 1;
      const sx = side[i % side.length];
      r.position.set(sx * (0.2 + k * 0.08), 0.45 - k * 0.35, onSurface(sx * 0.2, 0.45)[2] + 0.02 + k * 0.06);
      r.scale.setScalar(0.6 + Math.sin(k * Math.PI) * 0.6);
    });
  });
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el; }}>
          <sphereGeometry args={[0.022, 12, 10]} />
          <meshPhysicalMaterial color="#8fd3ff" roughness={0} transmission={0.6} thickness={0.1} ior={1.33} />
        </mesh>
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

function MoodFx({ fx }: { fx: Fx[] }) {
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
      <FadeIn on={has("sweat")}>
        <mesh position={[0.33, 0.72, 0.18]} scale={[1, 1.4, 1]}>
          <sphereGeometry args={[0.035, 16, 12]} />
          <meshPhysicalMaterial color="#8fd3ff" roughness={0} transmission={0.5} thickness={0.1} />
        </mesh>
      </FadeIn>
      <FadeIn on={has("tear")}>
        <Drops count={2} side={[1]} speed={0.6} />
      </FadeIn>
      <FadeIn on={has("tears")}>
        <Drops count={8} side={[-1, 1]} speed={1.4} />
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
