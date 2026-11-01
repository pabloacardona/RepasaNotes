"use client";

import { Dithering } from "@paper-design/shaders-react";
import { useEffect, useRef, useState } from "react";

// Full-screen ordered-dither shader (Paper Shaders, WebGL). It drifts on its own, leans towards the pointer and
// reacts to the quiz: a hit flashes acid green and speeds up, a miss flashes red, a streak keeps it warmer.
const PALETTE = {
  dark: { back: "#09090a", idle: "#20260d", warm: "#3a2410", hit: "#d4ff3a", miss: "#ff3d5a" },
  light: { back: "#f1eee4", idle: "#dcd6bf", warm: "#f0c9a6", hit: "#c6f432", miss: "#ff9aa8" },
};

export function ShaderBackdrop({
  streak = 0,
  pulse = 0,
  lastHit = null,
  calm = false,
}: {
  streak?: number;
  pulse?: number;
  lastHit?: boolean | null;
  calm?: boolean;
}) {
  const [dark, setDark] = useState(true);
  const [flash, setFlash] = useState<"hit" | "miss" | null>(null);
  const [boost, setBoost] = useState(0);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const seen = useRef(pulse);

  // Follow the theme.
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setDark(root.dataset.theme !== "light");
    read();
    const mo = new MutationObserver(read);
    mo.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);

  // Pointer parallax, smoothed and capped at about 30 updates per second.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const move = (e: PointerEvent) => {
      target.current = { x: e.clientX / window.innerWidth - 0.5, y: e.clientY / window.innerHeight - 0.5 };
    };
    window.addEventListener("pointermove", move, { passive: true });
    let raf = 0;
    let last = 0;
    let cx = 0;
    let cy = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - last < 33) return;
      last = t;
      cx += (target.current.x - cx) * 0.12;
      cy += (target.current.y - cy) * 0.12;
      setLook({ x: cx, y: cy });
      setBoost((b) => (b > 0.02 ? b * 0.93 : 0));
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
    };
  }, []);

  // Every answer sends a pulse through the shader.
  useEffect(() => {
    if (pulse === seen.current) return;
    seen.current = pulse;
    setFlash(lastHit ? "hit" : "miss");
    setBoost(1);
    const t = setTimeout(() => setFlash(null), 1100);
    return () => clearTimeout(t);
  }, [pulse, lastHit]);

  const p = dark ? PALETTE.dark : PALETTE.light;
  const front = flash === "hit" ? p.hit : flash === "miss" ? p.miss : streak >= 3 ? p.warm : p.idle;

  return (
    <div aria-hidden className="fixed inset-0 -z-10" style={{ background: p.back }}>
      <Dithering
        style={{ width: "100%", height: "100%" }}
        colorBack={p.back}
        colorFront={front}
        shape={streak >= 5 ? "swirl" : "warp"}
        type="4x4"
        size={3}
        scale={calm ? 1.3 : 1.1}
        speed={(calm ? 0.25 : 0.4) + boost * 2.4 + Math.min(streak, 6) * 0.05}
        offsetX={look.x * 0.2}
        offsetY={look.y * -0.2}
      />
    </div>
  );
}
