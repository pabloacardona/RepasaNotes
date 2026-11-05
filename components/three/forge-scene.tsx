"use client";

/* eslint-disable react-hooks/immutability -- three.js scene objects, textures and refs are mutated by design inside useFrame and setup effects */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, useGLTF, useTexture } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef } from "react";
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  MathUtils,
  PCFShadowMap,
  RepeatWrapping,
  Shape,
  SRGBColorSpace,
  Vector2,
  type Group,
  type MeshStandardMaterial,
  type PerspectiveCamera,
  type PointLight,
  type Points,
  type Texture,
} from "three";

// A blacksmith in Olympian dress forging a quiz on an anvil.
// Assets: Poly Haven (CC0): metal_plate_02, rust_coarse_01, terlenka, brown_leather, marble_tiles (2k PBR, converted to webp) and the
// cross_pein_hammer model. The anvil and the smith are built from geometry and wear those PBR materials.

const CYCLE = 2.0; // seconds per hammer blow
const STRIKE_AT = 1.1; // moment of impact inside the cycle
const ANVIL_TOP = 0.92;
const HIT_X = 0.0;

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

// ---------- Sparks ----------

const SPARKS = 70;

function Sparks({ impact }: { impact: React.MutableRefObject<number> }) {
  const points = useRef<Points>(null);
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
    if (impact.current > 0.98 && state.seen !== impact.current) {
      state.seen = impact.current;
      for (let i = 0; i < SPARKS; i++) {
        const a = Math.random() * Math.PI * 2;
        const up = 0.8 + Math.random() * 2.2;
        const out = 0.5 + Math.random() * 1.8;
        state.pos.set([HIT_X + (Math.random() - 0.5) * 0.08, ANVIL_TOP + 0.03, 0.12 + (Math.random() - 0.5) * 0.06], i * 3);
        state.vel.set([Math.cos(a) * out, up, Math.sin(a) * out * 0.6], i * 3);
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
    <points ref={points} geometry={geo} frustumCulled={false}>
      <pointsMaterial color="#ffb347" size={0.035} sizeAttenuation transparent depthWrite={false} blending={AdditiveBlending} />
    </points>
  );
}

// ---------- Anvil ----------

function Anvil({ low, glow }: { low: boolean; glow: React.MutableRefObject<number> }) {
  const iron = usePbr("anvil", low, [1.2, 1.2]);
  const leather = usePbr("leather", low, [2, 2]);
  const body = useMemo(() => {
    // Side profile (x along the anvil, y up), then extruded across its width.
    const s = new Shape();
    s.moveTo(-0.17, 0);
    s.lineTo(0.17, 0);
    s.lineTo(0.12, 0.05);
    s.lineTo(0.1, 0.17);
    s.lineTo(0.2, 0.25);
    s.lineTo(0.34, 0.285);
    s.quadraticCurveTo(0.5, 0.31, 0.58, 0.4);
    s.lineTo(0.5, 0.42);
    s.lineTo(-0.3, 0.42);
    s.lineTo(-0.38, 0.4);
    s.lineTo(-0.34, 0.31);
    s.lineTo(-0.18, 0.25);
    s.lineTo(-0.1, 0.17);
    s.lineTo(-0.12, 0.05);
    s.closePath();
    const g = new ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 });
    g.translate(0, 0, -0.1);
    // ExtrudeGeometry UVs are in model units; scale them so the 2k texture tiles at a believable size.
    return g;
  }, []);
  useEffect(() => () => body.dispose(), [body]);
  const hot = useRef<MeshStandardMaterial>(null);
  useFrame(() => {
    if (hot.current) hot.current.emissiveIntensity = 0.6 + glow.current * 2.4;
  });
  return (
    <group>
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.24, 0.27, 0.5, 40]} />
        <meshStandardMaterial {...leather} color="#8a6a4a" roughness={1} metalness={0} />
      </mesh>
      <mesh geometry={body} position={[0, 0.5, 0]} castShadow receiveShadow>
        <meshStandardMaterial {...iron} roughness={1} metalness={1} envMapIntensity={1.1} />
      </mesh>
      {/* Glowing ingot being forged. */}
      <mesh position={[HIT_X, ANVIL_TOP + 0.018, 0.12]} castShadow>
        <boxGeometry args={[0.32, 0.034, 0.075]} />
        <meshStandardMaterial ref={hot} color="#3a1a0c" emissive="#ff6a1a" emissiveIntensity={1} roughness={0.5} metalness={0.6} />
      </mesh>
    </group>
  );
}

// ---------- Blacksmith ----------

