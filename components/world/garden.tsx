"use client";

import { useFrame } from "@react-three/fiber";
import { useGLTF, useTexture } from "@react-three/drei";
import { useMemo, useRef, type RefObject } from "react";
import { MathUtils, Mesh, RepeatWrapping, type Group, type Object3D, type PointLight } from "three";

const M = (name: string) => `/3d/models/${name}.glb`;

// Every model ships meshopt-compressed: useGLTF(url, draco=false, meshopt=true).
function useModel(name: string) {
  const { scene } = useGLTF(M(name), false, true);
  return scene;
}

function prepare(obj: Object3D) {
  obj.traverse((o) => {
    if (o instanceof Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return obj;
}

function Prop({ name, position, rotation = 0, scale = 1 }: { name: string; position: [number, number, number]; rotation?: number; scale?: number }) {
  const scene = useModel(name);
  const obj = useMemo(() => prepare(scene.clone(true)), [scene]);
  return <primitive object={obj} position={position} rotation={[0, rotation, 0]} scale={scale} />;
}

// Plants sway with the wind; flowers grow with the number of correct answers.
function Plant({
  name,
  position,
  rotation = 0,
  scale = 1,
  windRef,
  growRef,
  phase = 0,
}: {
  name: string;
  position: [number, number, number];
  rotation?: number;
  scale?: number;
  windRef: RefObject<number>;
  growRef?: RefObject<number>;
  phase?: number;
}) {
  const scene = useModel(name);
  const obj = useMemo(() => prepare(scene.clone(true)), [scene]);
  const g = useRef<Group>(null);
  useFrame((state, dt) => {
    if (!g.current) return;
    const t = state.clock.elapsedTime;
    const w = windRef.current ?? 0;
    g.current.rotation.z = Math.sin(t * (1.2 + w * 2) + phase) * (0.02 + w * 0.08);
    g.current.rotation.x = Math.sin(t * (0.9 + w * 1.5) + phase * 2) * (0.015 + w * 0.05);
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

function Ground() {
  const [map, normal, rough] = useTexture([
    "/3d/textures/forest_ground_04_diffuse.webp",
    "/3d/textures/forest_ground_04_nor_gl.webp",
    "/3d/textures/forest_ground_04_rough.webp",
  ]);
  useMemo(() => {
    for (const t of [map, normal, rough]) {
      t.wrapS = t.wrapT = RepeatWrapping;
      t.repeat.set(7, 7);
      t.anisotropy = 8;
    }
  }, [map, normal, rough]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[14, 96]} />
      <meshStandardMaterial map={map} normalMap={normal} roughnessMap={rough} color="#c8c2a8" />
    </mesh>
  );
}

function Lantern({ stormRef }: { stormRef: RefObject<number> }) {
  const light = useRef<PointLight>(null);
  useFrame((state) => {
    if (!light.current) return;
    const s = stormRef.current ?? 0;
    const flicker = 0.9 + Math.sin(state.clock.elapsedTime * 13) * 0.05 + Math.sin(state.clock.elapsedTime * 7.3) * 0.05;
    light.current.intensity = (0.4 + s * 2.6) * flicker;
  });
  return (
    <group position={[-0.78, 0.235, 0.32]}>
      <Prop name="Lantern_01" position={[0, 0, 0]} scale={1.3} />
      <pointLight ref={light} position={[0, 0.2, 0]} color="#ffb35c" distance={3} decay={2} castShadow={false} />
    </group>
  );
}

export function Garden({ windRef, bloomRef, stormRef }: { windRef: RefObject<number>; bloomRef: RefObject<number>; stormRef: RefObject<number> }) {
  return (
    <group>
      <Ground />
      {/* The mascot's stage */}
      <Prop name="tree_stump_01" position={[0, -0.08, 0]} rotation={0.4} />
      <Prop name="book_encyclopedia_set_01" position={[-0.95, 0, 0.25]} rotation={0.5} scale={1.15} />
      <Lantern stormRef={stormRef} />

      {/* Planting, grows with correct answers */}
      <Plant name="flower_gazania" position={[0.75, 0, 0.55]} rotation={-0.6} scale={1.7} windRef={windRef} growRef={bloomRef} phase={0.3} />
      <Plant name="flower_ursinia" position={[-0.25, 0, 0.95]} rotation={0.2} scale={1.4} windRef={windRef} growRef={bloomRef} phase={1.1} />
      <Plant name="flower_gazania" position={[-1.6, 0, -0.35]} rotation={2.1} scale={1.5} windRef={windRef} growRef={bloomRef} phase={2.3} />
      <Plant name="flower_ursinia" position={[1.5, 0, -0.6]} rotation={-1.2} scale={1.3} windRef={windRef} growRef={bloomRef} phase={0.8} />
      <Plant name="fern_02" position={[-1.7, 0, -1.3]} rotation={0.9} scale={1.1} windRef={windRef} phase={0.5} />
      <Plant name="fern_02" position={[1.45, 0, -1.6]} rotation={-2.4} scale={1.25} windRef={windRef} phase={1.7} />
      <Plant name="fern_02" position={[1.15, 0, 0.9]} rotation={3.6} scale={0.7} windRef={windRef} phase={2.9} />

      {/* Backdrop */}
      <Prop name="rock_moss_set_01" position={[-4.2, 0, -5.2]} rotation={0.6} scale={0.65} />
      <Prop name="rock_moss_set_02" position={[3.8, 0, -4.6]} rotation={-0.5} scale={0.75} />
      <Prop name="rock_moss_set_02" position={[0.4, 0, -8.5]} rotation={2.8} scale={1.1} />
    </group>
  );
}

for (const n of ["tree_stump_01", "book_encyclopedia_set_01", "Lantern_01", "flower_gazania", "flower_ursinia", "fern_02", "rock_moss_set_01", "rock_moss_set_02"]) {
  useGLTF.preload(M(n), false, true);
}
