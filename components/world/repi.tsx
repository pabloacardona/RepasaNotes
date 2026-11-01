"use client";

import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  AnimationMixer,
  Box3,
  LoopOnce,
  LoopRepeat,
  Color,
  MathUtils,
  MeshPhysicalMaterial,
  SkinnedMesh,
  Vector3,
  type AnimationAction,
  type Group,
  type MeshStandardMaterial,
} from "three";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { Mood } from "@/lib/mood";
import type { MascotId } from "@/lib/mascots";
import { FadeIn, MoodFx, type Fx } from "./mood-fx";

// Repi can be any of the 21 Quaternius monsters (CC0). They share one rig layout but not the
// same clips: some have ten (Idle, Yes, No, Jump, Dance, HitRecieve...), others only an Idle or
// a Flying loop. So every reaction is two layers: a clip when the monster has one, and a
// procedural layer (hop, squash and stretch, lean, sway, shake) that works on all of them.
// Everything is damped, so there are no cuts between moods.

const HEIGHT = 1.0;
const MAX_WIDTH = 1.15;

// What each role plays, in order of preference. A role with no available clip falls back to Idle.
type Role = "idle" | "yes" | "jump" | "dance" | "no" | "hurt";
const ROLE_CLIPS: Record<Role, string[]> = {
  idle: ["Idle", "Flying"],
  yes: ["Yes", "Dance", "Jump"],
  jump: ["Jump", "Dance", "Yes"],
  dance: ["Dance", "Jump", "Yes"],
  no: ["No", "HitRecieve"],
  hurt: ["HitRecieve", "No"],
};

type Style = {
  role: Role;
  speed: number; // clip speed
  bob: number; // vertical float amplitude
  bobSpeed: number;
  tilt: number; // roll
  lean: number; // pitch, + forward
  tremble: number;
  size: number;
  fx: Fx[];
};

const BASE: Style = { role: "idle", speed: 1, bob: 0.012, bobSpeed: 2, tilt: 0, lean: 0, tremble: 0, size: 1, fx: [] };

const STYLES: Record<Mood, Partial<Style>> = {
  idle: {},
  curious: { tilt: 0.22, lean: -0.05, bob: 0.018 },
  thinking: { tilt: -0.16, lean: 0.1, speed: 0.8, fx: ["question"] },
  sleepy: { speed: 0.5, lean: 0.28, bob: 0.02, bobSpeed: 1, fx: ["zzz"] },
  happy: { role: "yes", bob: 0.03, bobSpeed: 4, fx: ["sparkles"] },
  excited: { role: "jump", bob: 0.04, bobSpeed: 6, fx: ["sparkles"] },
  onFire: { role: "jump", speed: 1.15, bob: 0.05, bobSpeed: 7, size: 1.06, fx: ["flame", "sparkles"] },
  comeback: { role: "dance", bob: 0.04, bobSpeed: 5, fx: ["sparkles", "exclaim"] },
  confident: { lean: -0.08, tilt: 0.1, size: 1.05 },
  oops: { tilt: 0.14, lean: 0.08, tremble: 0.003 },
  sad: { speed: 0.6, lean: 0.3, size: 0.96, bob: 0.008, bobSpeed: 1.2 },
  shocked: { role: "hurt", tremble: 0.012, size: 1.05, fx: ["exclaim"] },
  crying: { speed: 0.55, lean: 0.34, tremble: 0.006, bobSpeed: 9, bob: 0.01 },
  nervous: { speed: 1.5, tremble: 0.005, bobSpeed: 10, bob: 0.008 },
  determined: { speed: 1.2, lean: -0.12, size: 1.04 },
  celebrating: { role: "dance", speed: 1.2, bob: 0.05, bobSpeed: 6, fx: ["confetti", "sparkles"] },
  proud: { role: "yes", lean: -0.1, size: 1.05, fx: ["sparkles"] },
  relieved: { speed: 0.8, lean: 0.12, bobSpeed: 1.4 },
  heartbroken: { speed: 0.6, lean: 0.32, tilt: -0.08, size: 0.96, fx: ["cloud"] },
};

