"use client";

import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useMemo, useRef, type RefObject } from "react";
import {
  CircleGeometry,
  Color,
  Float32BufferAttribute,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  type Group,
  type Object3D,
} from "three";

// Stylised garden (Quaternius nature models, CC0), in the same style as Repi.
const M = (name: string) => `/3d/garden/${name}.glb`;
const NAMES = [
  "tree1", "tree2", "tree6", "bushberries", "bushflowers", "flowergroup1", "flowergroup2", "mushroom1", "mushroom2",
  "rock1", "rockmed", "rocklarge", "sign1", "fence1", "cloud1", "cloud2", "tallgrass", "book1", "book2", "openbook1",
] as const;
type Name = (typeof NAMES)[number];

function useClone(name: Name) {
  const { scene } = useGLTF(M(name), false, true);
  return useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      if (o instanceof Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);
}

function Prop({ name, position, rotation = 0, scale = 1 }: { name: Name; position: [number, number, number]; rotation?: number | [number, number, number]; scale?: number }) {
  const obj = useClone(name);
  return <primitive object={obj} position={position} rotation={typeof rotation === "number" ? [0, rotation, 0] : rotation} scale={scale} />;
}

// Sways with the wind; optionally grows with correct answers.
function Plant({
  name, position, rotation = 0, scale = 1, windRef, growRef, phase = 0,
}: {
  name: Name; position: [number, number, number]; rotation?: number; scale?: number;
  windRef: RefObject<number>; growRef?: RefObject<number>; phase?: number;
}) {
  const obj = useClone(name);
  const g = useRef<Group>(null);
  useFrame((state, dt) => {
    if (!g.current) return;
    const t = state.clock.elapsedTime;
    const w = windRef.current ?? 0;
    g.current.rotation.z = Math.sin(t * (1.1 + w * 2) + phase) * (0.03 + w * 0.09);
    g.current.rotation.x = Math.sin(t * (0.8 + w * 1.5) + phase * 2) * (0.02 + w * 0.05);
    if (growRef) {
      const target = scale * (0.35 + 0.65 * (growRef.current ?? 0));
      g.current.scale.setScalar(MathUtils.damp(g.current.scale.x, target, 2.5, Math.min(dt, 0.05)));
    }
  });
  return (
    <group ref={g} position={position} rotation={[0, rotation, 0]} scale={growRef ? scale * 0.35 : scale}>
      <primitive object={obj} />
    </group>
  );
}

// Clouds drift across the sky and turn grey with bad weather.
function Cloud({ name, position, scale, speed, sunnyRef }: { name: Name; position: [number, number, number]; scale: number; speed: number; sunnyRef: RefObject<number> }) {
  const obj = useClone(name);
  const mats = useMemo(() => {
    const list: MeshStandardMaterial[] = [];
    obj.traverse((o: Object3D) => {
      if (o instanceof Mesh) {
        const m = (o.material as MeshStandardMaterial).clone();
        m.roughness = 1;
        o.material = m;
        o.castShadow = false;
        list.push(m);
      }
    });
    return list;
  }, [obj]);
  const g = useRef<Group>(null);
  const white = useMemo(() => new Color("#ffffff"), []);
  const grey = useMemo(() => new Color("#5d6577"), []);
  useFrame((state) => {
    if (!g.current) return;
    const x = ((position[0] + state.clock.elapsedTime * speed + 30) % 60) - 30;
    g.current.position.set(x, position[1] + Math.sin(state.clock.elapsedTime * 0.2 + position[0]) * 0.3, position[2]);
    const w = sunnyRef.current ?? 1;
    for (const m of mats) m.color.copy(grey).lerp(white, w);
  });
  return (
    <group ref={g} scale={scale}>
      <primitive object={obj} />
    </group>
  );
}

// Grass-green ground with soft colour variation.
function Ground() {
  const geo = useMemo(() => {
    const g = new CircleGeometry(30, 96, 0, Math.PI * 2);
    const pos = g.getAttribute("position");
    const colors: number[] = [];
    const a = new Color("#7fc65e");
    const b = new Color("#a6d86b");
    const c = new Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const n = (Math.sin(x * 0.9) * Math.cos(y * 0.7) + Math.sin(x * 0.23 + y * 0.31)) * 0.25 + 0.5;
      c.copy(a).lerp(b, n);
      colors.push(c.r, c.g, c.b);
    }
    g.setAttribute("color", new Float32BufferAttribute(colors, 3));
    return g;
  }, []);
  return (
    <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <meshStandardMaterial vertexColors roughness={1} />
    </mesh>
  );
}

const GRASS: [number, number, number][] = [
  [-1.9, 0, 0.9], [1.9, 0, 0.9], [-0.4, 0, 1.2], [0.5, 0, 1.4], [-2.6, 0, -0.2], [2.5, 0, -0.5], [-1.1, 0, -1.6], [0.9, 0, -1.7],
  [-3.4, 0, 0.8], [3.3, 0, 0.6], [-0.2, 0, -2.4],
];

