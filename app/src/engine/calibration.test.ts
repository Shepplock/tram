import { describe, expect, it } from 'vitest';
import { refCoverage, solveComp } from './calibration';

describe('solveComp', () => {
  it('a neutral printer needs zero compensation', () => {
    expect(solveComp(50)).toBe(0);
  });

  it('a darkening printer needs negative compensation', () => {
    expect(solveComp(30)).toBeLessThan(0);
  });

  it('compensation varies monotonically across steps', () => {
    let prev = -Infinity;
    for (const v of [20, 30, 40, 50, 60, 70, 80]) {
      const c = solveComp(v);
      expect(c).toBeGreaterThanOrEqual(prev);
      prev = c;
    }
  });
});

describe('refCoverage', () => {
  it('decreases as the white point drops', () => {
    expect(refCoverage(120)).toBeLessThan(refCoverage(220));
  });
});