const LINES: Record<Mood, string[]> = {
  idle: ["¡Vamos a repasar!", "Estoy listo 📚"],
  curious: ["Mmm, ¿cuál será?", "¡Esta me gusta!"],
  thinking: ["Piénsalo con calma 🤔", "Lee otra vez la pregunta"],
  sleepy: ["Zzz… ¿sigues ahí?", "Me estoy durmiendo…"],
  happy: ["¡Eso es!", "¡Bien hecho! ✨", "¡Correcto!"],
  excited: ["¡Qué racha! 🔥", "¡No pares!"],
  onFire: ["¡ESTÁS ON FIRE! 🔥", "¡Imparable!"],
  comeback: ["¡Remontada! 😎", "¡Sabía que podías!"],
  confident: ["Esto es pan comido", "Dominas el tema 😏"],
  oops: ["Uy, casi…", "Lee la explicación 👀"],
  sad: ["Ánimo, tú puedes", "Vamos por la siguiente"],
  shocked: ["¡¿Qué?! 😱", "¡Se rompió la racha!"],
  crying: ["Buaaa 😭", "Necesitamos repasar…"],
  nervous: ["Respira hondo…", "Paso a paso"],
  determined: ["¡La próxima es nuestra! 💪", "¡A darle!"],
  celebrating: ["¡PERFECTO! 🏆", "¡Eres un genio!"],
  proud: ["¡Qué orgullo! 🌟", "¡Gran trabajo!"],
  relieved: ["Uf, ¡aprobado!", "Vamos mejorando"],
  heartbroken: ["Mañana será mejor 💔", "Repasemos juntos"],
};

export const mascotLine = (mood: Mood, pulse: number) => LINES[mood][(pulse + mood.length) % LINES[mood].length];

const FIDGET_MOODS = new Set<Mood>(["idle", "curious", "confident", "relieved"]);

type NumKey = "speed" | "bob" | "bobSpeed" | "tilt" | "lean" | "tremble" | "size";
const NUM: NumKey[] = ["speed", "bob", "bobSpeed", "tilt", "lean", "tremble", "size"];

type Rig = {
  model: Group;
  mixer: AnimationMixer;
  actions: Record<string, AnimationAction>;
  loop: AnimationAction | null;
  oneShot: AnimationAction | null;
  top: number;
};

const pick = (r: Rig, role: Role) => {
  for (const name of ROLE_CLIPS[role]) if (r.actions[name]) return r.actions[name];
  return r.actions.Idle ?? r.actions.Flying ?? Object.values(r.actions)[0] ?? null;
};
const hasRole = (r: Rig, role: Role) => ROLE_CLIPS[role].some((n) => r.actions[n]);

function playOnce(r: Rig | null, role: Role) {
  if (!r || !hasRole(r, role)) return;
  const a = pick(r, role);
  if (!a || a === r.loop) return;
  r.oneShot?.fadeOut(0.2);
  a.reset().setLoop(LoopOnce, 1);
  a.clampWhenFinished = true;
  a.fadeIn(0.2).play();
  r.loop?.fadeOut(0.2);
  r.oneShot = a;
}

