"use client";

import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { useMemo, useRef, type RefObject } from "react";
import { BackSide, ShaderMaterial, SRGBColorSpace, type Mesh } from "three";

// Sky sphere that blends three photographic skies by the weather value.
export function SkyDome({ weatherRef, flashRef }: { weatherRef: RefObject<number>; flashRef: RefObject<number> }) {
  const [sunny, cloudy, storm] = useTexture(["/3d/skies/sunny.webp", "/3d/skies/cloudy.webp", "/3d/skies/storm.webp"]);

  const material = useMemo(() => {
    for (const t of [sunny, cloudy, storm]) t.colorSpace = SRGBColorSpace;
    return new ShaderMaterial({
      side: BackSide,
      depthWrite: false,
      toneMapped: false,
      uniforms: {
        tSunny: { value: sunny },
        tCloudy: { value: cloudy },
        tStorm: { value: storm },
        uW: { value: 0.6 },
        uFlash: { value: 0 },
        uTime: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D tSunny;
        uniform sampler2D tCloudy;
        uniform sampler2D tStorm;
        uniform float uW;
        uniform float uFlash;
        uniform float uTime;
        varying vec3 vDir;
        #define PI 3.14159265359
        vec3 sampleSky(sampler2D t, vec3 d, float drift) {
          vec2 uv = vec2(atan(d.x, -d.z) / (2.0 * PI) + 0.5 + drift, asin(clamp(d.y, -1.0, 1.0)) / PI + 0.5);
          return texture2D(t, uv).rgb;
        }
        void main() {
          vec3 d = normalize(vDir);
          // Lift the horizon so the photo's ground stays hidden below our island.
          d.y = d.y * 0.85 + 0.12;
          vec3 s = sampleSky(tSunny, d, uTime * 0.002);
          vec3 c = sampleSky(tCloudy, d, uTime * 0.004);
          vec3 st = sampleSky(tStorm, d, uTime * 0.006);
          vec3 col = uW > 0.5 ? mix(c, s, smoothstep(0.5, 1.0, uW)) : mix(st, c, smoothstep(0.0, 0.5, uW));
          // Storms get darker and cooler.
          col *= mix(0.3, 1.0, smoothstep(0.0, 0.55, uW));
          col = mix(col, col * vec3(0.72, 0.8, 1.05), 1.0 - smoothstep(0.0, 0.55, uW));
          // Heavy storm clouds: darken towards the zenith.
          float stormK = 1.0 - smoothstep(0.0, 0.45, uW);
          col = mix(col, vec3(0.05, 0.06, 0.1), stormK * (0.55 + 0.3 * clamp(d.y, 0.0, 1.0)));
          col += uFlash * vec3(0.75, 0.8, 1.0);
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }
      `,
    });
  }, [sunny, cloudy, storm]);

  const meshRef = useRef<Mesh>(null);
  useFrame((state) => {
    const mat = meshRef.current?.material as ShaderMaterial | undefined;
    if (!mat) return;
    mat.uniforms.uW.value = weatherRef.current ?? 0.6;
    mat.uniforms.uFlash.value = flashRef.current ?? 0;
    mat.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh ref={meshRef} material={material} renderOrder={-1}>
      <sphereGeometry args={[60, 64, 32]} />
    </mesh>
  );
}
