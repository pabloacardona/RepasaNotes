"use client";

import { useFrame } from "@react-three/fiber";
import { Html, useGLTF } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  AnimationMixer,
  Box3,
  DoubleSide,
  ExtrudeGeometry,
  LoopOnce,
  LoopRepeat,
  MathUtils,
  Matrix3,
  Matrix4,
  Shape,
  SkinnedMesh,
  Vector3,
  type AnimationAction,
  type Bone,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
  type WebGLProgramParametersWithUniforms,
} from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { Mood } from "@/lib/mood";
import { FadeIn, MoodFx, type Fx } from "./mood-fx";

// Repi: Quaternius "Rabbit with pigtails" (CC0), rigged with 30 animations.
// On top of the rig we add: mood-driven clips and one-shot reactions, an expressive face
// (eye squash in the shader, overlay eyes, brows, mouth, blush, tears), spring physics on the
// pigtails, head tracking towards the pointer, idle fidgets and a speech bubble.

const MODEL = "/3d/models/repi.glb";
const HEIGHT = 1.05;
const INK = "#1b2433";

type EyeKind = "open" | "happy" | "closed" | "star";
type Face = {
  eye: EyeKind;
  lid: number; // eye height: 0.45 squint, 1 normal, 1.3 wide
  size: number; // eye scale
  brow: number; // + angry, - worried
  browY: number;
  curve: number; // mouth -1 frown .. 1 smile
  open: number; // mouth open 0..1
  width: number;
  blush: number;
  tears: 0 | 1 | 2;
  sweat: boolean;
  clip: string;
  speed: number;
  tilt: number; // head roll
  nod: number; // head pitch (+ down)
  tremble: number;
  fx: Fx[];
};

const BASE: Face = {
  eye: "open", lid: 1, size: 1, brow: 0, browY: 0, curve: 0.5, open: 0, width: 1, blush: 0.35, tears: 0, sweat: false,
  clip: "Idle", speed: 1, tilt: 0, nod: 0, tremble: 0, fx: [],
};

const FACES: Record<Mood, Partial<Face>> = {
  idle: {},
  curious: { lid: 1.15, size: 1.08, brow: -0.15, browY: 0.01, curve: 0.25, open: 0.2, width: 0.6, tilt: 0.25 },
  thinking: { lid: 0.8, brow: 0.15, curve: 0.05, width: 0.6, tilt: -0.18, nod: -0.15, clip: "Idle_Holding", fx: ["question"] },
  sleepy: { eye: "closed", curve: 0.1, open: 0.15, width: 0.5, clip: "Sitting_Idle", speed: 0.7, nod: 0.25, fx: ["zzz"] },
  happy: { eye: "happy", curve: 0.95, open: 0.4, blush: 0.75, clip: "Yes", fx: ["sparkles"] },
  excited: { lid: 1.3, size: 1.15, brow: -0.1, browY: 0.015, curve: 1, open: 0.75, blush: 0.9, clip: "Jump", fx: ["sparkles"] },
  onFire: { eye: "star", curve: 1, open: 0.85, blush: 1, clip: "Jump", speed: 1.15, fx: ["flame", "sparkles"] },
  comeback: { eye: "happy", curve: 1, open: 0.65, blush: 0.9, clip: "Wave", fx: ["sparkles", "exclaim"] },
  confident: { lid: 0.72, brow: 0.18, curve: 0.75, width: 1.1, tilt: 0.12, blush: 0.45, clip: "Idle" },
  oops: { lid: 1.12, brow: -0.35, browY: 0.01, curve: -0.25, open: 0.15, width: 0.7, blush: 0.6, sweat: true, tremble: 0.004 },
  sad: { lid: 0.8, size: 1.1, brow: -0.45, curve: -0.7, width: 0.8, nod: 0.3, speed: 0.6, tears: 1 },
  shocked: { lid: 1.4, size: 0.8, brow: -0.25, browY: 0.02, curve: 0, open: 1, width: 0.55, clip: "Duck", tremble: 0.012, fx: ["exclaim"] },
  crying: { eye: "closed", brow: -0.55, curve: -0.9, open: 0.6, width: 0.9, clip: "Sitting_Idle", tremble: 0.006, tears: 2 },
  nervous: { lid: 1.05, size: 0.85, brow: -0.38, curve: -0.15, width: 0.75, blush: 0.5, speed: 1.6, tremble: 0.005, sweat: true },
  determined: { lid: 0.68, brow: 0.42, curve: 0.05, width: 0.8, clip: "Punch", nod: -0.08 },
  celebrating: { eye: "happy", curve: 1, open: 0.9, blush: 1, clip: "Wave", speed: 1.2, fx: ["confetti", "sparkles"] },
  proud: { eye: "happy", curve: 0.8, blush: 0.65, clip: "Yes", nod: -0.1, fx: ["sparkles"] },
  relieved: { eye: "happy", brow: -0.12, curve: 0.5, blush: 0.4, speed: 0.8, sweat: true },
  heartbroken: { lid: 0.72, size: 1.1, brow: -0.55, curve: -0.9, width: 0.85, clip: "Sitting_Idle", nod: 0.3, tears: 1, fx: ["cloud"] },
};

