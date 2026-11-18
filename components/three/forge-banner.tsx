"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

// three.js and the 2k PBR textures load only here, in their own chunk, and only when the banner is on screen.
const ForgeScene = dynamic(() => import("./forge-scene"), { ssr: false });

const subscribe = () => () => {};
function getCan3D() {
  try {
    const c = document.createElement("canvas");
    // Phones get the still forge: ~6 MB of model and textures plus a continuous WebGL loop is what made the page feel slow.
    if (window.innerWidth < 640) return false;
    const net = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    // Data saver or a 2G/3G link: the scene is ~6 MB of model and textures, show the still forge instead.
    if (net?.saveData || /^(slow-2g|2g|3g)$/.test(net?.effectiveType ?? "")) return false;
    return !!(c.getContext("webgl2") || c.getContext("webgl")) && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}
function getLow() {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return window.innerWidth < 640 || (nav.deviceMemory ?? 8) < 4 || navigator.hardwareConcurrency <= 4;
}

// Still anvil for browsers without WebGL and for people who prefer reduced motion: the same silhouette, lit from below.
function StillForge() {
  return (
    <svg aria-hidden viewBox="0 0 320 200" className="absolute bottom-0 right-0 h-full w-auto max-w-[60%] opacity-90">
      <defs>
        <radialGradient id="forge-heat" cx="62%" cy="78%" r="45%">
          <stop offset="0" stopColor="#ff7a22" stopOpacity="0.75" />
          <stop offset="0.55" stopColor="#ff7a22" stopOpacity="0.15" />
          <stop offset="1" stopColor="#ff7a22" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="forge-iron" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5a5560" />
          <stop offset="1" stopColor="#201c24" />
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill="url(#forge-heat)" />
      <path d="M118 176h92v10h-92zM128 150h72l6 14h-84z" fill="#2b2026" />
      <path d="M84 96c16-4 36-4 56-2h86c14 0 26 4 34 12-6 6-16 10-30 10h-10l-8 26h-66l-8-26h-18c-16 0-30-6-36-20z" fill="url(#forge-iron)" />
      <path d="M140 92h58l4 6h-66z" fill="#f0c15a" />
      <path d="M150 88h38l3 4h-44z" fill="#ffd79a" />
      {[0, 1, 2, 3, 4].map((i) => (
        <circle key={i} cx={150 + i * 10} cy={70 - (i % 2) * 10 - i * 3} r={1.6 + (i % 2)} fill="#ffb347" opacity={0.7 - i * 0.1} />
      ))}
    </svg>
  );
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
      className="relative isolate mb-6 min-h-[260px] overflow-hidden rounded-2xl border border-[var(--line-strong)] shadow-[inset_0_0_0_1px_rgba(240,193,90,0.14),0_18px_50px_-24px_rgba(255,122,34,0.45)] sm:min-h-[330px]"
      style={{ background: "radial-gradient(120% 90% at 70% 60%, #3a2417 0%, #1b1319 55%, #0e0b12 100%)" }}
    >
      {can3D ? (
        <>
          {/* Embers glow in the dark while the scene loads. */}
          {!ready && (
            <div
              aria-hidden
              className="absolute inset-0 animate-pulse"
              style={{
                background:
                  "radial-gradient(28% 40% at 22% 85%, rgba(255,122,34,0.35), transparent 70%), radial-gradient(18% 26% at 68% 72%, rgba(255,179,71,0.3), transparent 70%)",
              }}
            />
          )}
          <div className={`absolute inset-0 transition-[opacity,transform] duration-1000 ease-out ${ready ? "scale-100 opacity-100" : "scale-[1.03] opacity-0"}`}>
            {(inView || ready) && <ForgeScene low={low} active={inView && tabOn} onReady={() => setReady(true)} />}
          </div>
        </>
      ) : (
        (fallback ?? <StillForge />)
      )}
      {/* Scrim keeps the title readable over the scene; a hairline of gold and a warm floor glow frame it. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-0 bg-gradient-to-r from-[#0e0b12]/88 via-[#0e0b12]/40 to-transparent sm:from-[#0e0b12]/78 sm:via-[#0e0b12]/25" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#ff7a22]/14 to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f0c15a]/45 to-transparent" />
      <div className="relative z-10 flex h-full min-h-[inherit] flex-col justify-between gap-4 p-4 sm:p-6">{children}</div>
    </div>
  );
}
