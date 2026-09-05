import { createCanvas } from '../engine/canvas';

export function rotateSource(source: CanvasImageSource, width: number, height: number, rot: 0 | 90 | 180 | 270) {
  if (!rot) return source;
  const c = createCanvas();
  if (rot === 90 || rot === 270) { c.width = height; c.height = width; } else { c.width = width; c.height = height; }
  const ctx = c.getContext('2d')!;
  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.drawImage(source, -width / 2, -height / 2);
  return c as unknown as CanvasImageSource;
}
