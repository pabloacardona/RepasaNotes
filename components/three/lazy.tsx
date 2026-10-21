"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore, type ReactNode } from "react";
import type { TrophyTier } from "./trophy-scene";

// three.js only loads in the browser, in its own chunk.
const HeroSceneImpl = dynamic(() => import("./hero-scene"), { ssr: false });
const TrophySceneImpl = dynamic(() => import("./trophy-scene"), { ssr: false });

function supportsWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

let can3D: boolean | undefined;
const subscribe = () => () => {};
function getCan3D() {
  if (can3D === undefined) {
    can3D = supportsWebGL() && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  return can3D;
}

// false on the server and on devices without WebGL or with reduced motion.
function useCan3D() {
  return useSyncExternalStore(subscribe, getCan3D, () => false);
}

export function HeroScene({ fallback }: { fallback: ReactNode }) {
  return useCan3D() ? <HeroSceneImpl /> : <>{fallback}</>;
}

export function TrophyScene({ tier, fallback }: { tier: TrophyTier; fallback: ReactNode }) {
  return useCan3D() ? <TrophySceneImpl tier={tier} /> : <>{fallback}</>;
}
