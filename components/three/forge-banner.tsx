"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

// three.js and the 2k PBR textures load only here, in their own chunk, and only when the banner is on screen.
const ForgeScene = dynamic(() => import("./forge-scene"), { ssr: false });

const subscribe = () => () => {};
function getCan3D() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl")) && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}
function getLow() {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return window.innerWidth < 640 || (nav.deviceMemory ?? 8) < 4 || navigator.hardwareConcurrency <= 4;
}

// Renders the animated forge behind the page title. It stops rendering when scrolled out of view or the tab is hidden.
export function ForgeBanner({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const can3D = useSyncExternalStore(subscribe, getCan3D, () => false);
  const low = useSyncExternalStore(subscribe, getLow, () => true);
  const box = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [tabOn, setTabOn] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: "80px" });
    io.observe(el);
    const vis = () => setTabOn(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", vis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);

  return (
    <div
      ref={box}
      className="relative isolate mb-6 min-h-[250px] overflow-hidden rounded-2xl border border-[var(--line-strong)] sm:min-h-[310px]"
      style={{ background: "radial-gradient(120% 90% at 70% 60%, #3a2417 0%, #1b1319 55%, #0e0b12 100%)" }}
    >
      {can3D ? (
        <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}>
          {(inView || ready) && <ForgeScene low={low} active={inView && tabOn} onReady={() => setReady(true)} />}
        </div>
      ) : (
        fallback
      )}
      {/* Scrim keeps the title readable over the scene. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-0 bg-gradient-to-r from-[#0e0b12]/85 via-[#0e0b12]/35 to-transparent sm:from-[#0e0b12]/75" />
      <div className="relative z-10 flex h-full min-h-[inherit] flex-col justify-between gap-4 p-4 sm:p-6">{children}</div>
    </div>
  );
}
