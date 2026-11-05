"use client";

/* eslint-disable react-hooks/immutability -- three.js scene objects, textures and refs are mutated by design inside useFrame and setup effects */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, RoundedBox, useAnimations, useGLTF, useTexture } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef } from "react";
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  Box3,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  ExtrudeGeometry,
  LoopRepeat,
  MathUtils,
  Object3D,
  PCFShadowMap,
  Quaternion,
  RepeatWrapping,
  Shape,
  SRGBColorSpace,
  Vector3,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
  type PerspectiveCamera,
  type PointLight,
  type Texture,
} from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";

// A chubby cartoon blacksmith forging a quiz on an anvil.
// Character: KayKit "Adventurers" Barbarian (CC0, Kay Lousberg), rigged and animated. The head is rebuilt here and the smith
// is dressed with a leather apron, gauntlets, tool belt and a laurel wreath. Textures: Poly Haven (CC0) PBR at 2k.
//
// Coordination of the blow: when the scene loads, the clip is sampled once to find the exact instant the hammer is lowest
// and where it is. The anvil is then placed under that point, and at that same clip time (not "somewhere near it") the
// sparks, shockwave, flash, ingot glow and camera shake fire.

const CLIP = "1H_Melee_Attack_Chop";
const SMITH_X = -0.1;
const HEAD_HALF = 0.085; // half the height of the hammer head: its face touches the anvil this far below its centre

type Shared = {
  impact: { current: number };
  flame: { current: number };
  hit: Vector3; // where the hammer head centre is at the moment of impact
  top: { current: number }; // anvil surface height
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

// ---------- Sparks and shockwave ----------

const SPARKS = 90;

function Sparks({ shared }: { shared: Shared }) {
  const state = useMemo(
    () => ({ pos: new Float32Array(SPARKS * 3), vel: new Float32Array(SPARKS * 3), life: new Float32Array(SPARKS), seen: 0 }),
    [],
  );
  const geo = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(state.pos, 3));
    return g;
  }, [state]);
  useEffect(() => () => geo.dispose(), [geo]);

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    if (shared.impact.current > 1 && state.seen !== shared.impact.current) {
      state.seen = shared.impact.current;
      for (let i = 0; i < SPARKS; i++) {
        const a = Math.random() * Math.PI * 2;
        const up = 1 + Math.random() * 2.6;
        const out = 0.4 + Math.random() * 1.9;
        state.pos.set([shared.hit.x + (Math.random() - 0.5) * 0.08, shared.top.current + 0.02, shared.hit.z + (Math.random() - 0.5) * 0.08], i * 3);
        state.vel.set([Math.cos(a) * out, up, Math.sin(a) * out], i * 3);
        state.life[i] = 0.5 + Math.random() * 0.7;
      }
    }
    for (let i = 0; i < SPARKS; i++) {
      if (state.life[i] <= 0) {
        state.pos[i * 3 + 1] = -10;
        continue;
      }
      state.life[i] -= d;
      state.vel[i * 3 + 1] -= 6.5 * d;
      state.pos[i * 3] += state.vel[i * 3] * d;
      state.pos[i * 3 + 1] += state.vel[i * 3 + 1] * d;
      state.pos[i * 3 + 2] += state.vel[i * 3 + 2] * d;
      if (state.pos[i * 3 + 1] < 0.02) {
        state.pos[i * 3 + 1] = 0.02;
        state.vel[i * 3 + 1] *= -0.3;
      }
    }
    geo.attributes.position.needsUpdate = true;
  });

  return (
    <points geometry={geo} frustumCulled={false}>
      <pointsMaterial color="#ffb347" size={0.045} sizeAttenuation transparent depthWrite={false} blending={AdditiveBlending} />
    </points>
  );
}

// A flat ring of light that spreads over the anvil face and fades, right at the instant of the blow.
function Shockwave({ shared }: { shared: Shared }) {
  const ring = useRef<Mesh>(null);
  const mat = useRef<MeshBasicMaterial>(null);
  const age = useRef(9);
  const seen = useRef(0);
  useFrame((_, dt) => {
    if (!ring.current || !mat.current) return;
    if (shared.impact.current > 1 && seen.current !== shared.impact.current) {
      seen.current = shared.impact.current;
      age.current = 0;
    }
    age.current += dt;
    const k = Math.min(1, age.current / 0.4);
    ring.current.visible = k < 1;
    ring.current.position.set(shared.hit.x, shared.top.current + 0.012, shared.hit.z);
    ring.current.scale.setScalar(0.08 + k * 0.7);
    mat.current.opacity = (1 - k) * 0.9;
  });
  return (
    <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[0.8, 1, 48]} />
      <meshBasicMaterial ref={mat} color="#ffd9a0" transparent opacity={0} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
    </mesh>
  );
}

