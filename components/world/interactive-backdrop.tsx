"use client";

import { useEffect, useRef } from "react";

// A screensaver-style background: drifting glowing particles that link up and react to the pointer.
// The pointer pulls them in softly and pushes them away up close, a click throws a ripple and a burst,
// and every answer sends a wave from the mascot (green and gold for a hit, a red-violet shock for a miss).
// It listens on the window because the page content sits on top of the canvas.

type P = { x: number; y: number; vx: number; vy: number; r: number; hue: number; life: number; seed: number };
type Ring = { x: number; y: number; r: number; max: number; hue: number; a: number };

const COUNT = 96;
const LINK = 125;

export function InteractiveBackdrop({
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
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef({ streak, lastHit, calm });
  const wave = useRef<{ n: number; hit: boolean | null }>({ n: pulse, hit: lastHit });

  useEffect(() => {
    live.current = { streak, lastHit, calm };
  }, [streak, lastHit, calm]);
  useEffect(() => {
    wave.current = { n: pulse, hit: lastHit };
  }, [pulse, lastHit]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let dpr = 1;
    const mouse = { x: -9999, y: -9999, tx: 0, ty: 0, active: false };
    const parts: P[] = [];
    const rings: Ring[] = [];
    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    const make = (burst?: { x: number; y: number; hue: number; speed: number }): P => ({
      x: burst ? burst.x : rand(0, w),
      y: burst ? burst.y : rand(0, h),
      vx: burst ? Math.cos(rand(0, 6.28)) * burst.speed * rand(0.4, 1) : rand(-0.2, 0.2),
      vy: burst ? Math.sin(rand(0, 6.28)) * burst.speed * rand(0.4, 1) : rand(-0.2, 0.2),
      r: burst ? rand(1.5, 3.4) : rand(1.1, 2.8),
      hue: burst ? burst.hue : [215, 262, 190, 330, 48][Math.floor(Math.random() * 5)] + rand(-10, 10),
      life: burst ? 1 : -1,
      seed: rand(0, 1000),
    });

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.round(COUNT * Math.min(1, (w * h) / (1280 * 720)) + 24);
      while (parts.length < target) parts.push(make());
      parts.length = Math.min(parts.length, target + 80);
    }

    const ring = (x: number, y: number, hue: number, max = 260) => rings.push({ x, y, r: 6, max, hue, a: 0.7 });
    const burst = (x: number, y: number, hue: number, n: number, speed: number) => {
      for (let i = 0; i < n; i++) parts.push(make({ x, y, hue: hue + rand(-18, 18), speed }));
    };

    const onMove = (e: PointerEvent) => {
      mouse.tx = e.clientX;
      mouse.ty = e.clientY;
      mouse.active = true;
    };
    const onDown = (e: PointerEvent) => {
      ring(e.clientX, e.clientY, 200, 220);
      burst(e.clientX, e.clientY, 48 + rand(-10, 160), 12, 2.4);
    };
    const onLeave = () => {
      mouse.active = false;
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    let raf = 0;
    let last = performance.now();
    let seenPulse = wave.current.n;
    let flash = 0; // brief colour wash after an answer
    let flashHue = 150;

    function frame(now: number) {
      const dt = Math.min((now - last) / 16.667, 3);
      last = now;
      const t = now / 1000;
      const { streak: st, calm: isCalm } = live.current;
      const heat = Math.min(st, 6) / 6; // longer streaks warm the whole scene

      // Answer wave from the lower right (where the mascot stands).
      if (wave.current.n !== seenPulse) {
        seenPulse = wave.current.n;
        const ax = w > 900 ? w * 0.82 : w * 0.5;
        const ay = w > 900 ? h * 0.72 : h * 0.16;
        if (wave.current.hit) {
          flashHue = 52 + heat * -8;
          flash = 0.5;
          ring(ax, ay, 150, 420);
          ring(ax, ay, 48, 300);
          burst(ax, ay, 48, 26, 3.6);
        } else if (wave.current.hit === false) {
          flashHue = 335;
          flash = 0.55;
          ring(ax, ay, 350, 380);
          burst(ax, ay, 270, 14, 2);
        }
      }
      flash = Math.max(0, flash - 0.012 * dt);

      // Smooth pointer.
      if (mouse.active) {
        if (mouse.x < -9000) {
          mouse.x = mouse.tx;
          mouse.y = mouse.ty;
        }
        mouse.x += (mouse.tx - mouse.x) * Math.min(0.25 * dt, 1);
        mouse.y += (mouse.ty - mouse.y) * Math.min(0.25 * dt, 1);
      } else {
        mouse.x = -9999;
        mouse.y = -9999;
      }

      // Base: deep gradient that warms with the streak.
      const g = ctx!.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, `hsl(${232 - heat * 18} 62% ${13 + heat * 3}%)`);
      g.addColorStop(0.55, `hsl(${262 - heat * 40} 55% ${16 + heat * 3}%)`);
      g.addColorStop(1, `hsl(${214 - heat * 10} 60% ${11 + heat * 2}%)`);
      ctx!.globalCompositeOperation = "source-over";
      ctx!.fillStyle = g;
      ctx!.fillRect(0, 0, w, h);

      // Big soft blobs drifting on their own, leaning towards the pointer.
      ctx!.globalCompositeOperation = "lighter";
      const px = mouse.active ? (mouse.x / w - 0.5) * 60 : 0;
      const py = mouse.active ? (mouse.y / h - 0.5) * 60 : 0;
      const blobs: [number, number, number, number, number][] = [
        [0.2, 0.25, 0.34, 225, 0.0],
        [0.8, 0.3, 0.3, 285, 1.7],
        [0.65, 0.85, 0.36, 195 - heat * 140, 3.1],
        [0.12, 0.8, 0.26, 330, 4.4],
      ];
      for (const [bx, by, br, hue, ph] of blobs) {
        const cx = (bx + Math.sin(t * 0.18 + ph) * 0.06) * w + px * (1 + ph * 0.1);
        const cy = (by + Math.cos(t * 0.15 + ph) * 0.06) * h + py * (1 + ph * 0.1);
        const rad = br * Math.max(w, h) * (isCalm ? 0.8 : 1);
        const rg = ctx!.createRadialGradient(cx, cy, 0, cx, cy, rad);
        rg.addColorStop(0, `hsl(${hue} 85% 55% / ${0.2 + flash * 0.1})`);
        rg.addColorStop(1, `hsl(${hue} 85% 55% / 0)`);
        ctx!.fillStyle = rg;
        ctx!.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
      }
      if (flash > 0) {
        ctx!.fillStyle = `hsl(${flashHue} 90% 55% / ${flash * 0.16})`;
        ctx!.fillRect(0, 0, w, h);
      }

      // Particles.
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        // Gentle flow field so nothing sits still.
        const a = Math.sin(p.x * 0.004 + t * 0.2 + p.seed) + Math.cos(p.y * 0.005 - t * 0.17 + p.seed);
        p.vx += Math.cos(a * 1.6) * 0.004 * dt;
        p.vy += Math.sin(a * 1.6) * 0.004 * dt;
        if (mouse.active) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 230 * 230 && d2 > 1) {
            const d = Math.sqrt(d2);
            // Pull in from afar, push away up close: they orbit the pointer.
            const f = d > 85 ? 0.018 * (1 - d / 230) : -0.09 * (1 - d / 85);
            p.vx += (dx / d) * f * dt * 10;
            p.vy += (dy / d) * f * dt * 10;
          }
        }
        const damp = Math.pow(p.life >= 0 ? 0.985 : 0.992, dt);
        p.vx *= damp;
        p.vy *= damp;
        p.x += p.vx * dt * (reduce ? 0 : 1);
        p.y += p.vy * dt * (reduce ? 0 : 1);
        if (p.life >= 0) {
          p.life -= 0.012 * dt;
          if (p.life <= 0) {
            parts.splice(i, 1);
            continue;
          }
        } else {
          if (p.x < -20) p.x = w + 20;
          if (p.x > w + 20) p.x = -20;
          if (p.y < -20) p.y = h + 20;
          if (p.y > h + 20) p.y = -20;
        }
      }

      // Links between close particles (and from the pointer to the ones around it).
      ctx!.lineWidth = 1;
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        for (let j = i + 1; j < parts.length; j++) {
          const q = parts[j];
          const dx = p.x - q.x;
          if (dx > LINK || dx < -LINK) continue;
          const dy = p.y - q.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > LINK * LINK) continue;
          const al = (1 - Math.sqrt(d2) / LINK) * 0.38;
          ctx!.strokeStyle = `hsl(${(p.hue + q.hue) / 2 + heat * -50} 90% 72% / ${al})`;
          ctx!.beginPath();
          ctx!.moveTo(p.x, p.y);
          ctx!.lineTo(q.x, q.y);
          ctx!.stroke();
        }
        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 190 * 190) {
            ctx!.strokeStyle = `hsl(${p.hue} 95% 78% / ${(1 - Math.sqrt(d2) / 190) * 0.7})`;
            ctx!.beginPath();
            ctx!.moveTo(p.x, p.y);
            ctx!.lineTo(mouse.x, mouse.y);
            ctx!.stroke();
          }
        }
      }

      // Dots with a glow.
      for (const p of parts) {
        const alpha = p.life >= 0 ? p.life : 1;
        const hue = p.hue + heat * -40;
        const size = p.r * (1 + Math.sin(t * 2 + p.seed) * 0.18);
        const gl = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 5);
        gl.addColorStop(0, `hsl(${hue} 100% 75% / ${0.55 * alpha})`);
        gl.addColorStop(1, `hsl(${hue} 100% 70% / 0)`);
        ctx!.fillStyle = gl;
        ctx!.fillRect(p.x - size * 5, p.y - size * 5, size * 10, size * 10);
        ctx!.fillStyle = `hsl(${hue} 100% 92% / ${alpha})`;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, size, 0, 6.2832);
        ctx!.fill();
      }

      // Ripples.
      ctx!.lineWidth = 2;
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        r.r += (r.max - r.r) * 0.06 * dt + 1.2 * dt;
        r.a -= 0.014 * dt;
        if (r.a <= 0) {
          rings.splice(i, 1);
          continue;
        }
        ctx!.strokeStyle = `hsl(${r.hue} 100% 75% / ${r.a})`;
        ctx!.beginPath();
        ctx!.arc(r.x, r.y, r.r, 0, 6.2832);
        ctx!.stroke();
      }

      // Pointer halo.
      if (mouse.active) {
        const hg = ctx!.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 120);
        hg.addColorStop(0, "hsl(210 100% 80% / 0.22)");
        hg.addColorStop(1, "hsl(210 100% 80% / 0)");
        ctx!.fillStyle = hg;
        ctx!.fillRect(mouse.x - 120, mouse.y - 120, 240, 240);
      }

      if (parts.length > COUNT + 120) parts.splice(COUNT + 24, parts.length - (COUNT + 120));
      if (!reduce) raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="fixed inset-0 -z-10 h-full w-full" style={{ background: "#12163a" }} />;
}
