"use client";

import { useEffect, useRef } from "react";

// A screensaver-style background: drifting glowing particles that link up and react to the pointer.
// The pointer pulls them in softly and pushes them away up close, a click throws a ripple and a burst,
// and every answer sends a wave from the mascot (green and gold for a hit, a red-violet shock for a miss).
// It listens on the window because the page content sits on top of the canvas.

type P = { x: number; y: number; vx: number; vy: number; r: number; hue: number; life: number; seed: number };
type Ring = { x: number; y: number; r: number; max: number; hue: number; a: number };

const COUNT = 72;
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
    // The soft gradient and blobs are drawn small and a few times per second, then stretched: they are blurry anyway.
    const off = document.createElement("canvas");
    const octx = off.getContext("2d");
    let tick = 0;
    let lite = false; // drops the links when the device cannot keep up
    let slow = 0;
    const sprites = new Map<number, HTMLCanvasElement>();
    const glow = (hue: number, light: boolean) => {
      const key = Math.round(hue / 10) * 10 + (light ? 1000 : 0);
      let c = sprites.get(key);
      if (!c) {
        c = document.createElement("canvas");
        c.width = c.height = 48;
        const x = c.getContext("2d")!;
        const g = x.createRadialGradient(24, 24, 0, 24, 24, 24);
        g.addColorStop(0, `hsl(${key % 1000} 55% ${light ? 55 : 72}% / ${light ? 0.3 : 0.4})`);
        g.addColorStop(1, `hsl(${key % 1000} 55% ${light ? 55 : 70}% / 0)`);
        x.fillStyle = g;
        x.fillRect(0, 0, 48, 48);
        sprites.set(key, c);
      }
      return c;
    };
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
      hue: burst ? burst.hue : [350, 24, 38, 300, 45][Math.floor(Math.random() * 5)] + rand(-10, 10),
      life: burst ? 1 : -1,
      seed: rand(0, 1000),
    });

    function resize() {
      dpr = 1; // the scene is soft light, so 1x looks the same and costs a quarter of the pixels
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      off.width = Math.max(2, Math.ceil(w / 4));
      off.height = Math.max(2, Math.ceil(h / 4));
      tick = 0;
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
      ring(e.clientX, e.clientY, 25, 220);
      burst(e.clientX, e.clientY, 20 + rand(-20, 50), 12, 2.4);
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
          ring(ax, ay, 45, 420);
          ring(ax, ay, 18, 300);
          burst(ax, ay, 40, 26, 3.6);
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

      // Base gradient, drifting blobs and the answer wash: drawn small, refreshed every third frame.
      const light = document.documentElement.dataset.theme === "light";
      if (tick++ % 3 === 0 && octx) {
        const ow = off.width;
        const oh = off.height;
        const g = octx.createLinearGradient(0, 0, ow, oh);
        if (light) {
          g.addColorStop(0, `hsl(${28 + heat * 6} 45% 96%)`);
          g.addColorStop(0.55, `hsl(${20 + heat * 4} 40% 94%)`);
          g.addColorStop(1, "hsl(340 30% 94%)");
        } else {
          g.addColorStop(0, `hsl(${272 + heat * 10} 20% ${8 + heat * 2}%)`);
          g.addColorStop(0.55, `hsl(${285 + heat * 14} 18% ${10 + heat * 2}%)`);
          g.addColorStop(1, `hsl(${262 + heat * 10} 22% ${6 + heat * 2}%)`);
        }
        octx.globalCompositeOperation = "source-over";
        octx.fillStyle = g;
        octx.fillRect(0, 0, ow, oh);
        octx.globalCompositeOperation = light ? "source-over" : "lighter";
        const px = mouse.active ? (mouse.x / w - 0.5) * 15 : 0;
        const py = mouse.active ? (mouse.y / h - 0.5) * 15 : 0;
        const blobs: [number, number, number, number, number][] = [
          [0.2, 0.25, 0.34, 345, 0.0],
          [0.8, 0.3, 0.3, 28, 1.7],
          [0.65, 0.85, 0.36, 14 + heat * 30, 3.1],
          [0.12, 0.8, 0.26, 295, 4.4],
        ];
        for (const [bx, by, br, hue, ph] of blobs) {
          const cx = (bx + Math.sin(t * 0.18 + ph) * 0.06) * ow + px * (1 + ph * 0.1);
          const cy = (by + Math.cos(t * 0.15 + ph) * 0.06) * oh + py * (1 + ph * 0.1);
          const rad = br * Math.max(ow, oh) * (isCalm ? 0.8 : 1);
          const rg = octx.createRadialGradient(cx, cy, 0, cx, cy, rad);
          rg.addColorStop(0, `hsl(${hue} 45% ${light ? 72 : 52}% / ${(0.13 + flash * 0.06) * (light ? 0.8 : 1)})`);
          rg.addColorStop(1, `hsl(${hue} 45% ${light ? 72 : 52}% / 0)`);
          octx.fillStyle = rg;
          octx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
        }
        if (flash > 0) {
          octx.globalCompositeOperation = "source-over";
          octx.fillStyle = `hsl(${flashHue} 45% 55% / ${flash * 0.1})`;
          octx.fillRect(0, 0, ow, oh);
        }
      }
      ctx!.globalCompositeOperation = "source-over";
      ctx!.imageSmoothingEnabled = true;
      ctx!.drawImage(off, 0, 0, w, h);
      ctx!.globalCompositeOperation = light ? "source-over" : "lighter";

      // Frame budget: if frames keep taking too long, switch to the light version (no links).
      slow = slow * 0.95 + Math.min(dt, 4) * 0.05;
      lite = slow > 1.6;

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

      // Links between close particles, batched into a few strokes by strength (one path per level).
      if (!lite) {
        ctx!.lineWidth = 1;
        const LV = 5;
        const paths: Path2D[] = Array.from({ length: LV }, () => new Path2D());
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i];
          for (let j = i + 1; j < parts.length; j++) {
            const q = parts[j];
            const dx = p.x - q.x;
            if (dx > LINK || dx < -LINK) continue;
            const dy = p.y - q.y;
            const d2 = dx * dx + dy * dy;
            if (d2 > LINK * LINK) continue;
            const lv = Math.min(LV - 1, Math.floor((1 - Math.sqrt(d2) / LINK) * LV));
            paths[lv].moveTo(p.x, p.y);
            paths[lv].lineTo(q.x, q.y);
          }
        }
        for (let lv = 0; lv < LV; lv++) {
          const al = ((lv + 0.5) / LV) * 0.26 * (light ? 1.3 : 1);
          ctx!.strokeStyle = `hsl(${350 + heat * 30} 40% ${light ? 48 : 72}% / ${al})`;
          ctx!.stroke(paths[lv]);
        }
      }
      if (mouse.active) {
        for (const p of parts) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 190 * 190) {
            ctx!.strokeStyle = `hsl(${p.hue} 50% ${light ? 50 : 76}% / ${(1 - Math.sqrt(d2) / 190) * 0.7})`;
            ctx!.beginPath();
            ctx!.moveTo(p.x, p.y);
            ctx!.lineTo(mouse.x, mouse.y);
            ctx!.stroke();
          }
        }
      }

      // Dots: a cached glow sprite plus a solid core.
      for (const p of parts) {
        const alpha = p.life >= 0 ? p.life : 1;
        const hue = p.hue + heat * 30;
        const size = p.r * (1 + Math.sin(t * 2 + p.seed) * 0.18);
        ctx!.globalAlpha = alpha;
        ctx!.drawImage(glow(hue, light), p.x - size * 5, p.y - size * 5, size * 10, size * 10);
        ctx!.fillStyle = `hsl(${hue} 55% ${light ? 52 : 88}%)`;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, size, 0, 6.2832);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;

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
        ctx!.strokeStyle = `hsl(${r.hue} 100% ${light ? 50 : 75}% / ${r.a})`;
        ctx!.beginPath();
        ctx!.arc(r.x, r.y, r.r, 0, 6.2832);
        ctx!.stroke();
      }

      // Pointer halo.
      if (mouse.active) {
        const hg = ctx!.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 120);
        hg.addColorStop(0, light ? "hsl(340 50% 60% / 0.1)" : "hsl(20 50% 75% / 0.14)");
        hg.addColorStop(1, light ? "hsl(340 50% 60% / 0)" : "hsl(20 50% 75% / 0)");
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

  return <canvas ref={ref} aria-hidden className="fixed inset-0 -z-10 h-full w-full" style={{ background: "var(--bg)" }} />;
}
