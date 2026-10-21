"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type RefObject } from "react";
import { BackSide, Color, ShaderMaterial, type Mesh } from "three";

// Stylised gradient sky. Colours follow the weather: sunny, overcast, storm.
// skyColors is shared with the fog so the ground blends into the horizon.
const SKY = {
  sunny: { top: new Color("#3f9be8"), horizon: new Color("#cfeeff") },
  cloudy: { top: new Color("#8a9db3"), horizon: new Color("#d8dee6") },
  storm: { top: new Color("#1f2533"), horizon: new Color("#4a5366") },
};

export function skyColors(w: number, top: Color, horizon: Color) {
  if (w > 0.5) {
    const k = (w - 0.5) * 2;
    top.copy(SKY.cloudy.top).lerp(SKY.sunny.top, k);
    horizon.copy(SKY.cloudy.horizon).lerp(SKY.sunny.horizon, k);
  } else {
    const k = w * 2;
    top.copy(SKY.storm.top).lerp(SKY.cloudy.top, k);
    horizon.copy(SKY.storm.horizon).lerp(SKY.cloudy.horizon, k);
  }
}

export function SkyDome({ weatherRef, flashRef }: { weatherRef: RefObject<number>; flashRef: RefObject<number> }) {
  const meshRef = useRef<Mesh>(null);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        toneMapped: false,
        uniforms: {
          uTop: { value: new Color() },
          uHorizon: { value: new Color() },
          uSun: { value: 1 },
          uFlash: { value: 0 },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uTop;
          uniform vec3 uHorizon;
          uniform float uSun;
          uniform float uFlash;
          varying vec3 vDir;
          void main() {
            vec3 d = normalize(vDir);
            float h = clamp(d.y, 0.0, 1.0);
            vec3 col = mix(uHorizon, uTop, pow(h, 0.6));
            // Warm sun glow, only when the weather is good.
            vec3 sunDir = normalize(vec3(0.5, 0.35, -1.0));
            float g = pow(max(dot(d, sunDir), 0.0), 24.0);
            col += vec3(1.0, 0.85, 0.55) * g * 0.6 * uSun;
            col += uFlash * vec3(0.75, 0.8, 1.0);
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    [],
  );

  useFrame(() => {
    const mat = meshRef.current?.material as ShaderMaterial | undefined;
    if (!mat) return;
    const w = weatherRef.current ?? 0.6;
    skyColors(w, mat.uniforms.uTop.value, mat.uniforms.uHorizon.value);
    mat.uniforms.uSun.value = Math.max(0, (w - 0.55) / 0.45);
    mat.uniforms.uFlash.value = flashRef.current ?? 0;
  });

  return (
    <mesh ref={meshRef} material={material} renderOrder={-1}>
      <sphereGeometry args={[80, 48, 24]} />
    </mesh>
  );
}