const LINES: Record<Mood, string[]> = {
  idle: ["¡Vamos a repasar!", "Estoy lista 📚"],
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

const HIT_CLIPS = ["Yes", "Jump"];
const MISS_CLIPS = ["HitReact", "No"];
const FIDGETS = ["Wave", "Yes", "Jump_Idle"];
const FIDGET_MOODS = new Set<Mood>(["idle", "curious", "confident", "relieved"]);

type NumKey = Exclude<keyof Face, "eye" | "clip" | "fx" | "sweat" | "tears">;
const NUM: NumKey[] = ["lid", "size", "brow", "browY", "curve", "open", "width", "blush", "speed", "tilt", "nod", "tremble"];

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

type Spring = { p: Vector3; v: Vector3; tipLocal: Vector3; init: boolean };
type Rig = {
  model: Group;
  mixer: AnimationMixer;
  actions: Record<string, AnimationAction>;
  loop: AnimationAction | null;
  oneShot: AnimationAction | null;
  head: Bone;
  headRest: { x: number; y: number; z: number };
  faceLocal: Matrix4; // mid-eyes frame, in head-bone space
  eyeHalf: number; // half distance between eyes (world units)
  eyeSize: number;
  eyeUniforms: { uSquash: { value: number }; uScale: { value: number } };
  hair: SkinnedMesh;
  hairBoneIndex: number;
  hairUniforms: { uOffL: { value: Vector3 }; uOffR: { value: Vector3 } };
  springs: [Spring, Spring];
  materials: MeshStandardMaterial[];
};

function playOnce(r: Rig | null, name: string) {
  const a = r?.actions[name];
  if (!r || !a) return;
  r.oneShot?.fadeOut(0.15);
  a.reset().setLoop(LoopOnce, 1);
  a.clampWhenFinished = true;
  a.fadeIn(0.15).play();
  r.loop?.fadeOut(0.15);
  r.oneShot = a;
}

const tmp = { m: new Matrix4(), m2: new Matrix4(), m3: new Matrix3(), v: new Vector3(), target: new Vector3(), off: new Vector3() };

export function Repi({
  mood,
  pulse,
  lastHit,
  streak,
  windRef,
}: {
  mood: Mood;
  pulse: number;
  lastHit: boolean | null;
  streak: number;
  windRef?: React.RefObject<number>;
}) {
  const { scene, animations } = useGLTF(MODEL, false, true);
  const holder = useRef<Group>(null);
  const overlay = useRef<Group>(null);
  const rig = useRef<Rig | null>(null);
  const face = useMemo<Face>(() => ({ ...BASE, ...FACES[mood] }), [mood]);
  const p = useRef<Record<NumKey, number>>(Object.fromEntries(NUM.map((k) => [k, BASE[k]])) as Record<NumKey, number>);
  const eyeMix = useRef({ open: 1, happy: 0, closed: 0, star: 0 });
  const motion = useRef({ hopV: 0, hopY: 0, shake: 0, blinkAt: 2, blink: 0, fidgetAt: 8, yaw: 0, pitch: 0 });
  const parts = useRef<{
    eyes: (Group | null)[];
    happy: (Mesh | null)[];
    closed: (Mesh | null)[];
    star: (Mesh | null)[];
    brows: (Mesh | null)[];
    mouthLine: Mesh | null;
    mouthOpen: Group | null;
    unit: Group | null;
    sides: (Group | null)[];
    cheeks: (Mesh | null)[];
    tears: (Mesh | null)[];
    sweat: Mesh | null;
  }>({ eyes: [], happy: [], closed: [], star: [], brows: [], mouthLine: null, mouthOpen: null, unit: null, sides: [], cheeks: [], tears: [], sweat: null });

  const starGeo = useMemo(() => new ExtrudeGeometry(starShape(0.05, 0.022), { depth: 0.012, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2 }), []);
  useEffect(() => () => starGeo.dispose(), [starGeo]);

  // ---------- Build the rig once the model is loaded ----------
  useLayoutEffect(() => {
    const g = holder.current;
    if (!g) return;
    const model = cloneSkinned(scene) as Group;

    // The file carries internal scales (x100 armature, x140 meshes), so measure the
    // skinned result, not the raw geometry: update bones first, then a precise box.
    const settle = () => {
      g.updateMatrixWorld(true);
      model.traverse((o) => {
        if (o instanceof SkinnedMesh) o.skeleton.update();
      });
    };
    g.add(model);
    settle();
    const box = new Box3().setFromObject(model, true);
    const gy = g.getWorldPosition(new Vector3()).y;
    const s = HEIGHT / (box.max.y - box.min.y);
    model.scale.multiplyScalar(s);
    model.position.y = -(box.min.y - gy) * s;
    settle();

    const materials: MeshStandardMaterial[] = [];
    let eyes: SkinnedMesh | undefined;
    let hair: SkinnedMesh | undefined;
    model.traverse((o) => {
      if (o instanceof SkinnedMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false;
        if (o.name === "Eyes") eyes = o;
        if (o.name === "Hair") hair = o;
      }
    });
    if (!eyes || !hair) return;
    const head = hair.skeleton.bones.find((b) => b.name === "Head")!;
    const hairBoneIndex = hair.skeleton.bones.indexOf(head);

    // Rest transform from a head-weighted mesh's bind space to world (what skinning does).
    const restMatrix = (mesh: SkinnedMesh) => {
      const bi = mesh.skeleton.bones.findIndex((b) => b.name === "Head");
      return new Matrix4()
        .copy(mesh.matrixWorld)
        .multiply(mesh.bindMatrixInverse)
        .multiply(mesh.skeleton.bones[bi].matrixWorld)
        .multiply(mesh.skeleton.boneInverses[bi])
        .multiply(mesh.bindMatrix);
    };
    const eyesM = restMatrix(eyes);
    const hairM = restMatrix(hair);
    // World axes expressed in a mesh's bind space.
    const toMesh = (M: Matrix4, dir: Vector3) => dir.clone().applyMatrix3(new Matrix3().setFromMatrix4(M.clone().invert())).normalize();

    // ----- Eyes: centres per eye, squash/scale in the vertex shader -----
    const ep = eyes.geometry.getAttribute("position");
    const sideE = toMesh(eyesM, new Vector3(1, 0, 0));
    const upE = toMesh(eyesM, new Vector3(0, 1, 0));
    const all = new Vector3();
    for (let i = 0; i < ep.count; i++) all.add(tmp.v.fromBufferAttribute(ep, i));
    all.divideScalar(ep.count);
    const sum = [new Vector3(), new Vector3()];
    const cnt = [0, 0];
    let ext = 0;
    for (let i = 0; i < ep.count; i++) {
      tmp.v.fromBufferAttribute(ep, i);
      const k = tmp.v.clone().sub(all).dot(sideE) < 0 ? 0 : 1;
      sum[k].add(tmp.v);
      cnt[k] += 1;
    }
    const cL = sum[0].divideScalar(cnt[0]);
    const cR = sum[1].divideScalar(cnt[1]);
    for (let i = 0; i < ep.count; i++) {
      tmp.v.fromBufferAttribute(ep, i);
      const c = tmp.v.clone().sub(all).dot(sideE) < 0 ? cL : cR;
      ext = Math.max(ext, Math.abs(tmp.v.clone().sub(c).dot(upE)));
    }
    const eyeUniforms = { uSquash: { value: 1 }, uScale: { value: 1 } };
    const eyeMat = (eyes.material as MeshStandardMaterial).clone();
    eyeMat.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
      Object.assign(shader.uniforms, eyeUniforms, { uEyeL: { value: cL }, uEyeR: { value: cR }, uUpE: { value: upE }, uSideE: { value: sideE }, uMid: { value: all } });
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nuniform vec3 uEyeL; uniform vec3 uEyeR; uniform vec3 uUpE; uniform vec3 uSideE; uniform vec3 uMid; uniform float uSquash; uniform float uScale;")
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          {
            vec3 c = dot(transformed - uMid, uSideE) < 0.0 ? uEyeL : uEyeR;
            vec3 d = transformed - c;
            d -= uUpE * dot(d, uUpE) * (1.0 - uSquash);
            transformed = c + d * uScale;
          }`,
        );
    };
    eyeMat.customProgramCacheKey = () => "repi-eyes";
    eyes.material = eyeMat;
    materials.push(eyeMat);

    // Face frame: mid-eyes, world-aligned axes at rest, expressed in head-bone space.
    const midWorld = all.clone().applyMatrix4(eyesM);
    const lw = cL.clone().applyMatrix4(eyesM);
    const rw = cR.clone().applyMatrix4(eyesM);
    const eyeHalf = lw.distanceTo(rw) / 2;
    const eyeSize = ext * 2 * new Vector3().setFromMatrixScale(eyesM).x;
    const faceLocal = new Matrix4().copy(head.matrixWorld).invert().multiply(new Matrix4().makeTranslation(midWorld.x, midWorld.y, midWorld.z));

    // ----- Hair: two pigtail springs, displacement in the vertex shader -----
    const hp = hair.geometry.getAttribute("position");
    const sideH = toMesh(hairM, new Vector3(1, 0, 0));
    const hc = new Vector3();
    for (let i = 0; i < hp.count; i++) hc.add(tmp.v.fromBufferAttribute(hp, i));
    hc.divideScalar(hp.count);
    let maxD = 0;
    let tipL = new Vector3();
    let tipR = new Vector3();
    let minD = 0;
    for (let i = 0; i < hp.count; i++) {
      tmp.v.fromBufferAttribute(hp, i);
      const d = tmp.v.clone().sub(hc).dot(sideH);
      if (d > maxD) {
        maxD = d;
        tipR = tmp.v.clone();
      }
      if (d < minD) {
        minD = d;
        tipL = tmp.v.clone();
      }
    }
    const reach = Math.max(maxD, -minD);
    const hairUniforms = { uOffL: { value: new Vector3() }, uOffR: { value: new Vector3() } };
    const hairMat = (hair.material as MeshStandardMaterial).clone();
    hairMat.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
      Object.assign(shader.uniforms, hairUniforms, { uHC: { value: hc }, uSideH: { value: sideH }, uReach: { value: reach } });
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nuniform vec3 uOffL; uniform vec3 uOffR; uniform vec3 uHC; uniform vec3 uSideH; uniform float uReach;")
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          {
            float d = dot(transformed - uHC, uSideH);
            // Pigtails only: weight grows from their root to the tip.
            float w = smoothstep(uReach * 0.35, uReach, abs(d));
            transformed += (d < 0.0 ? uOffL : uOffR) * w * w;
          }`,
        );
    };
    hairMat.customProgramCacheKey = () => "repi-hair";
    hair.material = hairMat;
    materials.push(hairMat);
    const inHead = (v: Vector3) => head.worldToLocal(v.clone().applyMatrix4(hairM));
    const springs: [Spring, Spring] = [
      { p: new Vector3(), v: new Vector3(), tipLocal: inHead(tipL), init: false },
      { p: new Vector3(), v: new Vector3(), tipLocal: inHead(tipR), init: false },
    ];

    // ----- Animations -----
    const mixer = new AnimationMixer(model);
    const actions: Record<string, AnimationAction> = {};
    for (const clip of animations) actions[clip.name.split("|").pop()!] = mixer.clipAction(clip);

    rig.current = {
      model, mixer, actions, loop: null, oneShot: null, head,
      headRest: { x: head.rotation.x, y: head.rotation.y, z: head.rotation.z },
      faceLocal, eyeHalf, eyeSize, eyeUniforms, hair, hairBoneIndex, hairUniforms, springs, materials,
    };

    const onFinished = (e: { action: AnimationAction }) => {
      const r = rig.current;
      if (!r || e.action !== r.oneShot) return;
      r.oneShot.fadeOut(0.25);
      r.oneShot = null;
      r.loop?.reset().fadeIn(0.25).play();
    };
    mixer.addEventListener("finished", onFinished);

    return () => {
      mixer.removeEventListener("finished", onFinished);
      mixer.stopAllAction();
      g.remove(model);
      materials.forEach((m) => m.dispose());
      rig.current = null;
    };
  }, [scene, animations]);

  // Mood → looping clip, cross-faded.
  useEffect(() => {
    const r = rig.current;
    if (!r) return;
    const next = r.actions[face.clip] ?? r.actions.Idle;
    if (next === r.loop) return;
    next.setLoop(LoopRepeat, Infinity);
    if (!r.oneShot) next.reset().fadeIn(0.35).play();
    r.loop?.fadeOut(0.35);
    r.loop = next;
  }, [face.clip]);

  // One-shot reaction to every answer.
  useEffect(() => {
    if (!pulse) return;
    if (lastHit) {
      motion.current.hopV = 2.4;
      playOnce(rig.current, streak >= 3 ? "Jump" : HIT_CLIPS[pulse % HIT_CLIPS.length]);
    } else {
      motion.current.shake = 1;
      playOnce(rig.current, MISS_CLIPS[pulse % MISS_CLIPS.length]);
    }
  }, [pulse, lastHit, streak]);

  useFrame((state, dt) => {
    const r = rig.current;
    if (!r) return;
    const d = Math.min(dt, 0.05);
    const t = state.clock.elapsedTime;
    const v = p.current;
    for (const k of NUM) v[k] = MathUtils.damp(v[k], face[k], 6, d);
    const em = eyeMix.current;
    for (const k of ["open", "happy", "closed", "star"] as const) em[k] = MathUtils.damp(em[k], face.eye === k ? 1 : 0, 10, d);
    const m = motion.current;

    // Animation
    r.mixer.timeScale = v.speed;
    r.mixer.update(d);

    // Idle personality: an occasional gesture.
    if (t > m.fidgetAt) {
      if (FIDGET_MOODS.has(mood) && !r.oneShot) playOnce(r, FIDGETS[Math.floor(Math.random() * FIDGETS.length)]);
      m.fidgetAt = t + 7 + Math.random() * 6;
    }

    // Head: track the pointer, plus mood tilt and nod (added on top of the clip).
    m.yaw = MathUtils.damp(m.yaw, state.pointer.x * 0.5, 4, d);
    m.pitch = MathUtils.damp(m.pitch, -state.pointer.y * 0.25, 4, d);
    r.head.rotation.y += m.yaw;
    r.head.rotation.x += m.pitch + v.nod;
    r.head.rotation.z += v.tilt + Math.sin(t * 1.3) * 0.03;

    // Hop impulse, shakes and nervous tremble on the whole body.
    m.hopV -= 9.8 * d;
    m.hopY = Math.max(0, m.hopY + m.hopV * d);
    if (m.hopY === 0) m.hopV = 0;
    m.shake = MathUtils.damp(m.shake, 0, 4, d);
    const tremble = (Math.sin(t * 47) + Math.sin(t * 31)) * 0.5 * (v.tremble + m.shake * 0.02);
    r.model.position.x = tremble;
    holder.current!.position.y = m.hopY;
    r.model.updateMatrixWorld(true);

    // Blink every few seconds.
    if (t > m.blinkAt) {
      m.blink = 1;
      m.blinkAt = t + 2.2 + Math.random() * 3;
    }
    m.blink = MathUtils.damp(m.blink, 0, 18, d);
    r.eyeUniforms.uSquash.value = Math.max(0.04, v.lid * (1 - m.blink * 0.95) * em.open + 0.001);
    r.eyeUniforms.uScale.value = Math.max(0.001, v.size * em.open);

    // Pigtail springs: the tip lags behind the head, overshoots and settles.
    const wind = windRef?.current ?? 0;
    tmp.m.copy(r.hair.matrixWorld).multiply(r.hair.bindMatrixInverse).multiply(r.head.matrixWorld).multiply(r.hair.skeleton.boneInverses[r.hairBoneIndex]).multiply(r.hair.bindMatrix);
    tmp.m3.setFromMatrix4(tmp.m2.copy(tmp.m).invert());
    r.springs.forEach((sp, i) => {
      tmp.target.copy(sp.tipLocal);
      r.head.localToWorld(tmp.target);
      if (!sp.init) {
        sp.p.copy(tmp.target);
        sp.init = true;
      }
      // Soft, bouncy pigtails: low stiffness, light damping.
      const k = 90;
      const c = 5;
      tmp.v.subVectors(tmp.target, sp.p).multiplyScalar(k).addScaledVector(sp.v, -c);
      tmp.v.x += Math.sin(t * 2.1 + i) * wind * 6 + 1.2 * Math.sin(t * 0.9 + i * 2);
      tmp.v.z += Math.cos(t * 1.7 + i) * wind * 4;
      sp.v.addScaledVector(tmp.v, d);
      sp.p.addScaledVector(sp.v, d);
      tmp.off.subVectors(sp.p, tmp.target).clampLength(0, 0.22);
      const out = i === 0 ? r.hairUniforms.uOffL.value : r.hairUniforms.uOffR.value;
      out.copy(tmp.off).applyMatrix3(tmp.m3);
    });

    // Face overlay follows the head bone.
    const o = overlay.current;
    if (o && holder.current) {
      o.matrix.copy(holder.current.matrixWorld).invert().multiply(tmp.m.copy(r.head.matrixWorld).multiply(r.faceLocal));
      o.matrixWorldNeedsUpdate = true;
    }

    // Overlay parts
    const pr = parts.current;
    pr.happy.forEach((e) => e?.scale.setScalar(Math.max(em.happy, 0.001)));
    pr.closed.forEach((e) => e?.scale.setScalar(Math.max(em.closed, 0.001)));
    pr.star.forEach((e, i) => {
      if (!e) return;
      e.scale.setScalar(Math.max(em.star * (1 + Math.sin(t * 8) * 0.12), 0.001));
      e.rotation.z = t * 2 * (i ? -1 : 1);
    });
    const half = r.eyeHalf / r.eyeSize;
    pr.unit?.scale.setScalar(r.eyeSize);
    pr.sides.forEach((g, i) => g?.position.setX((i === 0 ? -1 : 1) * half));
    pr.cheeks.forEach((c, i) => c?.position.setX((i === 0 ? -1 : 1) * half * 1.3));
    pr.sweat?.position.setX(half * 2.2);
    pr.brows.forEach((b, i) => {
      if (!b) return;
      const side = i === 0 ? -1 : 1;
      b.rotation.z = Math.PI / 2 + v.brow * side;
      b.position.y = 0.95 + v.browY / r.eyeSize;
    });
    if (pr.mouthLine) {
      const curve = v.curve * (1 - v.open);
      pr.mouthLine.scale.set(v.width, curve >= 0 ? Math.max(curve, 0.08) : Math.min(curve, -0.08), 1);
      pr.mouthLine.visible = v.open < 0.85;
    }
    if (pr.mouthOpen) pr.mouthOpen.scale.set(v.width * (0.7 + 0.3 * v.open), Math.max(v.open, 0.001), 1);
    pr.cheeks.forEach((c) => {
      if (c) (c.material as MeshBasicMaterial).opacity = v.blush * 0.7;
    });
    pr.tears.forEach((tr, i) => {
      if (!tr) return;
      const side = i % 2 ? 1 : -1;
      const on = face.tears === 2 || (face.tears === 1 && side === 1);
      const k = (t * (face.tears === 2 ? 1.4 : 0.7) + i * 0.37) % 1;
      tr.visible = on;
      tr.position.set(side * (half + 0.2 * k), -0.6 - (k * 0.14) / r.eyeSize, 0.4);
      tr.scale.setScalar(0.6 + Math.sin(k * Math.PI) * 0.6);
    });
    if (pr.sweat) pr.sweat.visible = face.sweat;
  });

  const line = LINES[mood][(pulse + mood.length) % LINES[mood].length];

  return (
    <group>
      <group ref={holder} />
      {/* Face overlay: positioned every frame from the head bone. */}
      <group ref={overlay} matrixAutoUpdate={false}>
        {/* Drawn in eye units (eye height = 1); scaled to the real eye size every frame. */}
        <group ref={(el) => { parts.current.unit = el; }}>
          {[-1, 1].map((side, i) => (
            <group key={side} ref={(el) => { parts.current.sides[i] = el; }} position={[0, 0, 0.55]}>
              <mesh ref={(el) => { parts.current.happy[i] = el; }} position={[0, -0.15, 0]}>
                <torusGeometry args={[0.55, 0.13, 8, 24, Math.PI]} />
                <meshStandardMaterial color={INK} roughness={0.4} />
              </mesh>
              <mesh ref={(el) => { parts.current.closed[i] = el; }} position={[0, 0.15, 0]} rotation={[0, 0, Math.PI]}>
                <torusGeometry args={[0.5, 0.12, 8, 24, Math.PI]} />
                <meshStandardMaterial color={INK} roughness={0.4} />
              </mesh>
              <mesh ref={(el) => { parts.current.star[i] = el; }} geometry={starGeo} scale={20}>
                <meshStandardMaterial color="#ffb703" emissive="#ff8a00" emissiveIntensity={1.4} />
              </mesh>
              <mesh ref={(el) => { parts.current.brows[i] = el; }} position={[0, 0.95, -0.15]}>
                <capsuleGeometry args={[0.09, 0.75, 4, 8]} />
                <meshStandardMaterial color={INK} roughness={0.5} />
              </mesh>
            </group>
          ))}
          {/* Cheeks */}
          {[-1, 1].map((side, i) => (
            <mesh key={side} ref={(el) => { parts.current.cheeks[i] = el; }} position={[0, -0.75, 0.35]}>
              <circleGeometry args={[0.55, 24]} />
              <meshBasicMaterial color="#ff6f91" transparent opacity={0.3} depthWrite={false} />
            </mesh>
          ))}
          {/* Mouth: smile/frown line, open mouth */}
          <group position={[0, -1.35, 1.05]}>
            <mesh ref={(el) => { parts.current.mouthLine = el; }} rotation={[0, 0, Math.PI]}>
              <torusGeometry args={[0.55, 0.1, 8, 28, Math.PI]} />
              <meshStandardMaterial color={INK} roughness={0.4} />
            </mesh>
            <group ref={(el) => { parts.current.mouthOpen = el; }}>
              <mesh scale={[0.6, 0.55, 1]}>
                <circleGeometry args={[1, 28]} />
                <meshStandardMaterial color="#5b1a1a" side={DoubleSide} />
              </mesh>
              <mesh position={[0, -0.25, 0.01]} scale={[0.35, 0.2, 1]}>
                <circleGeometry args={[1, 20]} />
                <meshStandardMaterial color="#ef7d8a" side={DoubleSide} />
              </mesh>
            </group>
          </group>
          {/* Tears and sweat */}
          {Array.from({ length: 6 }, (_, i) => (
            <mesh key={i} ref={(el) => { parts.current.tears[i] = el; }} visible={false}>
              <sphereGeometry args={[0.22, 12, 10]} />
              <meshPhysicalMaterial color="#8fd3ff" roughness={0} transmission={0.6} thickness={0.05} />
            </mesh>
          ))}
          <mesh ref={(el) => { parts.current.sweat = el; }} position={[0, 1.6, -0.1]} scale={[1, 1.4, 1]} visible={false}>
            <sphereGeometry args={[0.3, 14, 10]} />
            <meshPhysicalMaterial color="#8fd3ff" roughness={0} transmission={0.5} thickness={0.05} />
          </mesh>

          {/* Speech bubble: re-keyed on every mood or answer so the CSS animation replays. */}
          <Html position={[0, 3.4, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
            <div key={`${mood}-${pulse}`} className="repi-bubble">
              {line}
            </div>
          </Html>
        </group>
      </group>

      <FadeIn on>
        <MoodFx fx={face.fx} />
      </FadeIn>
    </group>
  );
}

useGLTF.preload(MODEL, false, true);
