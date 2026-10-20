"use client";

import confetti from "canvas-confetti";

const COLORS = ["#f6d44a", "#3651d4", "#24875a", "#ffffff"];

export function burstAt(el: HTMLElement | null) {
  const rect = el?.getBoundingClientRect();
  confetti({
    particleCount: 40,
    spread: 60,
    startVelocity: 28,
    scalar: 0.8,
    ticks: 120,
    colors: COLORS,
    origin: rect
      ? { x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + rect.height / 2) / window.innerHeight }
      : { x: 0.5, y: 0.6 },
    disableForReducedMotion: true,
  });
}

export function celebrate() {
  const end = Date.now() + 900;
  (function frame() {
    confetti({ particleCount: 5, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors: COLORS, disableForReducedMotion: true });
    confetti({ particleCount: 5, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors: COLORS, disableForReducedMotion: true });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}
