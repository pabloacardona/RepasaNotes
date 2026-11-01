"use client";

import { Suspense, useLayoutEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, Environment } from "@react-three/drei";
import { ACESFilmicToneMapping, MathUtils, SRGBColorSpace, type PerspectiveCamera } from "three";
import type { Mood } from "@/lib/mood";
import type { MascotId } from "@/lib/mascots";
import { Repi } from "./repi";
import { Trophy, type TrophyTier } from "./trophy";

// Puts the camera where the whole model (and the trophy, when there is one) fits with room for hops, centred.
function CameraFit({ w, h, extra, cx }: { w: number; h: number; extra: number; cx: number }) {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    const cam = camera as PerspectiveCamera;
    const tan = Math.tan(MathUtils.degToRad(cam.fov / 2));
    const aspect = size.width / Math.max(1, size.height);
    const dist = Math.max((h * 1.85) / (2 * tan), ((w + extra) * 1.4) / (2 * tan * aspect));
    cam.position.set(cx, h * 0.56, dist);
    cam.lookAt(cx, h * 0.6, 0);
    cam.updateProjectionMatrix();
  }, [camera, size, w, h, extra, cx]);
  return null;
}

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
  const [fit, setFit] = useState({ w: 1, h: 1 });
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0.62, 3.1], fov: 36, near: 0.1, far: 30 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = SRGBColorSpace;
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.0;
        onReady();
      }}
    >
      <Environment files="/3d/env.hdr" environmentIntensity={0.5} />
      <hemisphereLight args={["#fff1e6", "#d9a38f", 1]} />
      <directionalLight position={[2.5, 4, 3.5]} intensity={2.2} color="#fff3e0" />
      <directionalLight position={[-3, 2, -2.5]} intensity={1.4} color="#ff9a6a" />
      <CameraFit w={fit.w} h={fit.h} extra={trophy ? 1.15 : 0} cx={trophy ? 0.08 : 0} />
      <Suspense fallback={null}>
        <group position={[trophy ? -0.45 : 0, 0, 0]}>
          <Repi key={mascot} mascot={mascot} mood={mood} pulse={pulse} lastHit={lastHit} streak={streak} onFit={setFit} />
        </group>
        {trophy && <Trophy tier={trophy} position={[0.62, 0, 0.25]} scale={0.8} />}
      </Suspense>
      <ContactShadows position={[0, 0.001, 0]} opacity={0.45} scale={4.5} blur={2.6} far={1.6} resolution={512} color="#0b1020" />
    </Canvas>
  );
}