// ---------- Anvil (chunky, PBR iron on a log stump) ----------

function Anvil({ low, shared }: { low: boolean; shared: Shared }) {
  const iron = usePbr("anvil", low, [1.2, 1.2]);
  const wood = usePbr("leather", low, [2, 2]);
  const group = useRef<Group>(null);
  const body = useMemo(() => {
    const s = new Shape();
    s.moveTo(-0.2, 0);
    s.lineTo(0.2, 0);
    s.lineTo(0.15, 0.07);
    s.lineTo(0.14, 0.2);
    s.lineTo(0.26, 0.28);
    s.lineTo(0.42, 0.31);
    s.quadraticCurveTo(0.6, 0.34, 0.68, 0.43);
    s.lineTo(0.6, 0.46);
    s.lineTo(-0.36, 0.46);
    s.lineTo(-0.44, 0.43);
    s.lineTo(-0.4, 0.33);
    s.lineTo(-0.22, 0.27);
    s.lineTo(-0.14, 0.2);
    s.lineTo(-0.15, 0.07);
    s.closePath();
    const g = new ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 4 });
    g.translate(0, 0, -0.15);
    return g;
  }, []);
  useEffect(() => () => body.dispose(), [body]);
  const hot = useRef<MeshStandardMaterial>(null);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    // The anvil is authored with its face at y = 0.86: scale and move it so its face is exactly where the hammer lands.
    g.visible = shared.ready.current;
    const s = shared.top.current / 0.86;
    // Height follows the hammer; length and width stay chunky so the anvil does not look tiny next to the smith.
    const w = Math.max(s, 0.8);
    g.scale.set(w, s, w);
    g.position.set(shared.hit.x - 0.12 * w, 0, shared.hit.z);
    if (hot.current) hot.current.emissiveIntensity = 0.7 + shared.flame.current * 2.6;
  });
  return (
    <group ref={group} visible={false}>
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.34, 0.4, 32]} />
        <meshStandardMaterial {...wood} color="#9a7550" roughness={1} metalness={0} />
      </mesh>
      <mesh geometry={body} position={[0, 0.4, 0]} castShadow receiveShadow>
        <meshStandardMaterial {...iron} roughness={1} metalness={1} envMapIntensity={1.1} />
      </mesh>
      <mesh position={[0.12, 0.86 + 0.022, 0]} castShadow>
        <boxGeometry args={[0.36, 0.04, 0.1]} />
        <meshStandardMaterial ref={hot} color="#3a1a0c" emissive="#ff6a1a" emissiveIntensity={1} roughness={0.5} metalness={0.6} />
      </mesh>
    </group>
  );
}

// ---------- Blacksmith ----------

// Props and clothes of the Barbarian that do not belong to a smith. Its head is rebuilt below.
// Props only: the original head still counts for the size, because the rebuilt head replaces it at the same height.
const PROPS = ["1H_Axe_Offhand", "Barbarian_Round_Shield", "1H_Axe", "2H_Axe", "Mug", "Barbarian_Hat", "Barbarian_Cape"];
const HIDE = ["1H_Axe_Offhand", "Barbarian_Round_Shield", "1H_Axe", "2H_Axe", "Mug", "Barbarian_Hat", "Barbarian_Cape", "Barbarian_Head"];

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

const SKIN = "#e3a57b";
const HAIR = "#4a3828";

