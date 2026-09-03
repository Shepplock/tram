import { dither } from './dither';

/**
 * Calibration. The user prints the test chart, picks the step that looks
 * mid-grey, and we infer how much the printer darkens. Solved by bisection
 * against a reference gradient rather than a formula: the real pipeline
 * decides, so the result follows its non-linearities.
 */
export function refCoverage(white: number): number {
  const W = 120, H = 90;
  const g = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) g[y * W + x] = (x / (W - 1)) * 255;
  const v = new Float32Array(W * H);
  for (let i = 0; i < g.length; i++) {
    const t = Math.max(0, Math.min(1, (g[i] - 20) / Math.max(white - 20, 1)));
    v[i] = (0.40 + Math.pow(t, 0.80) * 0.60) * 255;
  }
  const b = dither(v, W, H, 'fs');
  let k = 0;
  for (let i = 0; i < b.length; i++) if (b[i] < 128) k++;
  return k / b.length;
}

/** midStep = the chart step that prints mid-grey. 50 means the printer is
 *  neutral; lower means it darkens. */
export function solveComp(midStep: number): number {
  const ratio = 50 / Math.max(5, Math.min(95, midStep));
  if (Math.abs(ratio - 1) < 0.02) return 0;
  const base = refCoverage(180);
  const goal = base / ratio;
  let lo = -60, hi = 60;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (refCoverage(180 + mid) > goal) hi = mid; else lo = mid;
  }
  return Math.round((lo + hi) / 2);
}
