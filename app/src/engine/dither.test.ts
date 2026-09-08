import { describe, expect, it } from 'vitest';
import { dither, expand } from './dither';
import { buildBlueNoise } from './kernels';

const flat = (w: number, h: number, v: number) => new Float32Array(w * h).fill(v);
const ink = (bits: ArrayLike<number>) => {
  let k = 0;
  for (let i = 0; i < bits.length; i++) if (bits[i] < 128) k++;
  return k / bits.length;
};

describe('dither', () => {
  const ALGOS = ['fs', 'atkinson', 'stucki', 'jarvis', 'bayer', 'bayer8', 'bluenoise', 'halftone'] as const;

  for (const algo of ALGOS) {
    it(`${algo}: a flat 25% grey field deposits ~75% ink`, () => {
      const b = dither(flat(48, 48, 255 * 0.25), 48, 48, algo);
      expect(ink(b)).toBeCloseTo(0.75, algo === 'atkinson' ? 0 : 1);
      const tol = algo === 'atkinson' ? 0.16 : 0.05;
      expect(Math.abs(ink(b) - 0.75)).toBeLessThanOrEqual(tol);
    });
  }

  it('seuil renders only pure black or white, no halftone', () => {
    const b = dither(flat(20, 20, 200), 20, 20, 'seuil');
    expect(ink(b)).toBe(0);
  });

  it('bayer8 offers finer gradation than bayer4', () => {
    const d4 = new Set<number>(), d8 = new Set<number>();
    for (let v = 0; v <= 255; v += 4) {
      d4.add(Math.round(ink(dither(flat(16, 16, v), 16, 16, 'bayer')) * 1000));
      d8.add(Math.round(ink(dither(flat(16, 16, v), 16, 16, 'bayer8')) * 1000));
    }
    expect(d8.size).toBeGreaterThan(d4.size);
  });

  it('pure white never deposits ink, for any algorithm', () => {
    for (const a of ['fs', 'atkinson', 'stucki', 'jarvis', 'bayer', 'bayer8', 'bluenoise', 'halftone', 'vinyl']) {
      expect(ink(dither(flat(24, 24, 255), 24, 24, a))).toBe(0);
    }
  });

  it('blue noise is deterministic — no flicker across calls', () => {
    const a = dither(flat(40, 40, 120), 40, 40, 'bluenoise');
    const b = dither(flat(40, 40, 120), 40, 40, 'bluenoise');
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('the blue noise tile is a full permutation', () => {
    const M = buildBlueNoise();
    const seen = new Set(M);
    expect(seen.size).toBe(64 * 64);
  });

  it('halftone clusters dots instead of scattering them', () => {
    const iso = (bits: ArrayLike<number>) => {
      const w = 64;
      let n = 0;
      for (let y = 1; y < 63; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = y * w + x;
          if (bits[i] >= 128) continue;
          let v = 0;
          for (const d of [-1, 1, -w, w]) if (bits[i + d] < 128) v++;
          if (!v) n++;
        }
      }
      return n;
    };
    const g = flat(64, 64, 255 * 0.85);
    expect(iso(dither(g, 64, 64, 'halftone'))).toBeLessThan(iso(dither(g, 64, 64, 'fs')));
  });

  it('vinyl fades its groove contrast toward the center, like a record label', () => {
    const W = 120, H = 120, cx = W / 2, cy = H / 2;
    const b = dither(flat(W, H, 100), W, H, 'vinyl');
    const inkIn = (rMin: number, rMax: number) => {
      let hit = 0, total = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const r = Math.hypot(x - cx, y - cy);
          if (r < rMin || r >= rMax) continue;
          total++;
          if (b[y * W + x] < 128) hit++;
        }
      }
      return hit / total;
    };
    // The groove geometry is identical everywhere, but near the center most
    // of its ink is dithered away (opacity fade), leaving only a sparse
    // dusting. Far out, the groove is at full opacity — solid wherever the
    // spiral geometry calls for ink.
    expect(inkIn(0, 15)).toBeLessThan(0.15);
    expect(inkIn(50, 60)).toBeGreaterThan(0.3);
  });
});

describe('expand', () => {
  it('doubles dimensions without changing density', () => {
    const w = 20, h = 12;
    const src = dither(flat(w, h, 128), w, h, 'fs');
    const big = expand(src, w, h, w * 2, h * 2);
    expect(big.length).toBe(w * 2 * h * 2);
    expect(Math.abs(ink(big) - ink(src))).toBeLessThanOrEqual(0.02);
  });

  it('copies faithfully via nearest-neighbor', () => {
    const src = new Uint8ClampedArray([0, 255, 255, 0]);
    const big = expand(src, 2, 2, 4, 4);
    const want = [0, 0, 255, 255, 0, 0, 255, 255, 255, 255, 0, 0, 255, 255, 0, 0];
    expect(Array.from(big)).toEqual(want);
  });
});
