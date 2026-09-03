import { process } from './process';
import type { ProcessInput, ToneSettings } from './types';

/**
 * Auto white-point solver. Finds the white point that brings coverage to
 * the target, by bisection against the real pipeline rather than a formula:
 * the result accounts for the chosen style, crop, and photo.
 * Runs at half resolution — coverage stays accurate to a tenth of a point
 * for a quarter of the work.
 */
export const WHITE_MIN = 50;
export const WHITE_MAX = 255;

export function solveWhite(o: Omit<ProcessInput, 'st'>, st: ToneSettings, target: number): { white: number; pct: number; capped: boolean } {
  const fast = { ...st, w: Math.max(96, Math.round((st.w || 384) / 2)), clip: false };
  let lo = WHITE_MIN, hi = WHITE_MAX;
  for (let i = 0; i < 10; i++) {
    const mid = Math.round((lo + hi) / 2);
    const r = process({ ...o, st: { ...fast, white: mid } });
    if (r.pct > target) hi = mid; else lo = mid;
  }
  const white = Math.round((lo + hi) / 2);
  /* The target isn't always reachable: at floor zero, or on a very dark
   *  photo, the bounds are hit before it. Return the coverage actually
   *  achieved rather than implying success. */
  const got = process({ ...o, st: { ...fast, white } }).pct;
  return { white, pct: got, capped: white <= WHITE_MIN + 1 || white >= WHITE_MAX - 1 };
}
