import { dither, expand } from '../engine/dither';
import { gbQuant } from '../engine/gbcam';
import { glyphRender } from '../engine/glyph';
import type { Algo, ProcessResult, ToneSettings } from '../engine/types';

/** Renders a black-to-white gradient through one algorithm, at its real
 *  size — the same trick as index.html:2486-2504, so each style button
 *  shows that algorithm's own texture instead of a shared placeholder. */
export function renderSwatch(algo: Algo, W: number, H: number, cell: number, scale: number): ProcessResult {
  const isGrid = algo === 'glyphes' || algo === 'ascii';
  const S = isGrid ? 1 : Math.max(1, scale || 1);
  const dW = Math.max(1, Math.round(W / S));
  const dH = Math.max(1, Math.round(H / S));

  if (algo === 'gbcam') {
    const n = Math.max(2, Math.round(H / 14));
    const gw = Math.max(8, Math.round(W / n));
    const gh = Math.max(4, Math.round(H / n));
    const gg = new Float32Array(gw * gh);
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) gg[y * gw + x] = (x / Math.max(1, gw - 1)) * 255;
    const q = gbQuant(gg, gw, gh, n);
    return { W, H, pct: 0, bits: expand(q.bits, q.W, q.H, W, H) };
  }

  const g = new Float32Array(dW * dH);
  for (let y = 0; y < dH; y++) {
    const row = y * dW;
    for (let x = 0; x < dW; x++) g[row + x] = (x / Math.max(1, dW - 1)) * 255;
  }

  const small = isGrid
    ? glyphRender(g, dW, dH, { algo, cell } as ToneSettings)
    : dither(g, dW, dH, algo);
  const bits = S === 1 ? small : expand(small, dW, dH, W, H);
  return { W, H, pct: 0, bits };
}
