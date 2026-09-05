import { createCanvas, type CanvasLike } from './canvas';
import { boxBlur } from './blur';
import { dither, expand } from './dither';
import { pixelSort, rowShear } from './glitch';
import { glyphRender } from './glyph';
import { gbcamRender } from './gbcam';
import type { ProcessInput, ProcessResult } from './types';

let work: CanvasLike | null = null;
let wctx: CanvasRenderingContext2D | null = null;
function getWork() {
  if (!work) {
    work = createCanvas();
    wctx = work.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
  }
  return { work, wctx: wctx as CanvasRenderingContext2D };
}

/** The central image -> bits pipeline: crop, greyscale (sky-weighted channel
 *  mix), blur/sharpen, glitch, tone-map, dither/glyph-render, clip masks. */
export function process(o: ProcessInput): ProcessResult {
  const st = o.st, c = o.crop, W = st.w;
  if (st.algo === 'gbcam') return gbcamRender(o, st);

  const H = Math.max(1, Math.round(c.h * W / c.w));
  /* Glyphs already have their own cell size: no extra dilation. */
  const grid = st.algo === 'glyphes' || st.algo === 'ascii';
  const S = grid ? 1 : Math.max(1, st.scale || 1);
  const dW = Math.max(1, Math.round(W / S)), dH = Math.max(1, Math.round(H / S));
  const { work, wctx } = getWork();
  work.width = dW; work.height = dH;
  wctx.save();
  wctx.imageSmoothingEnabled = true; wctx.imageSmoothingQuality = 'high';
  if (o.mirror) { wctx.translate(dW, 0); wctx.scale(-1, 1); }
  wctx.drawImage(o.source, c.x, c.y, c.w, c.h, 0, 0, dW, dH);
  wctx.restore();
  const d = wctx.getImageData(0, 0, dW, dH).data;

  const t = st.sky / 100;
  const wr = .299 + (.10 - .299) * t, wg = .587 + (.25 - .587) * t, wb = .114 + (.65 - .114) * t;
  let g: Float32Array<ArrayBufferLike> = new Float32Array(dW * dH);
  for (let i = 0, p = 0; i < g.length; i++, p += 4) g[i] = wr * d[p] + wg * d[p + 1] + wb * d[p + 2];

  if (st.blur > 0) g = boxBlur(g, dW, dH, st.blur);
  const amt = st.sharp / 10;
  if (amt > 0) {
    const bl = boxBlur(g, dW, dH, 1);
    for (let i = 0; i < g.length; i++) g[i] = Math.max(0, Math.min(255, g[i] + (g[i] - bl[i]) * amt));
  }
  /* Glitch acts on raw values: after tone-mapping the image is too crushed
   *  for there to be anything left to sort. */
  const seed = st.gseed || 1;
  if (st.gsort > 0) g = pixelSort(g, dW, dH, st.gsort, seed);
  if (st.gshear > 0) g = rowShear(g, dW, dH, st.gshear, seed);

  const bp = 20, wp = Math.max(30, st.white), gm = st.gamma / 100;
  const raw = st.clip ? Float32Array.from(g) : null;
  /* The densest character only deposits ~50% ink: applying the floor on top
   *  of it halved coverage and made ASCII nearly blank. */
  const fl = st.algo === 'ascii' ? 0 : st.floor / 100;
  let blank = 0;
  for (let i = 0; i < g.length; i++) {
    if (!st.invert && g[i] >= wp) blank++;
    let v = (g[i] - bp) / Math.max(wp - bp, 1);
    v = Math.pow(Math.max(0, Math.min(1, v)), gm);
    if (st.invert) v = 1 - v;
    g[i] = (fl + v * (1 - fl)) * 255;
  }
  const small = grid ? glyphRender(g, dW, dH, st) : dither(g, dW, dH, st.algo, st.cell);
  let black = 0;
  for (let i = 0; i < small.length; i++) if (small[i] < 128) black++;
  const bits = S === 1 ? small : expand(small, dW, dH, W, H);
  const r: ProcessResult = { bits, W, H, pct: black / small.length * 100, blank: blank / g.length * 100 };
  /* Clip preview: where tone saturated, before dithering. Two masks, built
   *  on demand so they cost nothing otherwise. */
  if (st.clip && raw) {
    const hi = new Uint8ClampedArray(dW * dH), lo = new Uint8ClampedArray(dW * dH);
    for (let i = 0; i < raw.length; i++) {
      if (raw[i] >= wp) hi[i] = 1; else if (raw[i] <= bp) lo[i] = 1;
    }
    r.clipHi = S === 1 ? hi : expand(hi, dW, dH, W, H);
    r.clipLo = S === 1 ? lo : expand(lo, dW, dH, W, H);
  }
  return r;
}