function Head({ low }: { low: boolean }) {
  void low;
  return (
    <group>
      {/* neck */}
      <mesh position={[0, 0.06, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.15, 0.2, 20]} />
        <meshStandardMaterial color={SKIN} roughness={0.7} />
      </mesh>
      {/* skull */}
      <mesh position={[0, 0.42, 0]} scale={[1, 0.98, 0.96]} castShadow>
        <sphereGeometry args={[0.36, 36, 28]} />
        <meshStandardMaterial color={SKIN} roughness={0.65} />
      </mesh>
      {/* hair at the sides and back, leaving the crown and forehead bare */}
      <mesh position={[0, 0.4, -0.05]} rotation={[-0.55, 0, 0]} scale={[1.0, 1, 1]}>
        <sphereGeometry args={[0.372, 28, 20, 0, Math.PI * 2, 0.55, 1.6]} />
        <meshStandardMaterial color={HAIR} roughness={0.95} side={DoubleSide} />
      </mesh>
      {/* ears */}
      {[-1, 1].map((x) => (
        <mesh key={x} position={[x * 0.355, 0.4, 0]} scale={[0.55, 1, 0.8]} castShadow>
          <sphereGeometry args={[0.085, 14, 12]} />
          <meshStandardMaterial color={SKIN} roughness={0.7} />
        </mesh>
      ))}
      {/* eyes and brows */}
      {[-1, 1].map((x) => (
        <group key={x}>
          <mesh position={[x * 0.125, 0.47, 0.305]} scale={[1, 1.15, 0.6]}>
            <sphereGeometry args={[0.062, 16, 12]} />
            <meshStandardMaterial color="#fffaf0" roughness={0.3} />
          </mesh>
          <mesh position={[x * 0.125, 0.465, 0.345]}>
            <sphereGeometry args={[0.032, 14, 10]} />
            <meshStandardMaterial color="#1d1510" roughness={0.2} />
          </mesh>
          <mesh position={[x * 0.125, 0.555, 0.31]} rotation={[0, 0, x * -0.28]} castShadow>
            <boxGeometry args={[0.15, 0.04, 0.05]} />
            <meshStandardMaterial color={HAIR} roughness={0.9} />
          </mesh>
          {/* rosy cheeks */}
          <mesh position={[x * 0.2, 0.34, 0.27]} scale={[1, 0.7, 0.4]}>
            <sphereGeometry args={[0.06, 12, 10]} />
            <meshStandardMaterial color="#e58a78" roughness={0.8} />
          </mesh>
        </group>
      ))}
      {/* round nose */}
      <mesh position={[0, 0.375, 0.345]} castShadow>
        <sphereGeometry args={[0.08, 18, 14]} />
        <meshStandardMaterial color="#e8937a" roughness={0.6} />
      </mesh>
      {/* moustache and bushy beard */}
      {[-1, 1].map((x) => (
        <mesh key={x} position={[x * 0.085, 0.3, 0.335]} rotation={[0, 0, x * 0.35]} scale={[1.5, 0.8, 0.8]} castShadow>
          <sphereGeometry args={[0.07, 14, 10]} />
          <meshStandardMaterial color={HAIR} roughness={0.95} />
        </mesh>
      ))}
      <mesh position={[0, 0.12, 0.2]} scale={[1, 1.1, 0.75]} castShadow>
        <sphereGeometry args={[0.25, 24, 18]} />
        <meshStandardMaterial color={HAIR} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.22, 0.31]} scale={[1.2, 0.5, 0.5]}>
        <sphereGeometry args={[0.07, 12, 10]} />
        <meshStandardMaterial color="#c9695a" roughness={0.5} />
      </mesh>
    </group>
  );
}

