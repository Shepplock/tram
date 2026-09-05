import type { ProcessResult } from './types';

/** Paints an engine result onto a canvas. Clip masks (if present) are
 *  tinted — preview-only, never at export, since only the preview path
 *  requests those masks. */
export function paint(canvas: HTMLCanvasElement, r: ProcessResult): void {
  canvas.width = r.W;
  canvas.height = r.H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(r.W, r.H);
  const hi = r.clipHi, lo = r.clipLo;
  for (let i = 0; i < r.bits.length; i++) {
    const p = i * 4, v = r.bits[i];
    if (hi && hi[i]) { img.data[p] = 120; img.data[p + 1] = 190; img.data[p + 2] = 255; }
    else if (lo && lo[i]) { img.data[p] = 220; img.data[p + 1] = 60; img.data[p + 2] = 60; }
    else { img.data[p] = img.data[p + 1] = img.data[p + 2] = v; }
    img.data[p + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

export interface CoverageVerdict {
  className: 'verdict' | 'verdict warn';
  text: string;
}

export function coverageVerdict(pct: number): CoverageVerdict {
  if (pct > 30) return { className: 'verdict warn', text: 'Far too dense — the paper will buckle.' };
  if (pct > 22) return { className: 'verdict warn', text: 'A little dark. Lower the white point.' };
  if (pct >= 12) return { className: 'verdict', text: 'In the zone. Check the sky is blank.' };
  if (pct >= 6) return { className: 'verdict warn', text: 'Very light — the subject may vanish.' };
  return { className: 'verdict warn', text: 'Almost nothing will print.' };
}