export function Repi({
  mascot,
  mood,
  pulse,
  lastHit,
  streak,
  onFit,
}: {
  mascot: MascotId;
  mood: Mood;
  pulse: number;
  lastHit: boolean | null;
  streak: number;
  /** Reports the real size of the model (world units) once it is centred, so the camera can frame it. */
  onFit?: (d: { w: number; h: number }) => void;
}) {
  const { scene, animations } = useGLTF(`/3d/mascots/${mascot}.glb`);
  const holder = useRef<Group>(null); // hop and shake, in world
  const body = useRef<Group>(null); // lean, tilt, squash, from the feet
  const rig = useRef<Rig | null>(null);
  const style = useMemo<Style>(() => ({ ...BASE, ...STYLES[mood] }), [mood]);
  const styleRef = useRef(style);
  useEffect(() => {
    styleRef.current = style;
  }, [style]);
  const v = useRef<Record<NumKey, number>>(Object.fromEntries(NUM.map((k) => [k, BASE[k]])) as Record<NumKey, number>);
  // Pointer position over the whole window: the canvas lets clicks through, so its own pointer stays at 0.
  const mouse = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const move = (e: PointerEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);
  const m = useRef({ hopV: 0, hopY: 0, shake: 0, squash: 0, nod: 0, yaw: 0, fidgetAt: 8, appear: 0 });
  const onFitRef = useRef(onFit);
  useEffect(() => {
    onFitRef.current = onFit;
  }, [onFit]);

  // ---------- Build the rig once the model is loaded ----------
  useLayoutEffect(() => {
    const g = holder.current;
    const b = body.current;
    if (!g || !b) return;
    const model = cloneSkinned(scene) as Group;

    // The file carries internal scales (cm to m), so measure the skinned result, not the raw geometry.
    const settle = () => {
      g.updateMatrixWorld(true);
      model.traverse((o) => {
        if (o instanceof SkinnedMesh) o.skeleton.update();
      });
    };
    b.add(model);
    settle();
    const box = new Box3().setFromObject(model, true);
    const size = box.getSize(new Vector3());
    const gy = g.getWorldPosition(new Vector3()).y;
    const s = Math.min(HEIGHT / size.y, MAX_WIDTH / Math.max(size.x, size.z));
    model.scale.multiplyScalar(s);
    model.position.y = -(box.min.y - gy) * s;
    settle();
    // Smoother look: creased normals round off the low-poly facets, and a soft physical
    // material (sheen + a touch of clearcoat) with anisotropic, mip-mapped textures.
    const made: MeshPhysicalMaterial[] = [];
    model.traverse((o) => {
      if (!(o instanceof SkinnedMesh)) return;
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false;
      o.geometry = toCreasedNormals(o.geometry, 2.3);
      const old = o.material as MeshStandardMaterial;
      if (old.map) {
        old.map.anisotropy = 8;
        old.map.needsUpdate = true;
      }
      const mat = new MeshPhysicalMaterial({
        map: old.map,
        roughness: 0.72,
        metalness: 0,
        sheen: 0.3,
        sheenRoughness: 0.45,
        sheenColor: new Color("#9fb4ff"),
        clearcoat: 0,
        clearcoatRoughness: 0.4,
        envMapIntensity: 0.6,
      });
      made.push(mat);
      o.material = mat;
    });

    const mixer = new AnimationMixer(model);
    const actions: Record<string, AnimationAction> = {};
    for (const clip of animations) actions[clip.name.split("|").pop()!] = mixer.clipAction(clip);

    const r: Rig = { model, mixer, actions, loop: null, oneShot: null, top: size.y * s };
    rig.current = r;

    const first = pick(r, styleRef.current.role);
    if (first) {
      // Measure the model in its idle pose (not the bind pose) so it is truly centred and fully inside the frame.
      first.setLoop(LoopRepeat, Infinity).reset().play();
      mixer.update(0.2);
      settle();
      const pose = new Box3().setFromObject(model, true);
      const ps = pose.getSize(new Vector3());
      model.scale.multiplyScalar(Math.min(HEIGHT / ps.y, MAX_WIDTH / Math.max(ps.x, ps.z)));
      settle();
      const fit = new Box3().setFromObject(model, true);
      const c = fit.getCenter(new Vector3());
      const gw = g.getWorldPosition(new Vector3());
      model.position.x -= c.x - gw.x;
      model.position.z -= c.z - gw.z;
      model.position.y -= fit.min.y - gw.y;
      settle();
      const dims = fit.getSize(new Vector3());
      r.top = dims.y;
      onFitRef.current?.({ w: dims.x, h: dims.y });
      first.reset().fadeIn(0.4).play();
      r.loop = first;
    }

    const onFinished = (e: { action: AnimationAction }) => {
      if (e.action !== r.oneShot) return;
      r.oneShot.fadeOut(0.3);
      r.oneShot = null;
      r.loop?.reset().fadeIn(0.3).play();
    };
    mixer.addEventListener("finished", onFinished);

    return () => {
      mixer.removeEventListener("finished", onFinished);
      mixer.stopAllAction();
      b.remove(model);
      made.forEach((mt) => mt.dispose());
      rig.current = null;
    };
  }, [scene, animations]);

  // Mood -> looping clip, cross-faded.
  useEffect(() => {
    const r = rig.current;
    if (!r) return;
    const next = pick(r, style.role);
    if (!next || next === r.loop) return;
    next.setLoop(LoopRepeat, Infinity);
    if (!r.oneShot) next.reset().fadeIn(0.4).play();
    r.loop?.fadeOut(0.4);
    r.loop = next;
  }, [style.role, scene]);

  // One-shot reaction to every answer: a clip if there is one, always the procedural layer.
  useEffect(() => {
    if (!pulse) return;
    const st = m.current;
    if (lastHit) {
      st.hopV = streak >= 3 ? 3 : 2.4;
      st.squash = -0.5; // crouch first, the landing then stretches back
      playOnce(rig.current, streak >= 3 ? "jump" : pulse % 2 ? "yes" : "jump");
    } else {
      st.shake = 1;
      st.nod = 1;
      playOnce(rig.current, pulse % 2 ? "hurt" : "no");
    }
  }, [pulse, lastHit, streak]);

  useFrame((state, dt) => {
    const r = rig.current;
    const g = holder.current;
    const b = body.current;
    if (!r || !g || !b) return;
    const d = Math.min(dt, 0.05);
    const t = state.clock.elapsedTime;
    const cur = v.current;
    const want = styleRef.current;
    for (const k of NUM) cur[k] = MathUtils.damp(cur[k], want[k], 5, d);
    const s = m.current;

    r.mixer.timeScale = cur.speed;
    r.mixer.update(d);

    // Idle personality: an occasional gesture.
    if (t > s.fidgetAt) {
      if (FIDGET_MOODS.has(mood) && !r.oneShot) playOnce(r, Math.random() < 0.5 ? "yes" : "jump");
      s.fidgetAt = t + 7 + Math.random() * 6;
    }

    // Hop with gravity; landing stretches the body, then it settles back.
    const wasAir = s.hopY > 0;
    s.hopV -= 9.8 * d;
    s.hopY = Math.max(0, s.hopY + s.hopV * d);
    if (s.hopY === 0) {
      if (wasAir && s.hopV < -1) s.squash = 0.55;
      s.hopV = 0;
    }
    s.squash = MathUtils.damp(s.squash, 0, 9, d);
    s.shake = MathUtils.damp(s.shake, 0, 3.5, d);
    s.nod = MathUtils.damp(s.nod, 0, 4, d);

    const bob = Math.sin(t * cur.bobSpeed) * cur.bob;
    const tremble = (Math.sin(t * 47) + Math.sin(t * 31)) * 0.5 * (cur.tremble + s.shake * 0.015);
    g.position.set(tremble, s.hopY + bob + cur.bob, 0);
    // Soft entrance: grows in instead of popping.
    s.appear = MathUtils.damp(s.appear, 1, 5, d);
    g.scale.setScalar(0.55 + 0.45 * s.appear);

    // Head follows the pointer, plus mood tilt and a head shake after a miss.
    s.yaw = MathUtils.damp(s.yaw, mouse.current.x * 0.45, 4, d);
    b.rotation.y = s.yaw + Math.sin(t * 22) * s.shake * 0.28;
    b.rotation.z = cur.tilt + Math.sin(t * 1.3) * 0.025;
    b.rotation.x = cur.lean + s.nod * Math.sin(t * 9) * 0.12 - mouse.current.y * 0.06;

    // Breathing, plus squash and stretch (volume kept: more height = less width).
    const breathe = 1 + Math.sin(t * 2.1) * 0.012;
    const sy = (1 + s.squash * 0.2) * breathe * cur.size;
    const sxz = (1 - s.squash * 0.12) * cur.size;
    b.scale.set(sxz, sy, sxz);
  });

  return (
    <group>
      <group ref={holder}>
        <group ref={body} />
      </group>

      <FadeIn on>
        <MoodFx fx={style.fx} />
      </FadeIn>
    </group>
  );
}