function Smith({ low, anim }: { low: boolean; anim: React.MutableRefObject<{ th: number; ph: number; lean: number }> }) {
  const cloth = usePbr("chiton", low, [4, 2]);
  const bronze = usePbr("bronze", low, [2, 2]);
  const leather = usePbr("leather", low, [2, 2]);
  const hammer = useGLTF("/3d/forge/hammer.gltf");
  const hammerScene = useMemo(() => hammer.scene.clone(true), [hammer.scene]);

  const tunic = useMemo(() => {
    const pts: Vector2[] = [];
    // Chiton: fitted at the belt, flaring to a rippled hem above the knee.
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      const y = 1.02 - t * 0.5;
      const r = 0.2 + t * 0.1 + Math.sin(t * 9) * 0.008;
      pts.push(new Vector2(r, y));
    }
    return new LatheGeometry(pts, 40);
  }, []);
  const top = useMemo(() => {
    const pts: Vector2[] = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      pts.push(new Vector2(0.2 - Math.sin(t * Math.PI) * -0.012 + (t > 0.7 ? -0.02 * (t - 0.7) * 6 : 0), 1.0 + t * 0.42));
    }
    return new LatheGeometry(pts, 40);
  }, []);
  useEffect(() => () => { tunic.dispose(); top.dispose(); }, [tunic, top]);

  const skin = { color: "#c68a62", roughness: 0.62, metalness: 0 } as const;
  const rightShoulder = useRef<Group>(null);
  const rightElbow = useRef<Group>(null);
  const torso = useRef<Group>(null);

  useFrame(() => {
    const a = anim.current;
    if (rightShoulder.current) rightShoulder.current.rotation.z = a.th;
    if (rightElbow.current) rightElbow.current.rotation.z = a.ph;
    if (torso.current) torso.current.rotation.z = a.lean;
  });

  const leaves = useMemo(
    () => Array.from({ length: 16 }, (_, i) => ({ a: (i / 16) * Math.PI * 2, tilt: i % 2 ? 0.5 : -0.5 })),
    [],
  );

  const arm = (side: 1 | -1, refs?: { shoulder: React.Ref<Group>; elbow: React.Ref<Group> }, th = 0.2, ph = 0.1, yaw = 0, withHammer = false) => (
    <group position={[0.04, 1.48, side * 0.19]} rotation={[0, yaw, 0]}>
      <group ref={refs?.shoulder} rotation={[0, 0, th]}>
        <mesh position={[0, -0.15, 0]} castShadow>
          <capsuleGeometry args={[0.07, 0.22, 6, 14]} />
          <meshStandardMaterial {...skin} />
        </mesh>
        <mesh position={[0, 0.0, 0]} castShadow>
          <sphereGeometry args={[0.085, 20, 14]} />
          <meshStandardMaterial {...skin} />
        </mesh>
        <group position={[0, -0.3, 0]} ref={refs?.elbow} rotation={[0, 0, ph]}>
          <mesh position={[0, -0.14, 0]} castShadow>
            <capsuleGeometry args={[0.058, 0.2, 6, 14]} />
            <meshStandardMaterial {...skin} />
          </mesh>
          {/* Bronze bracer */}
          <mesh position={[0, -0.17, 0]} castShadow>
            <cylinderGeometry args={[0.058, 0.052, 0.11, 24]} />
            <meshStandardMaterial {...bronze} roughness={1} metalness={1} color="#d9a45a" />
          </mesh>
          <mesh position={[0, -0.3, 0]} castShadow>
            <sphereGeometry args={[0.052, 18, 14]} />
            <meshStandardMaterial {...skin} />
          </mesh>
          {withHammer && (
            <group position={[0, -0.363, 0]} rotation={[Math.PI, 0, 0]} scale={1.9}>
              <primitive object={hammerScene} />
            </group>
          )}
          {!withHammer && (
            // Tongs holding the ingot: two bronze bars closing on it.
            <group position={[0, -0.34, 0]}>
              {[-1, 1].map((k) => (
                <mesh key={k} position={[k * 0.012, -0.12, 0]} rotation={[0, 0, k * 0.05]} castShadow>
                  <boxGeometry args={[0.014, 0.34, 0.03]} />
                  <meshStandardMaterial {...bronze} roughness={1} metalness={1} color="#8a6a44" />
                </mesh>
              ))}
            </group>
          )}
        </group>
      </group>
    </group>
  );

  return (
    <group position={[-0.78, 0, 0]}>
      {/* Legs and sandals */}
      {[0.1, -0.1].map((z, i) => (
        <group key={z} position={[i ? -0.06 : 0.05, 0, z]}>
          <mesh position={[0, 0.34, 0]} castShadow>
            <capsuleGeometry args={[0.078, 0.5, 6, 14]} />
            <meshStandardMaterial {...skin} />
          </mesh>
          <mesh position={[0.05, 0.035, 0]} castShadow>
            <boxGeometry args={[0.27, 0.05, 0.11]} />
            <meshStandardMaterial {...leather} roughness={1} metalness={0} color="#9a7550" />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.083, 0.083, 0.012, 16]} />
            <meshStandardMaterial {...leather} roughness={1} metalness={0} color="#9a7550" />
          </mesh>
        </group>
      ))}

      <group ref={torso} position={[0, 0.98, 0]}>
        <group position={[0, -0.98, 0]}>
          <mesh geometry={tunic} castShadow receiveShadow>
            <meshStandardMaterial {...cloth} color="#f1e6cf" roughness={1} metalness={0} side={2} />
          </mesh>
          <mesh geometry={top} castShadow>
            <meshStandardMaterial {...cloth} color="#f1e6cf" roughness={1} metalness={0} side={2} />
          </mesh>
          {/* Bare shoulders and chest */}
          <mesh position={[0, 1.36, 0]} scale={[1, 1, 1.12]} castShadow>
            <capsuleGeometry args={[0.172, 0.1, 6, 20]} />
            <meshStandardMaterial {...skin} />
          </mesh>
          {/* One-shoulder drape and belt */}
          <mesh position={[0.01, 1.22, 0]} rotation={[0.45, 0, -0.18]} castShadow>
            <torusGeometry args={[0.2, 0.034, 10, 40, Math.PI * 1.05]} />
            <meshStandardMaterial {...cloth} color="#e7d9bb" roughness={1} metalness={0} />
          </mesh>
          <mesh position={[0, 1.02, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[0.205, 0.028, 12, 40]} />
            <meshStandardMaterial {...bronze} roughness={1} metalness={1} color="#d9a45a" />
          </mesh>
          <mesh position={[0, 0.91, 0.0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.215, 0.012, 8, 40]} />
            <meshStandardMaterial {...leather} roughness={1} metalness={0} color="#7a5a3a" />
          </mesh>
          {/* Fibula (shoulder clasp) */}
          <mesh position={[0.02, 1.5, 0.19]} castShadow>
            <sphereGeometry args={[0.028, 16, 12]} />
            <meshStandardMaterial {...bronze} roughness={1} metalness={1} color="#f0c070" />
          </mesh>

          {/* Neck and head */}
          <mesh position={[0.01, 1.58, 0]} castShadow>
            <cylinderGeometry args={[0.052, 0.06, 0.1, 16]} />
            <meshStandardMaterial {...skin} />
          </mesh>
          <group position={[0.03, 1.72, 0]}>
            <mesh castShadow>
              <sphereGeometry args={[0.118, 28, 22]} />
              <meshStandardMaterial {...skin} />
            </mesh>
            <mesh position={[-0.02, 0.035, 0]} scale={[1.02, 0.92, 1.02]}>
              <sphereGeometry args={[0.122, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
              <meshStandardMaterial color="#3b2a1e" roughness={0.9} />
            </mesh>
            <mesh position={[0.045, -0.075, 0]} scale={[0.95, 1.15, 1]} castShadow>
              <sphereGeometry args={[0.09, 20, 16]} />
              <meshStandardMaterial color="#4a3426" roughness={1} />
            </mesh>
            <mesh position={[0.115, -0.005, 0]} castShadow>
              <sphereGeometry args={[0.022, 12, 10]} />
              <meshStandardMaterial {...skin} />
            </mesh>
            {[0.05, -0.05].map((z) => (
              <group key={z}>
                <mesh position={[0.095, 0.025, z]}>
                  <sphereGeometry args={[0.013, 10, 8]} />
                  <meshStandardMaterial color="#1c1410" roughness={0.3} />
                </mesh>
                <mesh position={[0.1, 0.05, z]} rotation={[0, 0, -0.25]}>
                  <boxGeometry args={[0.03, 0.01, 0.04]} />
                  <meshStandardMaterial color="#3b2a1e" roughness={1} />
                </mesh>
              </group>
            ))}
            {/* Laurel wreath */}
            <group position={[-0.005, 0.075, 0]}>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.122, 0.008, 8, 36]} />
                <meshStandardMaterial {...bronze} roughness={1} metalness={1} color="#e8c070" />
              </mesh>
              {leaves.map((l, i) => (
                <mesh key={i} position={[Math.cos(l.a) * 0.125, l.tilt * 0.012, Math.sin(l.a) * 0.125]} rotation={[0, -l.a, l.tilt]} scale={[1, 0.35, 0.6]} castShadow>
                  <sphereGeometry args={[0.03, 10, 8]} />
                  <meshStandardMaterial color="#6f8f3a" roughness={0.5} metalness={0.35} />
                </mesh>
              ))}
            </group>
          </group>

          {arm(1, { shoulder: rightShoulder, elbow: rightElbow }, 0.35, 0, 0, true)}
          {arm(-1, undefined, 0.92, 0.12, -0.3, false)}
        </group>
      </group>
    </group>
  );
}

