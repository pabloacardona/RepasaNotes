"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment } from "@react-three/drei";
import { ACESFilmicToneMapping, SRGBColorSpace } from "three";
import type { Mood } from "@/lib/mood";
import type { MascotId } from "@/lib/mascots";
import { Repi } from "./repi";
import { Trophy, type TrophyTier } from "./trophy";

// Small transparent canvas: just the mascot (and the trophy on results), well lit and antialiased.
export default function MascotCanvas({
  mascot,
  mood,
  pulse,
  lastHit,
  streak,
  trophy,
  onReady,
}: {
  mascot: MascotId;
  mood: Mood;
  pulse: number;
  lastHit: boolean | null;
  streak: number;
  trophy?: TrophyTier | null;
  onReady: () => void;
}) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0.62, 3.1], fov: 36, near: 0.1, far: 30 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl, camera }) => {
        gl.outputColorSpace = SRGBColorSpace;
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.0;
        camera.lookAt(0, 0.5, 0);
        onReady();
      }}
    >
      <Environment files="/3d/env.hdr" environmentIntensity={0.5} />
      <hemisphereLight args={["#ffffff", "#8fa3d9", 1]} />
      <directionalLight position={[2.5, 4, 3.5]} intensity={2.2} color="#fff3e0" />
      <directionalLight position={[-3, 2, -2.5]} intensity={1.4} color="#7fb2ff" />
      <Suspense fallback={null}>
        <group position={[trophy ? -0.45 : 0, 0, 0]}>
          <Repi key={mascot} mascot={mascot} mood={mood} pulse={pulse} lastHit={lastHit} streak={streak} />
        </group>
        {trophy && <Trophy tier={trophy} position={[0.62, 0, 0.25]} scale={0.8} />}
      </Suspense>
      <ContactShadows position={[0, 0.001, 0]} opacity={0.45} scale={4.5} blur={2.6} far={1.6} resolution={512} color="#0b1020" />
    </Canvas>
  );
}
