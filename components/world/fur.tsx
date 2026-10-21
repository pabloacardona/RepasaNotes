"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Color,
  InstancedBufferAttribute,
  InstancedMesh,
  MeshPhysicalMaterial,
  Object3D,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type WebGLProgramParametersWithUniforms,
} from "three";

// Shell-texture fur: the mesh is drawn N times, each shell pushed a bit further along the
// normal. A 3D cell pattern decides where strands are; each strand thins towards the tip.
// The shells bend with gravity, wind and a spring that lags behind the body's motion,
// so the hair swings when the mascot hops, shakes or spins.

export type FurRegions = "head" | "uniform";

type Props = {
  geometry: BufferGeometry;
  shells?: number;
  length: number; // max strand length (scene units)
  density: number; // strands per unit along each axis
  color: string;
  rootColor: string;
  tipColor: string;
  regions?: FurRegions;
  windRef?: React.RefObject<number>;
};

const up = new Vector3(0, -1, 0);
// Per-frame scratch objects (frames run one at a time).
const tmp = { p: new Vector3(), q: new Quaternion(), d: new Vector3(), target: new Vector3() };

export function Fur({ geometry, shells = 36, length, density, color, rootColor, tipColor, regions = "uniform", windRef }: Props) {
  const mesh = useRef<InstancedMesh>(null);
  const physics = useRef({ prev: new Vector3(), vel: new Vector3(), dyn: new Vector3(), dynVel: new Vector3(), init: false });
  const material = useMemo(() => {
    const uniforms = {
      uLen: { value: length },
      uDensity: { value: density },
      uGravity: { value: new Vector3(0, -1, 0) },
      uDyn: { value: new Vector3() },
      uTime: { value: 0 },
      uWind: { value: 0 },
      uRoot: { value: new Color(rootColor) },
      uTip: { value: new Color(tipColor) },
    };
    const m = new MeshPhysicalMaterial({ color, roughness: 0.85, sheen: 0.8, sheenColor: new Color(tipColor), sheenRoughness: 0.5 });
    m.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          /* glsl */ `#include <common>
          attribute float aShell;
          uniform float uLen;
          uniform vec3 uGravity;
          uniform vec3 uDyn;
          uniform float uTime;
          uniform float uWind;
          varying float vH;
          varying vec3 vRest;
          varying float vLen;
          float furLength(vec3 n) {
            ${
              regions === "head"
                ? `// Face stays short, a fringe above the eyes, a mane on the sides and back.
            float face = smoothstep(0.5, 0.72, n.z) * (1.0 - smoothstep(0.42, 0.6, n.y)) * smoothstep(-0.7, -0.45, n.y);
            float fringe = smoothstep(0.52, 0.66, n.y) * smoothstep(0.05, 0.35, n.z) * (1.0 - smoothstep(0.86, 0.95, n.y));
            float mane = smoothstep(0.0, 0.3, n.y) * (1.0 - smoothstep(0.25, 0.55, n.z)) * (1.0 - smoothstep(0.86, 0.95, n.y));
            float crown = smoothstep(0.86, 0.93, n.y);
            float l = 0.32;
            l = mix(l, 1.0, max(fringe, mane));
            l = mix(l, 0.03, face);
            l = mix(l, 0.05, crown);
            return l * uLen;`
                : `return uLen;`
            }
          }`,
        )
        .replace(
          "#include <begin_vertex>",
          /* glsl */ `
          vec3 n0 = normalize(normal);
          float len = furLength(n0);
          float h = aShell;
          vec3 transformed = position + n0 * h * len;
          vec3 wind = vec3(sin(uTime * 1.7 + position.y * 9.0), 0.0, cos(uTime * 1.3 + position.x * 7.0)) * uWind;
          // Strands bend more towards the tip (quadratic), longer hair bends more.
          float bend = h * h * len * 4.0;
          transformed += (uGravity * 0.55 + uDyn + wind * 0.35) * bend;
          vH = h;
          vRest = position;
          vLen = len;`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          /* glsl */ `#include <common>
          uniform float uDensity;
          uniform vec3 uRoot;
          uniform vec3 uTip;
          varying float vH;
          varying vec3 vRest;
          varying float vLen;
          vec3 hash3(vec3 p) {
            p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
            return fract(sin(p) * 43758.5453123);
          }`,
        )
        .replace(
          "#include <clipping_planes_fragment>",
          /* glsl */ `#include <clipping_planes_fragment>
          vec3 sp = vRest * uDensity;
          vec3 cell = floor(sp);
          vec3 rnd = hash3(cell);
          float dist = length(fract(sp) - (0.25 + rnd * 0.5));
          // Each strand has its own length and thins to a point.
          float strandLen = 0.55 + rnd.x * 0.45;
          float radius = 0.5 * (1.0 - vH / strandLen);
          if (vH > strandLen || dist > radius || vLen < 0.004) discard;`,
        )
        .replace(
          "#include <color_fragment>",
          /* glsl */ `#include <color_fragment>
          // Darker roots (self-shadowing), lighter tips, slight per-strand variation.
          diffuseColor.rgb *= mix(uRoot, uTip, smoothstep(0.0, 1.0, vH));
          diffuseColor.rgb *= 0.88 + rnd.y * 0.24;`,
        );
    };
    m.customProgramCacheKey = () => `fur-${regions}`;
    m.userData.uniforms = uniforms;
    return m;
  }, [color, tipColor, rootColor, length, density, regions]);
  useEffect(() => () => material.dispose(), [material]);

  const shellAttr = useMemo(() => new InstancedBufferAttribute(new Float32Array(Array.from({ length: shells }, (_, i) => (i + 1) / shells)), 1), [shells]);

  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    m.geometry.setAttribute("aShell", shellAttr);
    const o = new Object3D();
    o.updateMatrix();
    for (let i = 0; i < shells; i++) m.setMatrixAt(i, o.matrix);
    m.instanceMatrix.needsUpdate = true;
  }, [shells, shellAttr]);

  useFrame((state, dt) => {
    const m = mesh.current;
    if (!m) return;
    const d = Math.min(Math.max(dt, 1 / 240), 0.05);
    const ph = physics.current;
    m.getWorldPosition(tmp.p);
    m.getWorldQuaternion(tmp.q);
    if (!ph.init) {
      ph.prev.copy(tmp.p);
      ph.init = true;
    }
    ph.vel.subVectors(tmp.p, ph.prev).divideScalar(d);
    ph.prev.copy(tmp.p);
    // Spring: hair trails behind the motion, overshoots and settles.
    tmp.target.copy(ph.vel).multiplyScalar(-0.12).clampLength(0, 0.8);
    tmp.d.subVectors(tmp.target, ph.dyn).multiplyScalar(90 * d);
    ph.dynVel.add(tmp.d).multiplyScalar(Math.exp(-7 * d));
    ph.dyn.addScaledVector(ph.dynVel, d * 10);
    // Into the mesh's local space.
    const inv = tmp.q.invert();
    const uniforms = (m.material as MeshPhysicalMaterial).userData.uniforms;
    uniforms.uGravity.value.copy(up).applyQuaternion(inv);
    uniforms.uDyn.value.copy(ph.dyn).applyQuaternion(inv);
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uWind.value = 0.15 + (windRef?.current ?? 0) * 0.6;
  });

  return <instancedMesh ref={mesh} args={[geometry, material, shells]} frustumCulled={false} />;
}
