import { createCanvas } from './canvas';
import { boxBlur } from './blur';
import { BAYER } from './kernels';
import type { ProcessInput, ProcessResult, ToneSettings } from './types';

/**
 * The 1998 sensor output 128px wide in FOUR grey levels. Each pixel becomes
 * an n x n block of dots: 128 x 3 = 384, the receipt's width.
 */
const FILL3 = [[0, 6, 4], [5, 2, 7], [3, 8, 1]];
const FILL4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
export const GBW = 128;

export function gbBlock(n: number): { m: number[][]; counts: number[] } {
  if (n === 3) return { m: FILL3, counts: [9, 4, 2, 0] };
  if (n === 4) return { m: FILL4, counts: [16, 7, 3, 0] };
  const m: number[][] = [];
  const t = n * n;
  for (let y = 0; y < n; y++) {
    m.push([]);
    for (let x = 0; x < n; x++) m[y].push((x * 7 + y * 5) % t);
  }
  return { m, counts: [t, Math.round(t * 0.44), Math.round(t * 0.20), 0] };
}

/** Quantizes to 4 levels with an ordered screen, then dilates into blocks. */
export function gbQuant(g: ArrayLike<number>, gw: number, gh: number, n: number): { bits: Uint8ClampedArray; W: number; H: number; pct: number } {
  const { m, counts } = gbBlock(n);
  const W = gw * n, H = gh * n;
  const bits = new Uint8ClampedArray(W * H).fill(255);
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      const t = (BAYER[y & 3][x & 3] + 0.5) / 16 - 0.5;
      let q = Math.floor(g[y * gw + x] / 255 * 3 + t + 0.5);
      q = q < 0 ? 0 : q > 3 ? 3 : q;
      const k = counts[q];
      if (!k) continue;
      for (let dy = 0; dy < n; dy++) {
        const row = (y * n + dy) * W;
        for (let dx = 0; dx < n; dx++) if (m[dy][dx] < k) bits[row + x * n + dx] = 0;
      }
    }
  }
  let black = 0;
  for (let i = 0; i < bits.length; i++) if (bits[i] < 128) black++;
  return { bits, W, H, pct: black / bits.length * 100 };
}

export function gbcamRender(o: ProcessInput, st: ToneSettings): ProcessResult {
  const c = o.crop;
  const n = Math.max(2, Math.floor((st.w || 384) / GBW));
  const gw = GBW, gh = Math.max(8, Math.round(c.h * gw / c.w));
  const work = createCanvas();
  work.width = gw; work.height = gh;
  const wctx = work.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
  wctx.save();
  wctx.imageSmoothingEnabled = true; wctx.imageSmoothingQuality = 'high';
  if (o.mirror) { wctx.translate(gw, 0); wctx.scale(-1, 1); }
  wctx.drawImage(o.source, c.x, c.y, c.w, c.h, 0, 0, gw, gh);
  wctx.restore();
  const d = wctx.getImageData(0, 0, gw, gh).data;
  let g = new Float32Array(gw * gh);
  for (let i = 0, p = 0; i < g.length; i++, p += 4) g[i] = .299 * d[p] + .587 * d[p + 1] + .114 * d[p + 2];

  /* Hard edges: the sensor did an analog convolution. */
  const edge = (st.edge == null ? 16 : st.edge) / 10;
  if (edge > 0) {
    const bl = boxBlur(g, gw, gh, 1);
    for (let i = 0; i < g.length; i++) g[i] = Math.max(0, Math.min(255, g[i] + (g[i] - bl[i]) * edge));
  }
  /* Optical vignette. */
  const vg = (st.vig == null ? 30 : st.vig) / 100;
  if (vg > 0) {
    const cx = gw / 2, cy = gh / 2;
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        const r = Math.hypot((x - cx) / cx, (y - cy) / cy) - 0.45;
        if (r > 0) g[y * gw + x] *= Math.max(0, 1 - vg * Math.pow(r, 1.5) * 2);
      }
    }
  }
  /* Same tone levers as the other styles, so it can be tuned too. */
  const wp = Math.max(30, st.white || 180), gm = (st.gamma || 80) / 100;
  let blank = 0;
  for (let i = 0; i < g.length; i++) {
    let v = Math.max(0, Math.min(1, (g[i] - 20) / Math.max(wp - 20, 1)));
    if (g[i] >= wp) blank++;
    v = Math.pow(v, gm);
    if (st.invert) v = 1 - v;
    g[i] = v * 255;
  }
  const r = gbQuant(g, gw, gh, n);
  return { ...r, blank: blank / g.length * 100 };
}