// ---------- Forge, columns and floor ----------

function Surroundings({ low, flame }: { low: boolean; flame: React.MutableRefObject<number> }) {
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
      {/* Forge hearth */}
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

// ---------- Driver: hammer cycle, camera and impact effects ----------

function Director({ impact, anim, flame }: { impact: React.MutableRefObject<number>; anim: React.MutableRefObject<{ th: number; ph: number; lean: number }>; flame: React.MutableRefObject<number> }) {
  const { camera, size } = useThree();
  const flash = useRef<PointLight>(null);
  const last = useRef(0);
  const shake = useRef(0);

  useEffect(() => {
    const cam = camera as PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    const tan = Math.tan(MathUtils.degToRad(cam.fov / 2));
    // Fit the smith, anvil and the forge glow: about 3.4m wide and 2.2m tall.
    const dist = Math.max(2.05 / (2 * tan), 2.9 / (2 * tan * aspect));
    // On wide banners the title sits on the left, so the scene is pushed to the right.
    const lx = aspect > 2 ? -0.95 : aspect > 1.2 ? -0.6 : -0.3;
    cam.position.set(lx + dist * 0.28, 1.45, dist * 0.96);
    cam.lookAt(lx, 1.02, 0.05);
    cam.updateProjectionMatrix();
  }, [camera, size]);

  useFrame((_, dt) => {
    const t = performance.now() / 1000;
    const p = t % CYCLE;
    const e = MathUtils.smootherstep;
    let th: number;
    let ph: number;
    let lean: number;
    if (p < 0.95) {
      const k = e(p / 0.95, 0, 1);
      th = MathUtils.lerp(0.35, 2.0, k);
      ph = MathUtils.lerp(0, 0.6, k);
      lean = MathUtils.lerp(0, 0.13, k);
    } else if (p < STRIKE_AT) {
      const k = (p - 0.95) / (STRIKE_AT - 0.95);
      const q = k * k;
      th = MathUtils.lerp(2.0, 0.965, q);
      ph = MathUtils.lerp(0.6, 0.1, q);
      lean = MathUtils.lerp(0.13, -0.1, q);
    } else {
      const k = e((p - STRIKE_AT - 0.08) / (CYCLE - STRIKE_AT - 0.08), 0, 1);
      th = MathUtils.lerp(0.965, 0.35, k);
      ph = MathUtils.lerp(0.1, 0, k);
      lean = MathUtils.lerp(-0.1, 0, k);
    }
    anim.current.th = th;
    anim.current.ph = ph;
    anim.current.lean = lean;

    if (last.current < STRIKE_AT && p >= STRIKE_AT) {
      impact.current = 1 + Math.random() * 0.01; // changes every blow so the sparks restart
      shake.current = 1;
    }
    last.current = p;
    impact.current = Math.max(0.0001, impact.current > 1 ? impact.current : impact.current - dt * 2.4);
    if (impact.current > 1 && p > STRIKE_AT + 0.03) impact.current = 0.97;
    const glow = Math.min(1, impact.current);
    flame.current = glow * (impact.current > 0.5 ? 1 : impact.current * 2);
    shake.current = Math.max(0, shake.current - dt * 7);
    if (flash.current) flash.current.intensity = glow > 0.5 ? (glow - 0.5) * 22 : 0;
    camera.position.y = 1.45 + Math.sin(t * 60) * 0.006 * shake.current;
  });
  return <pointLight ref={flash} position={[HIT_X, ANVIL_TOP + 0.25, 0.4]} color="#ffb060" distance={3.4} decay={2} intensity={0} />;
}

function Ready({ onReady }: { onReady: () => void }) {
  useEffect(onReady, [onReady]);
  return null;
}

export default function ForgeScene({ low, active, onReady }: { low: boolean; active: boolean; onReady: () => void }) {
  const impact = useRef(0);
  const flame = useRef(0);
  const anim = useRef({ th: 0.35, ph: 0, lean: 0 });
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={low ? [1, 1.25] : [1, 1.75]}
      shadows={low ? false : { type: PCFShadowMap }}
      camera={{ fov: 30, near: 0.1, far: 40, position: [1, 1.5, 6] }}
      gl={{ antialias: !low, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = SRGBColorSpace;
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      <fog attach="fog" args={["#120d14", 7, 14]} />
      <Environment files="/3d/env.hdr" environmentIntensity={0.5} />
      <hemisphereLight args={["#c8d0ff", "#4a3020", 0.75]} />
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
        <Surroundings low={low} flame={flame} />
        <Anvil low={low} glow={flame} />
        <Smith low={low} anim={anim} />
        <Sparks impact={impact} />
        <Ready onReady={onReady} />
      </Suspense>
      <Director impact={impact} anim={anim} flame={flame} />
    </Canvas>
  );
}