function Smith({ low, shared }: { low: boolean; shared: Shared }) {
  const gltf = useGLTF("/3d/forge/smith.glb");
  const root = useRef<Group>(null);
  const hammerHead = useRef<Object3D>(null);
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

  // The pack is authored small: scale the character to a chubby 1.75 m.
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
    act.setEffectiveTimeScale(0.8);
    return () => {
      act.stop();
    };
  }, [actions, shared]);

  // Fire the effects at the measured instant of the clip (handles the loop wrapping around).
  useFrame(() => {
    const act = actions[CLIP];
    if (!act || !shared.ready.current) return;
    const t = act.time;
    const t0 = impactTime.current;
    const prev = lastTime.current;
    const crossed = t >= prev ? prev < t0 && t >= t0 : t0 > prev || t >= t0;
    if (crossed) shared.impact.current = 1 + Math.random() * 0.01;
    lastTime.current = t;
  });

  const leaves = useMemo(() => Array.from({ length: 18 }, (_, i) => ({ a: (i / 18) * Math.PI * 2, t: i % 2 ? 0.4 : -0.4 })), []);
  const handBone = model.getObjectByName("handslotr");
  const headBone = model.getObjectByName("head");
  const hipsBone = model.getObjectByName("hips");
  const chestBone = model.getObjectByName("chest");
  const lowerArmR = model.getObjectByName("lowerarmr");
  const lowerArmL = model.getObjectByName("lowerarml");

  const leatherMat = { ...leather, color: "#8a5a34", roughness: 1, metalness: 0 } as const;

  return (
    <group ref={root} position={[SMITH_X, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={scale}>
      <primitive object={model} />

      {/* Hammer in the right hand: chunky, cartoon proportions. */}
      {handBone && (
        <BoneMount bone={handBone}>
          <mesh position={[0, 0.12, 0]} castShadow>
            <cylinderGeometry args={[0.03, 0.035, 0.5, 16]} />
            <meshStandardMaterial {...leather} color="#a67c52" roughness={1} metalness={0} />
          </mesh>
          <group position={[0, 0.4, 0]}>
            <RoundedBox args={[0.3, 0.17, 0.15]} radius={0.04} smoothness={4} castShadow>
              <meshStandardMaterial {...iron} roughness={1} metalness={1} />
            </RoundedBox>
            <object3D ref={hammerHead} />
          </group>
        </BoneMount>
      )}

      {/* Rebuilt head with laurel wreath */}
      {headBone && (
        <BoneMount bone={headBone} upright={model}>
          <Head low={low} />
          <group position={[0, 0.66, 0]} rotation={[-0.15, 0, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.33, 0.018, 8, 48]} />
              <meshStandardMaterial color="#f0c15a" roughness={0.35} metalness={0.7} emissive="#6a4a10" emissiveIntensity={0.4} />
            </mesh>
            {leaves.map((l, i) => (
              <mesh key={i} position={[Math.cos(l.a) * 0.335, l.t * 0.03, Math.sin(l.a) * 0.335]} rotation={[0, -l.a, l.t]} scale={[1, 0.35, 0.6]} castShadow>
                <sphereGeometry args={[0.08, 10, 8]} />
                <meshStandardMaterial color="#7fb040" roughness={0.5} metalness={0.2} />
              </mesh>
            ))}
          </group>
        </BoneMount>
      )}

      {/* Short tunic and bronze belt with tools */}
      {hipsBone && (
        <BoneMount bone={hipsBone} upright={model}>
          <mesh position={[0, -0.04, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.32, 0.34, 32, 1, true]} />
            <meshStandardMaterial {...cloth} color="#e8dcc0" roughness={1} metalness={0} side={DoubleSide} />
          </mesh>
          <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[0.22, 0.04, 12, 40]} />
            <meshStandardMaterial {...leatherMat} />
          </mesh>
          {/* pouch and tongs hanging from the belt */}
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
            <meshStandardMaterial {...leatherMat} color="#76492a" />
          </mesh>
          {/* neck strap */}
          {[-1, 1].map((x) => (
            <mesh key={x} position={[x * 0.13, 0.34, 0.12]} rotation={[0.4, 0, x * -0.25]} castShadow>
              <boxGeometry args={[0.05, 0.3, 0.03]} />
              <meshStandardMaterial {...leatherMat} color="#5e3a22" />
            </mesh>
          ))}
        </BoneMount>
      )}

      {/* Leather gauntlets */}
      {[lowerArmR, lowerArmL].map((b, i) =>
        b ? (
          <BoneMount key={i} bone={b}>
            <mesh position={[0, 0.17, 0]} castShadow>
              <cylinderGeometry args={[0.095, 0.085, 0.2, 20]} />
              <meshStandardMaterial {...leatherMat} color="#5e3a22" />
            </mesh>
          </BoneMount>
        ) : null,
      )}
    </group>
  );
}

// ---------- Forge, columns and floor ----------

function Surroundings({ low, flame }: { low: boolean; flame: Shared["flame"] }) {
  const marble = usePbr("floor", low, [3, 3]);
  const col = usePbr("floor", low, [1, 3]);
  const iron = usePbr("anvil", low, [1, 1]);
  const light = useRef<PointLight>(null);
  const flames = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const f = 1 + Math.sin(t * 11) * 0.08 + Math.sin(t * 23.7) * 0.05;
    if (light.current) light.current.intensity = 7 * f + flame.current * 14;
    flames.current?.children.forEach((c, i) => {
      c.scale.set(1, 0.85 + Math.sin(t * (9 + i * 2.3) + i) * 0.22, 1);
    });
  });
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[4.2, 64]} />
        <meshStandardMaterial {...marble} roughness={1} metalness={0} color="#f1eadf" />
      </mesh>
      {[-3.1, 2.7].map((x, i) => (
        <group key={x} position={[x, 0, -1.4 - i * 0.3]}>
          <mesh position={[0, 1.7, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.2, 0.22, 3.4, 40]} />
            <meshStandardMaterial {...col} roughness={1} metalness={0} color="#f4eee4" />
          </mesh>
          <mesh position={[0, 0.07, 0]}>
            <boxGeometry args={[0.6, 0.14, 0.6]} />
            <meshStandardMaterial {...col} roughness={1} metalness={0} color="#f4eee4" />
          </mesh>
          <mesh position={[0, 3.45, 0]}>
            <boxGeometry args={[0.6, 0.12, 0.6]} />
            <meshStandardMaterial {...col} roughness={1} metalness={0} color="#f4eee4" />
          </mesh>
        </group>
      ))}
      <group position={[-1.9, 0, -0.9]}>
        <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.9, 0.6, 0.6]} />
          <meshStandardMaterial {...iron} roughness={1} metalness={0.4} color="#6b6258" />
        </mesh>
        <mesh position={[0, 0.61, 0]}>
          <boxGeometry args={[0.7, 0.04, 0.42]} />
          <meshStandardMaterial color="#2a0f06" emissive="#ff5a12" emissiveIntensity={2.2} />
        </mesh>
        <group ref={flames} position={[0, 0.63, 0]}>
          {[-0.2, 0, 0.2].map((x, i) => (
            <mesh key={x} position={[x, 0.16, 0]}>
              <sphereGeometry args={[0.085, 16, 12]} />
              <meshBasicMaterial color={i === 1 ? "#ffd070" : "#ff7a22"} transparent opacity={0.5} blending={AdditiveBlending} depthWrite={false} />
            </mesh>
          ))}
        </group>
        <pointLight ref={light} position={[0.2, 0.9, 0.6]} color="#ff8a3a" distance={7} decay={1.6} intensity={7} />
      </group>
    </group>
  );
}

