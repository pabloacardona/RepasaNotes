"use client";

import { Suspense, useEffect, useLayoutEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment } from "@react-three/drei";
import { ACESFilmicToneMapping, MathUtils, SRGBColorSpace, type PerspectiveCamera } from "three";
import type { Mood } from "@/lib/mood";
import type { MascotId } from "@/lib/mascots";
import { Repi } from "./repi";
import { Trophy, type TrophyTier } from "./trophy";

// Follows the page theme (data-theme on <html>), so the model is lit for a light page or a dark one.
function useLightTheme() {
  const [light, setLight] = useState(false);
  useEffect(() => {
    const read = () => setLight(document.documentElement.dataset.theme === "light");
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);
  return light;
}

// Exposure is a renderer setting, so it is applied from inside the canvas.
function Exposure({ value }: { value: number }) {
  useFrame(({ gl }) => {
    if (gl.toneMappingExposure !== value) gl.toneMappingExposure = value;
  });
  return null;
}

// Puts the camera where the whole model (and the trophy, when there is one) fits with room for hops, centred.
function CameraFit({ w, h, extra, cx }: { w: number; h: number; extra: number; cx: number }) {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    const cam = camera as PerspectiveCamera;
    const tan = Math.tan(MathUtils.degToRad(cam.fov / 2));
    const aspect = size.width / Math.max(1, size.height);
    // Room for a hop (up to ~0.5h), the mood scale-up and the turning circle, so nothing touches the canvas edge.
    const dist = Math.max((h * 2.35) / (2 * tan), ((w + extra) * 1.55) / (2 * tan * aspect));
    cam.position.set(cx, h * 0.62, dist);
    cam.lookAt(cx, h * 0.68, 0);
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
  const light = useLightTheme();
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.62, 3.1], fov: 36, near: 0.1, far: 30 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = SRGBColorSpace;
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.0;
        onReady();
      }}
    >
      <Exposure value={light ? 1.3 : 1} />
      <Environment files="/3d/env.hdr" environmentIntensity={light ? 1.15 : 0.5} />
      <hemisphereLight args={light ? ["#ffffff", "#f1e3cf", 1.9] : ["#fff1e6", "#d9a38f", 1]} />
      <directionalLight position={[2.5, 4, 3.5]} intensity={light ? 3 : 2.2} color="#fff6e6" />
      <directionalLight position={[-3, 2, -2.5]} intensity={light ? 1.6 : 1.4} color={light ? "#ffd9a8" : "#ff9a6a"} />
      <CameraFit w={fit.w} h={fit.h} extra={trophy ? 1.15 : 0} cx={trophy ? 0.08 : 0} />
      <Suspense fallback={null}>
        <group position={[trophy ? -0.45 : 0, 0, 0]}>
          <Repi key={mascot} mascot={mascot} mood={mood} pulse={pulse} lastHit={lastHit} streak={streak} onFit={setFit} />
        </group>
        {trophy && <Trophy tier={trophy} position={[0.62, 0, 0.25]} scale={0.8} />}
      </Suspense>
      <ContactShadows position={[0, 0.001, 0]} opacity={light ? 0.28 : 0.45} scale={4.5} blur={2.6} far={1.6} resolution={256} color="#0b1020" />
    </Canvas>
  );
}
