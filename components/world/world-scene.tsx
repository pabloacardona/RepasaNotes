"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, PerformanceMonitor } from "@react-three/drei";
import { Bloom, DepthOfField, EffectComposer, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { Suspense, useEffect, useRef, useState } from "react";
import { Color, Fog, MathUtils, Vector3, type DirectionalLight, type HemisphereLight, type PerspectiveCamera } from "three";
import type { WorldState } from "@/lib/mood";
import { Repi } from "./repi";
import { Garden } from "./garden";
import { SkyDome, skyColors } from "./sky-dome";
import { Butterflies, Fireflies, Leaves, Lightning, Petals, Rain, Rainbow } from "./weather";
import { Trophy, type TrophyTier } from "./trophy";

export type WorldProps = {
  state: WorldState;
  lastHit: boolean | null;
  trophy?: TrophyTier | null;
  onReady?: () => void;
};

const SUN_WARM = new Color("#fff1d6");
const SUN_COLD = new Color("#9aa7c7");
const TOP_TMP = new Color();

// Width the content panel takes on the left, in CSS pixels. Must match the page layout:
// max-w-[min(600px,56vw)] plus its left padding.
const panelPx = (width: number) => Math.min(600, width * 0.56) + 40;
export const TOP_FRACTION = 0.34; // portrait: share of the screen above the panel
const HEADER_PX = 52;

const FOV = 38;
const TAN = Math.tan(MathUtils.degToRad(FOV / 2));

// Frames the subject (mascot, plus the trophy on results) in the free part of the screen.
// The camera translates and dollies instead of using an off-axis projection, so nothing
// stretches when the window or the browser zoom changes. It also drifts slowly so the
// scene never stands still.
function CameraRig({ center, size }: { center: [number, number, number]; size: [number, number] }) {
  const pos = useRef(new Vector3(center[0], center[1] + 0.4, center[2] + 3.4));
  const look = useRef(new Vector3(...center));
  const placed = useRef(false);
  useFrame((state, dt) => {
    const cam = state.camera as PerspectiveCamera;
    const { width, height } = state.size;
    const aspect = width / height;
    const [W, H] = size;
    const d = Math.min(dt, 0.05);
    const t = state.clock.elapsedTime;

    // Slow orbit and breathing, plus a little pointer parallax.
    const orbit = Math.sin(t * 0.09) * 0.12 + state.pointer.x * 0.05;
    const bob = Math.sin(t * 0.23) * 0.04 + state.pointer.y * 0.03;

    if (aspect >= 1) {
      // Landscape: slide sideways so the subject sits right of the panel.
      const free = MathUtils.clamp(1 - panelPx(width) / width, 0.36, 0.62);
      const dist = Math.max(W / (0.82 * free * 2 * TAN * aspect), H / (0.78 * 2 * TAN), 2.2);
      const shiftX = (1 - free) * dist * TAN * aspect;
      const tx = center[0] - shiftX;
      pos.current.set(tx + Math.sin(orbit) * dist, center[1] + 0.35 + bob, center[2] + Math.cos(orbit) * dist);
      look.current.set(tx, center[1], center[2]);
    } else {
      // Portrait: tilt down so the subject sits in the band above the panel.
      // A rotation, not a translation, so the camera never dips under the ground.
      const dist = Math.max(H / (0.85 * TOP_FRACTION * 2 * TAN), W / (0.8 * 2 * TAN * aspect), 2.2);
      const bandCentre = (HEADER_PX / height + TOP_FRACTION / 2) * 2; // from the top, in NDC units
      const beta = Math.atan((1 - bandCentre) * TAN); // subject angle above the view axis
      const elev = 0.3 + bob;
      pos.current.set(center[0] + Math.sin(orbit) * dist, center[1] + elev, center[2] + Math.cos(orbit) * dist);
      const toSubject = Math.atan2(-elev, dist);
      const pitch = toSubject - beta;
      const hx = center[0] - pos.current.x;
      const hz = center[2] - pos.current.z;
      const hl = Math.hypot(hx, hz) || 1;
      look.current.set(
        pos.current.x + (hx / hl) * Math.cos(pitch),
        pos.current.y + Math.sin(pitch),
        pos.current.z + (hz / hl) * Math.cos(pitch),
      );
    }
    // Jump into place on the first frame, then ease (window resizes, orbit).
    if (!placed.current) {
      cam.position.copy(pos.current);
      placed.current = true;
    } else {
      cam.position.lerp(pos.current, 1 - Math.exp(-4 * d));
    }
    // Keep the view direction exact while the position eases in.
    look.current.add(cam.position).sub(pos.current);
    cam.lookAt(look.current);
    if (cam.view) cam.clearViewOffset();
    if (cam.fov !== FOV) {
      cam.fov = FOV;
      cam.updateProjectionMatrix();
    }
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
    if (!scene.fog) scene.fog = new Fog(new Color("#cfeeff"), 7, 22);
    const w = weatherRef.current ?? 0.6;
    const f = flashRef.current ?? 0;
    if (sun.current) {
      sun.current.intensity = MathUtils.lerp(0.12, 2.3, w * w) + f * 3;
      sun.current.color.copy(SUN_COLD).lerp(SUN_WARM, w);
    }
    if (hemi.current) hemi.current.intensity = MathUtils.lerp(0.12, 0.9, w) + f * 1.5;
    scene.environmentIntensity = MathUtils.lerp(0.12, 0.85, w * w) + f;
    if (scene.fog instanceof Fog) {
      // Same colour as the sky's horizon, so the ground melts into it.
      skyColors(w, TOP_TMP, scene.fog.color);
      scene.fog.near = MathUtils.lerp(5, 10, w);
      scene.fog.far = MathUtils.lerp(18, 32, w);
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

  const center: [number, number, number] = trophy ? [0.45, 0.72, 0.15] : [0, 0.78, 0.05];
  const celebrating = state.mood === "celebrating" || state.mood === "proud";

  return (
    <>
      <CameraRig center={center} size={trophy ? [2.3, 1.6] : [1.3, 1.5]} />
      <Atmosphere weatherRef={weatherRef} flashRef={flashRef} />
      <Environment files="/3d/env.hdr" />
      <SkyDome weatherRef={weatherRef} flashRef={flashRef} />
      <Garden windRef={windRef} bloomRef={bloomRef} sunnyRef={weatherRef} />

      {/* Repi standing on the books */}
      <group position={[0, 0.36, 0.02]}>
        <Repi mood={state.mood} pulse={state.pulse} lastHit={lastHit} streak={state.streak} windRef={windRef} />
      </group>
      {trophy && <Trophy tier={trophy} position={[0.88, 0, 0.3]} scale={1.1} />}

      <Rain amountRef={rainRef} />
      <Lightning stormRef={stormRef} flashRef={flashRef} />
      <Rainbow show={state.mood === "comeback" || (state.weather > 0.85 && state.streak >= 3) || celebrating} />
      <Fireflies streak={state.streak} sunny={state.weather} />
      <Petals active={celebrating} />
      <Butterflies sunnyRef={weatherRef} />
      <Leaves windRef={windRef} />

      {high ? (
        <EffectComposer multisampling={0}>
          <DepthOfField target={center} worldFocusRange={trophy ? 2.4 : 1.6} bokehScale={5} height={480} />
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
      camera={{ position: [0, 1.2, 3.6], fov: FOV, near: 0.1, far: 150 }}
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