export function Garden({ windRef, bloomRef, sunnyRef }: { windRef: RefObject<number>; bloomRef: RefObject<number>; sunnyRef: RefObject<number> }) {
  return (
    <group>
      <Ground />

      {/* Repi's stage: two books lying flat, an open book and a little sign */}
      <Prop name="book1" position={[0, 0.09, 0]} rotation={[0, 0.25, Math.PI / 2]} scale={0.85} />
      <Prop name="book2" position={[0.02, 0.27, 0.01]} rotation={[0, -0.15, Math.PI / 2]} scale={0.8} />
      <Prop name="openbook1" position={[-0.85, 0.04, 0.55]} rotation={0.6} scale={0.55} />
      <Prop name="sign1" position={[-1.35, 0, 0.1]} rotation={0.5} scale={0.5} />

      {/* Flowers grow with correct answers */}
      <Plant name="flowergroup1" position={[0.85, 0, 0.55]} rotation={-0.5} scale={0.3} windRef={windRef} growRef={bloomRef} phase={0.3} />
      <Plant name="flowergroup2" position={[-0.55, 0, 0.95]} rotation={0.4} scale={0.25} windRef={windRef} growRef={bloomRef} phase={1.1} />
      <Plant name="flowergroup1" position={[-2.0, 0, 0.3]} rotation={2.1} scale={0.28} windRef={windRef} growRef={bloomRef} phase={2.3} />
      <Plant name="flowergroup2" position={[2.1, 0, 0.2]} rotation={-1.2} scale={0.26} windRef={windRef} growRef={bloomRef} phase={0.8} />
      {GRASS.map((p, i) => (
        <Plant key={i} name="tallgrass" position={p} rotation={i * 1.7} scale={0.22 + (i % 3) * 0.05} windRef={windRef} phase={i} />
      ))}

      {/* Mid ground */}
      <Plant name="bushberries" position={[-1.55, 0, -0.9]} rotation={0.6} scale={0.5} windRef={windRef} phase={0.4} />
      <Plant name="bushberries" position={[1.75, 0, -1.15]} rotation={2.2} scale={0.45} windRef={windRef} phase={1.4} />
      <Plant name="bushflowers" position={[1.0, 0, -2.2]} rotation={-0.4} scale={0.45} windRef={windRef} phase={2.4} />
      <Prop name="mushroom2" position={[-0.8, 0, -0.35]} rotation={0.3} scale={0.45} />
      <Prop name="mushroom1" position={[1.35, 0, 0.6]} rotation={-0.8} scale={0.6} />
      <Prop name="rock1" position={[0.55, 0, -0.75]} rotation={1.2} scale={0.55} />

      {/* Backdrop */}
      <Plant name="tree1" position={[-2.7, 0, -2.6]} rotation={0.5} scale={0.42} windRef={windRef} phase={0.2} />
      <Plant name="tree2" position={[2.9, 0, -3.0]} rotation={-0.8} scale={0.42} windRef={windRef} phase={1.2} />
      <Plant name="tree6" position={[-4.6, 0, -4.8]} rotation={1.1} scale={0.36} windRef={windRef} phase={2.2} />
      <Plant name="tree6" position={[4.9, 0, -5.4]} rotation={-1.4} scale={0.4} windRef={windRef} phase={0.9} />
      <Plant name="tree1" position={[0.4, 0, -7.5]} rotation={2.6} scale={0.5} windRef={windRef} phase={1.7} />
      <Prop name="rockmed" position={[-3.2, 0, -1.3]} rotation={0.7} scale={0.32} />
      <Prop name="rocklarge" position={[4.2, 0, -3.8]} rotation={-0.4} scale={0.42} />
      <Prop name="fence1" position={[-1.6, 0, -3.9]} rotation={0.12} scale={0.45} />
      <Prop name="fence1" position={[1.3, 0, -4.1]} rotation={-0.1} scale={0.45} />

      {/* Sky */}
      <Cloud name="cloud1" position={[-8, 6.5, -18]} scale={1.6} speed={0.25} sunnyRef={sunnyRef} />
      <Cloud name="cloud2" position={[6, 7.5, -22]} scale={1.8} speed={0.18} sunnyRef={sunnyRef} />
      <Cloud name="cloud1" position={[14, 5.5, -16]} scale={1.3} speed={0.3} sunnyRef={sunnyRef} />
      <Cloud name="cloud2" position={[-18, 8, -24]} scale={2.2} speed={0.15} sunnyRef={sunnyRef} />
    </group>
  );
}

for (const n of NAMES) useGLTF.preload(M(n), false, true);