// ---------- Camera and impact reaction ----------

function Director({ shared }: { shared: Shared }) {
  const { camera, size } = useThree();
  const flash = useRef<PointLight>(null);
  const shake = useRef(0);
  const lastSeen = useRef(0);

  useEffect(() => {
    const cam = camera as PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    const tan = Math.tan(MathUtils.degToRad(cam.fov / 2));
    const dist = Math.max(2.5 / (2 * tan), 2.7 / (2 * tan * aspect));
    // On wide banners the title sits on the left, so the scene is pushed to the right.
    const lx = aspect > 2 ? -0.75 : aspect > 1.2 ? -0.45 : -0.15;
    cam.position.set(lx + dist * 0.2, 1.3, dist * 0.97);
    cam.lookAt(lx, 0.9, 0.2);
    cam.updateProjectionMatrix();
  }, [camera, size]);

  useFrame(({ camera: cam }, dt) => {
    // Everything reacts on the very frame the blow lands.
    if (shared.impact.current > 1 && shared.impact.current !== lastSeen.current) {
      lastSeen.current = shared.impact.current;
      shake.current = 1;
      shared.flame.current = 1;
    }
    shared.flame.current = Math.max(0, shared.flame.current - dt * 2.4);
    shake.current = Math.max(0, shake.current - dt * 7);
    if (flash.current) {
      flash.current.intensity = shared.flame.current > 0.5 ? (shared.flame.current - 0.5) * 24 : 0;
      flash.current.position.set(shared.hit.x, shared.top.current + 0.25, shared.hit.z + 0.4);
    }
    cam.position.y = 1.3 + Math.sin((performance.now() / 1000) * 60) * 0.007 * shake.current;
  });
  return <pointLight ref={flash} color="#ffb060" distance={3.4} decay={2} intensity={0} />;
}

function Ready({ onReady }: { onReady: () => void }) {
  useEffect(onReady, [onReady]);
  return null;
}

export default function ForgeScene({ low, active, onReady }: { low: boolean; active: boolean; onReady: () => void }) {
  const shared = useMemo<Shared>(
    () => ({ impact: { current: 0 }, flame: { current: 0 }, hit: new Vector3(0.39, 0.5, 0.45), top: { current: 0.43 }, ready: { current: false } }),
    [],
  );
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={low ? [1, 1.25] : [1, 1.75]}
      shadows={low ? false : { type: PCFShadowMap }}
      camera={{ fov: 30, near: 0.1, far: 40, position: [1, 1.3, 6] }}
      gl={{ antialias: !low, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = SRGBColorSpace;
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.1;
      }}
    >
      <fog attach="fog" args={["#120d14", 7, 14]} />
      <Environment files="/3d/env.hdr" environmentIntensity={0.55} />
      <hemisphereLight args={["#c8d0ff", "#4a3020", 0.8]} />
      <directionalLight
        position={[2.2, 3.6, 3]}
        intensity={2.9}
        color="#ffe9cc"
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
      <Suspense fallback={null}>
        <Surroundings low={low} flame={shared.flame} />
        <Anvil low={low} shared={shared} />
        <Smith low={low} shared={shared} />
        <Sparks shared={shared} />
        <Shockwave shared={shared} />
        <Ready onReady={onReady} />
      </Suspense>
      <Director shared={shared} />
    </Canvas>
  );
}
