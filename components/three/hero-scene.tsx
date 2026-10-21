"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Float, Lightformer, RoundedBox, Sparkles } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { CanvasTexture, SRGBColorSpace, type Group } from "three";

const INK = "#1b2433";
const BLUE = "#3651d4";
const YELLOW = "#f6d44a";
const GREEN = "#24875a";
const PAPER = "#fffdf8";

type TileProps = {
  letter: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  correct?: boolean;
  speed?: number;
};

// Letter drawn on a canvas with the page's Rubik font: no font download or worker.
function LetterFace({ letter, color }: { letter: string; color: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    const family = getComputedStyle(document.documentElement).getPropertyValue("--font-rubik").trim() || "sans-serif";
    ctx.font = `800 180px ${family}`;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(letter, 128, 140);
    const t = new CanvasTexture(canvas);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [letter, color]);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh position={[0, 0, 0.145]}>
      <planeGeometry args={[0.9, 0.9]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  );
}

function AnswerTile({ letter, position, rotation = [0, 0, 0], correct = false, speed = 1.4 }: TileProps) {
  return (
    <Float speed={speed} rotationIntensity={0.6} floatIntensity={1.2}>
      <group position={position} rotation={rotation}>
        <RoundedBox args={[1.1, 1.1, 0.28]} radius={0.16} smoothness={4}>
          <meshPhysicalMaterial
            color={correct ? GREEN : PAPER}
            roughness={0.25}
            clearcoat={1}
            clearcoatRoughness={0.15}
            emissive={correct ? GREEN : "#000000"}
            emissiveIntensity={correct ? 0.25 : 0}
          />
        </RoundedBox>
        <LetterFace letter={letter} color={correct ? "#ffffff" : INK} />
      </group>
    </Float>
  );
}

function Scene() {
  const group = useRef<Group>(null);

  // Gentle parallax that follows the pointer.
  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const k = Math.min(delta * 3, 1);
    g.rotation.y += (state.pointer.x * 0.35 - g.rotation.y) * k;
    g.rotation.x += (-state.pointer.y * 0.2 - g.rotation.x) * k;
  });

  return (
    <group ref={group}>
      <AnswerTile letter="A" position={[-1.5, 1.0, 0]} rotation={[0.1, 0.35, -0.12]} speed={1.2} />
      <AnswerTile letter="B" position={[0.35, 1.35, -0.6]} rotation={[-0.15, -0.25, 0.1]} correct speed={1.6} />
      <AnswerTile letter="C" position={[-0.7, -0.6, 0.5]} rotation={[0.2, 0.2, 0.08]} speed={1.1} />
      <AnswerTile letter="D" position={[1.35, -0.35, 0.2]} rotation={[-0.1, -0.4, -0.15]} speed={1.5} />

      {/* Highlighter ring: the brand's yellow marker */}
      <Float speed={2} rotationIntensity={1.4} floatIntensity={0.8}>
        <mesh position={[1.7, 1.55, -1.2]} rotation={[0.9, 0.3, 0]}>
          <torusGeometry args={[0.5, 0.17, 32, 96]} />
          <meshPhysicalMaterial color={YELLOW} roughness={0.2} clearcoat={1} />
        </mesh>
      </Float>
      <Float speed={1.8} rotationIntensity={1} floatIntensity={1.4}>
        <mesh position={[-1.9, -1.3, -0.8]}>
          <icosahedronGeometry args={[0.4, 0]} />
          <meshPhysicalMaterial color={BLUE} roughness={0.3} clearcoat={1} flatShading />
        </mesh>
      </Float>
      <Float speed={2.4} rotationIntensity={2} floatIntensity={1}>
        <mesh position={[0.4, -1.6, -0.4]}>
          <sphereGeometry args={[0.22, 32, 32]} />
          <meshPhysicalMaterial color={YELLOW} roughness={0.15} clearcoat={1} />
        </mesh>
      </Float>

      <Sparkles count={40} scale={[6, 4, 3]} size={3} speed={0.4} color={YELLOW} />
    </group>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6.2], fov: 42 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
      aria-label="Fichas de respuesta A, B, C y D flotando en 3D"
      role="img"
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 6, 5]} intensity={1.6} />
      <Scene />
      <ContactShadows position={[0, -2.3, 0]} opacity={0.35} scale={9} blur={2.6} far={4} color={INK} />
      {/* Studio lighting built in code, no HDR download */}
      <Suspense fallback={null}>
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={2} position={[0, 4, -4]} scale={[10, 2, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-5, 1, 2]} scale={[2, 6, 1]} color={BLUE} />
        <Lightformer form="rect" intensity={1.2} position={[5, 1, 2]} scale={[2, 6, 1]} color={YELLOW} />
      </Environment>
      </Suspense>
    </Canvas>
  );
}
