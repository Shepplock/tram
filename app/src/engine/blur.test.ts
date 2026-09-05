import { describe, expect, it } from 'vitest';
import { boxBlur } from './blur';

const flat = (w: number, h: number, v: number) => new Float32Array(w * h).fill(v);

describe('boxBlur', () => {
  it('radius 0 returns the source unchanged (same reference)', () => {
    const g = flat(8, 8, 100);
    expect(boxBlur(g, 8, 8, 0)).toBe(g);
  });

  it('preserves a uniform area', () => {
    const o = boxBlur(flat(16, 16, 128), 16, 16, 2);
    let mn = Infinity, mx = -Infinity;
    for (const v of o) { mn = Math.min(mn, v); mx = Math.max(mx, v); }
    expect(mx - mn).toBeCloseTo(0, 5);
  });

  it('produces no NaN or out-of-range values at the edges', () => {
    const g = new Float32Array(32 * 8);
    for (let i = 0; i < g.length; i++) g[i] = (i % 32) * 8;
    for (const r of [1, 2, 3]) {
      for (const v of boxBlur(g, 32, 8, r)) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(255);
      }
    }
  });
});
