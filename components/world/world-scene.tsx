"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, PerformanceMonitor } from "@react-three/drei";
import { Bloom, DepthOfField, EffectComposer, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { Suspense, useEffect, useRef, useState } from "react";
import { Color, Fog, MathUtils, Vector3, type DirectionalLight, type HemisphereLight, type PerspectiveCamera } from "three";
import type { WorldState } from "@/lib/mood";
import { Mascot } from "./mascot";
import { Garden } from "./garden";
import { SkyDome } from "./sky-dome";
import { Fireflies, Lightning, Petals, Rain, Rainbow } from "./weather";
import { Trophy, type TrophyTier } from "./trophy";

export type WorldProps = {
  state: WorldState;
  lastHit: boolean | null;
  trophy?: TrophyTier | null;
  onReady?: () => void;
};

const SUN_WARM = new Color("#fff1d6");
const SUN_COLD = new Color("#9aa7c7");
const FOG_SUNNY = new Color("#d9e6f2");
const FOG_STORM = new Color("#3e4555");

// Keeps the mascot on the right of the screen (on top for phones) with a gentle parallax.
function CameraRig({ focusX, shift }: { focusX: number; shift: number }) {
  const look = useRef(new Vector3(focusX, 0.75, 0));
  useFrame((state, dt) => {
    const cam = state.camera as PerspectiveCamera;
    const { width, height } = state.size;
    const mobile = width < 768;
    const d = Math.min(dt, 0.05);
    const px = state.pointer.x * 0.18;
    const py = state.pointer.y * 0.08;
    cam.position.x = MathUtils.damp(cam.position.x, focusX + px, 2, d);
    cam.position.y = MathUtils.damp(cam.position.y, (mobile ? 1.5 : 1.15) + py, 2, d);
    cam.position.z = MathUtils.damp(cam.position.z, mobile ? 5 : 3.1, 2, d);
    look.current.x = MathUtils.damp(look.current.x, focusX, 2, d);
    cam.lookAt(look.current);
    // Shift the whole render so the subject sits beside the quiz panel.
    if (mobile) cam.setViewOffset(width, height, 0, height * 0.34, width, height);
    else cam.setViewOffset(width, height, -width * shift, 0, width, height);
  });
  return null;
}

function Atmosphere({ weatherRef, flashRef }: { weatherRef: React.RefObject<number>; flashRef: React.RefObject<number> }) {
  const sun = useRef<DirectionalLight>(null);
  const hemi = useRef<HemisphereLight>(null);
  const getState = useThree((s) => s.get);
  useEffect(() => () => {
    getState().scene.fog = null;
  }, [getState]);
  useFrame((state) => {
    const scene = state.scene;
    if (!scene.fog) scene.fog = new Fog(FOG_SUNNY.clone(), 7, 22);
    const w = weatherRef.current ?? 0.6;
    const f = flashRef.current ?? 0;
    if (sun.current) {
      sun.current.intensity = MathUtils.lerp(0.12, 2.3, w * w) + f * 3;
      sun.current.color.copy(SUN_COLD).lerp(SUN_WARM, w);
    }
    if (hemi.current) hemi.current.intensity = MathUtils.lerp(0.12, 0.9, w) + f * 1.5;
    scene.environmentIntensity = MathUtils.lerp(0.12, 0.85, w * w) + f;
    if (scene.fog instanceof Fog) {
      scene.fog.color.copy(FOG_STORM).lerp(FOG_SUNNY, w);
      scene.fog.near = MathUtils.lerp(3, 8, w);
      scene.fog.far = MathUtils.lerp(14, 26, w);
    }
  });
  return (
    <>
      <hemisphereLight ref={hemi} args={["#dfeaff", "#5a4a32", 0.8]} />
      <directionalLight
        ref={sun}
        position={[3.5, 6, 3]}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
    </>
  );
}

function World({ state, lastHit, trophy, high }: WorldProps & { high: boolean }) {
  // Smoothed values shared with shaders and lights, updated every frame.
  const weatherRef = useRef(state.weather);
  const stormRef = useRef(1 - state.weather);
  const rainRef = useRef(0);
  const windRef = useRef(0);
  const bloomRef = useRef(state.bloom);
  const flashRef = useRef(0);

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    weatherRef.current = MathUtils.damp(weatherRef.current, state.weather, 1.2, d);
    stormRef.current = 1 - weatherRef.current;
    rainRef.current = MathUtils.smoothstep(stormRef.current, 0.42, 0.85);
    windRef.current = MathUtils.smoothstep(stormRef.current, 0.3, 1) + Math.min(state.streak, 5) * 0.03;
    bloomRef.current = state.bloom;
  });

  const focusX = trophy ? 0.42 : 0;
  const celebrating = state.mood === "celebrating" || state.mood === "proud";

  return (
    <>
      <CameraRig focusX={focusX} shift={trophy ? 0.17 : 0.23} />
      <Atmosphere weatherRef={weatherRef} flashRef={flashRef} />
      <Environment files="/3d/env.hdr" />
      <SkyDome weatherRef={weatherRef} flashRef={flashRef} />
      <Garden windRef={windRef} bloomRef={bloomRef} stormRef={stormRef} />

      {/* Mascot standing on the stump */}
      <group position={[0, 0.29, 0.05]} scale={0.82}>
        <Mascot mood={state.mood} pulse={state.pulse} lastHit={lastHit} />
      </group>
      {trophy && <Trophy tier={trophy} position={[0.88, 0, 0.3]} scale={1.1} />}

      <Rain amountRef={rainRef} />
      <Lightning stormRef={stormRef} flashRef={flashRef} />
      <Rainbow show={state.mood === "comeback" || (state.weather > 0.85 && state.streak >= 3) || celebrating} />
      <Fireflies streak={state.streak} sunny={state.weather} />
      <Petals active={celebrating} />

      {high ? (
        <EffectComposer multisampling={0}>
          <DepthOfField target={[focusX, 0.75, 0.1]} focalLength={0.035} bokehScale={5} height={480} />
          <Bloom intensity={0.55} luminanceThreshold={0.82} luminanceSmoothing={0.2} mipmapBlur />
          <Vignette offset={0.25} darkness={0.55} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      ) : (
        <EffectComposer multisampling={0}>
          <Vignette offset={0.25} darkness={0.5} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      )}
    </>
  );
}

function Ready({ onReady }: { onReady?: () => void }) {
  useEffect(() => {
    onReady?.();
  }, [onReady]);
  return null;
}

export default function WorldScene(props: WorldProps) {
  const [high, setHigh] = useState(true);
  const [dpr, setDpr] = useState(1.5);
  return (
    <Canvas
      shadows
      dpr={dpr}
      camera={{ position: [0, 1.15, 3.1], fov: 38, near: 0.1, far: 150 }}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      aria-hidden
    >
      <PerformanceMonitor
        onDecline={() => {
          setHigh(false);
          setDpr(1);
        }}
        onIncline={() => setDpr(1.5)}
        flipflops={3}
      />
      <Suspense fallback={null}>
        <World {...props} high={high} />
        <Ready onReady={props.onReady} />
      </Suspense>
    </Canvas>
  );
}
