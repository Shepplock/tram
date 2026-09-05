import { KERNELS, BAYER, BAYER8, HALFTONE, getBlueNoiseTile, BN_N } from './kernels';
import type { Algo } from './types';

export function dither(g: ArrayLike<number>, w: number, h: number, algo: Algo | string): Uint8ClampedArray {
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
