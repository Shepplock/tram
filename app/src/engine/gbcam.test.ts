import { describe, expect, it } from 'vitest';
import { gbBlock, gbQuant } from './gbcam';

const flat = (w: number, h: number, v: number) => new Float32Array(w * h).fill(v);

describe('gbBlock', () => {
  it('renders the four expected densities at 3x3', () => {
    const b = gbBlock(3);
    const pct = b.counts.map(k => Math.round((100 * k) / 9));
    expect(pct).toEqual([100, 44, 22, 0]);
  });
});

describe('gbQuant', () => {
  it('respects the width: 128px * 3 = 384', () => {
    const r = gbQuant(flat(128, 40, 128), 128, 40, 3);
    expect(r.W).toBe(384);
    expect(r.H).toBe(120);
  });

  it('pure black gives 100%, pure white gives 0%', () => {
    const noir = gbQuant(flat(32, 8, 0), 32, 8, 3).pct;
    const blanc = gbQuant(flat(32, 8, 255), 32, 8, 3).pct;
    expect(noir).toBe(100);
    expect(blanc).toBe(0);
  });
});
