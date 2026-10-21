"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Float, Lightformer, Sparkles } from "@react-three/drei";
import { Suspense, useRef } from "react";
import { DoubleSide, type Group } from "three";

const TIERS = {
  gold: { color: "#f6c84a", sparkle: "#f6d44a", label: "oro" },
  silver: { color: "#c9d1de", sparkle: "#e3e8fb", label: "plata" },
  bronze: { color: "#c98a4a", sparkle: "#f0c08a", label: "bronce" },
} as const;

export type TrophyTier = keyof typeof TIERS;

function Metal({ color }: { color: string }) {
  return (
    <meshPhysicalMaterial
      color={color}
      metalness={0.55}
      roughness={0.28}
      clearcoat={1}
      emissive={color}
      emissiveIntensity={0.18}
      side={DoubleSide}
    />
  );
}

function Trophy({ tier }: { tier: TrophyTier }) {
  const ref = useRef<Group>(null);
  const { color } = TIERS[tier];

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.8;
  });

  return (
    <group ref={ref} position={[0, -0.3, 0]}>
      {/* Cup */}
      <mesh position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.7, 0.32, 1.1, 48, 1, true]} />
        <Metal color={color} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <sphereGeometry args={[0.32, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <Metal color={color} />
      </mesh>
      {/* Handles */}
      <mesh position={[-0.72, 0.8, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.25, 0.06, 16, 48, Math.PI]} />
        <Metal color={color} />
      </mesh>
      <mesh position={[0.72, 0.8, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <torusGeometry args={[0.25, 0.06, 16, 48, Math.PI]} />
        <Metal color={color} />
      </mesh>
      {/* Stem and base */}
      <mesh position={[0, -0.25, 0]}>
        <cylinderGeometry args={[0.09, 0.14, 0.6, 24]} />
        <Metal color={color} />
      </mesh>
      <mesh position={[0, -0.62, 0]}>
        <cylinderGeometry args={[0.55, 0.62, 0.22, 48]} />
        <meshPhysicalMaterial color="#1b2433" roughness={0.35} clearcoat={1} />
      </mesh>
    </group>
  );
}

export default function TrophyScene({ tier }: { tier: TrophyTier }) {
  return (
    <Canvas
      camera={{ position: [0, 0.4, 4.8], fov: 40 }}
      dpr={[1, 1.75]}
      gl={{ alpha: true }}
      role="img"
      aria-label={`Trofeo de ${TIERS[tier].label}`}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 5, 4]} intensity={2.2} />
      <pointLight position={[-2, 1.5, 2]} intensity={6} color="#fff6cc" />
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.6}>
        <Trophy tier={tier} />
      </Float>
      <Sparkles count={50} scale={[3.5, 3, 2]} size={4} speed={0.6} color={TIERS[tier].sparkle} />
      <ContactShadows position={[0, -1.05, 0]} opacity={0.4} scale={5} blur={2.4} far={3} />
      <Suspense fallback={null}>
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={3} position={[0, 5, -3]} scale={[8, 2, 1]} />
        <Lightformer form="rect" intensity={1.5} position={[-4, 1, 2]} scale={[2, 5, 1]} />
        <Lightformer form="rect" intensity={1.5} position={[4, 1, 2]} scale={[2, 5, 1]} color="#f6d44a" />
      </Environment>
      </Suspense>
    </Canvas>
  );
}
