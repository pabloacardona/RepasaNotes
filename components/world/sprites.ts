import { CanvasTexture, SRGBColorSpace } from "three";

const cache = new Map<string, CanvasTexture>();

// Glyph rendered to a canvas with the page's Rubik font (no font download or worker).
export function glyphTexture(glyph: string, color: string, stroke = "#1b2433") {
  const key = `${glyph}|${color}|${stroke}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-rubik").trim() || "sans-serif";
  ctx.font = `800 96px ${family}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 10;
  ctx.strokeStyle = stroke;
  ctx.strokeText(glyph, 64, 70);
  ctx.fillStyle = color;
  ctx.fillText(glyph, 64, 70);
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  cache.set(key, t);
  return t;
}
