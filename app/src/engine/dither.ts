import { KERNELS, BAYER, BAYER8, HALFTONE, getBlueNoiseTile, BN_N } from './kernels';
import type { Algo } from './types';

export function dither(g: ArrayLike<number>, w: number, h: number, algo: Algo | string, cell?: number): Uint8ClampedArray {
  const o = new Uint8ClampedArray(w * h);

  if (algo === 'seuil') {
    for (let i = 0; i < g.length; i++) o[i] = g[i] > 127 ? 255 : 0;
    return o;
  }

  if (algo === 'bluenoise') {
    const BN = getBlueNoiseTile();
    const N = BN_N, m = N - 1, d = N * N;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const t = (BN[(y & m) * N + (x & m)] + 0.5) / d * 255;
        o[y * w + x] = g[y * w + x] > t ? 255 : 0;
      }
    }
    return o;
  }

  if (algo === 'halftone') {
    const M = HALFTONE, m = 7, d = 64;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const t = (M[y & m][x & m] + 0.5) / d * 255;
        o[y * w + x] = g[y * w + x] > t ? 255 : 0;
      }
    }
    return o;
  }

  if (algo === 'vinyl') {
    const PITCH = Math.max(2, cell || 8); // px between spiral arms, adjustable via the Groove width slider
    const FADE_R = PITCH * 5; // groove opacity ramps in over this radius, like a record's label
    const cx = (w - 1) / 2, cy = (h - 1) / 2;
    const om = 3, od = 16; // opacity dither: reuse the 4x4 Bayer matrix to thin out ink near the center
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = x - cx, dy = y - cy;
        const r = Math.hypot(dx, dy);
        const theta = Math.atan2(dy, dx);
        const phase = r / PITCH - theta / (2 * Math.PI);
        const frac = phase - Math.floor(phase);
        const d = Math.abs(frac - 0.5) * 2;
        const t = (1 - d) * 255;
        let inked = g[y * w + x] <= t;
        if (inked) {
          let fade = Math.min(1, r / FADE_R);
          fade = fade * fade * (3 - 2 * fade); // smoothstep
          const noise = (BAYER[y & om][x & om] + 0.5) / od;
          if (noise > fade) inked = false; // dropped: groove reads lighter near the center
        }
        o[y * w + x] = inked ? 0 : 255;
      }
    }
    return o;
  }

  if (algo === 'bayer' || algo === 'bayer8') {
    const M = algo === 'bayer8' ? BAYER8 : BAYER;
    const n = M.length, m = n - 1, d = n * n;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const t = (M[y & m][x & m] + .5) / d * 255;
        o[y * w + x] = g[y * w + x] > t ? 255 : 0;
      }
    }
    return o;
  }

  const k = KERNELS[algo] || KERNELS.fs;
  const buf = Float32Array.from(g);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x, old = buf[i], nv = old > 127 ? 255 : 0;
      o[i] = nv;
      const e = old - nv;
      for (let j = 0; j < k.length; j++) {
        const nx = x + k[j][0], ny = y + k[j][1];
        if (nx >= 0 && nx < w && ny < h) buf[ny * w + nx] += e * k[j][2];
      }
    }
  }
  return o;
}

/** Dilates a 1-bit render via nearest-neighbor: the screen grows without deforming. */
export function expand(bits: ArrayLike<number>, dW: number, dH: number, W: number, H: number): Uint8ClampedArray {
  const o = new Uint8ClampedArray(W * H);
  const kx = dW / W, ky = dH / H;
  for (let y = 0; y < H; y++) {
    const row = Math.min(dH - 1, (y * ky) | 0) * dW;
    const out = y * W;
    for (let x = 0; x < W; x++) o[out + x] = bits[row + Math.min(dW - 1, (x * kx) | 0)];
  }
  return o;
}
