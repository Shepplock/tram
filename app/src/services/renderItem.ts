import { createCanvas } from '../engine/canvas';
import { process } from '../engine/process';
import type { ProcessResult, ToneSettings } from '../engine/types';
import { rotateSource } from './rotate';
import type { BatchItem } from '../state/batchStore';

const rotatedCache = new WeakMap<BatchItem['source'], { rot: number; source: CanvasImageSource }>();

/** Applies the item's rotation, caching the rotated canvas per source so
 *  repeated renders (live slider drag, filmstrip thumbnails) don't re-draw
 *  it every frame. */
function itemSource(b: BatchItem): CanvasImageSource {
  if (!b.rot) return b.source as unknown as CanvasImageSource;
  const cached = rotatedCache.get(b.source);
  if (cached && cached.rot === b.rot) return cached.source;
  const rotated = rotateSource(b.source as unknown as CanvasImageSource, b.width, b.height, b.rot);
  rotatedCache.set(b.source, { rot: b.rot, source: rotated });
  return rotated;
}

/** The crop box is always explicit: full-frame if the image hasn't been cropped. */
export function cropPx(b: BatchItem) {
  const src = itemSource(b);
  const w = b.rot === 90 || b.rot === 270 ? b.height : b.width;
  const h = b.rot === 90 || b.rot === 270 ? b.width : b.height;
  const c = b.crop;
  return { src, box: { x: c.x * w, y: c.y * h, w: c.w * w, h: c.h * h } };
}

/** Printer compensation describes the machine, not the photo: fold it into
 *  the white point before entering the engine, which stays stateless. */
export function withCompensation(st: ToneSettings, comp: number): ToneSettings {
  return { ...st, white: st.white + comp };
}

export function renderItem(b: BatchItem, st: ToneSettings, comp: number): ProcessResult {
  const { src, box } = cropPx(b);
  return process({ source: src, crop: box, st: withCompensation(st, comp) });
}

/** Downscales a decoded bitmap so later processing never touches more than
 *  1600px on the long edge — plenty for a 384px receipt. */
export function shrink(bmp: CanvasImageSource & { width: number; height: number }, max: number) {
  const sc = Math.min(1, max / Math.max(bmp.width, bmp.height));
  if (sc >= 1) return bmp;
  const c = createCanvas();
  c.width = Math.round(bmp.width * sc);
  c.height = Math.round(bmp.height * sc);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  return c;
}
