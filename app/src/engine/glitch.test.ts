import { describe, expect, it } from 'vitest';
import { percentile, pixelSort, rowShear } from './glitch';

function noisy(): Float32Array {
  const g = new Float32Array(200 * 140);
  for (let y = 0; y < 140; y++) {
    for (let x = 0; x < 200; x++) {
      g[y * 200 + x] = 90 + 90 * Math.sin(x / 13) * Math.cos(y / 9) + ((x * y) % 37);
    }
  }
  return g;
}
const avg = (g: ArrayLike<number>) => {
  let s = 0;
  for (let i = 0; i < g.length; i++) s += g[i];
  return s / g.length;
};

describe('pixelSort', () => {
  it('does not change the mean (pure permutation)', () => {
    const a = avg(noisy());
    const b = avg(pixelSort(noisy(), 200, 140, 50, 7));
    expect(Math.abs(b - a)).toBeLessThanOrEqual(0.001);
  });

  it('same seed, same glitch — no flicker', () => {
    const a = pixelSort(noisy(), 200, 140, 50, 42);
    const b = pixelSort(noisy(), 200, 140, 50, 42);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('a different seed gives a different glitch', () => {
    const a = pixelSort(noisy(), 200, 140, 50, 42);
    const b = pixelSort(noisy(), 200, 140, 50, 43);
    expect(Array.from(a)).not.toEqual(Array.from(b));
  });
});

describe('rowShear', () => {
  it('does not change the mean', () => {
    const a = avg(noisy());
    const b = avg(rowShear(noisy(), 200, 140, 30, 7));
    expect(Math.abs(b - a)).toBeLessThanOrEqual(0.001);
  });
});

describe('percentile', () => {
  it('tracks the image distribution', () => {
    const g = noisy();
    const lo = percentile(g, 10), mid = percentile(g, 50), hi = percentile(g, 90);
    expect(lo).toBeLessThan(mid);
    expect(mid).toBeLessThan(hi);
  });
});
