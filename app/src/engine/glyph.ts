import { createCanvas } from './canvas';
import { BAYER8 } from './kernels';
import type { ToneSettings } from './types';

const MONO = 'ui-monospace,"SF Mono",SFMono-Regular,Menlo,Consolas,monospace';

type GlyphFn = (ctx: CanvasRenderingContext2D, x: number, y: number, c: number) => void;

const GLYPHS: GlyphFn[] = [
  () => {},
  (x, X, Y, c) => { x.beginPath(); x.arc(X + c / 2, Y + c / 2, c * 0.14, 0, 7); x.fill(); },
  (x, X, Y, c) => { const m = c * 0.36; x.fillRect(X + m, Y + m, c - 2 * m, c - 2 * m); },
  (x, X, Y, c) => { const m = c * 0.28; x.lineWidth = Math.max(1, c * 0.10); x.beginPath(); x.arc(X + c / 2, Y + c / 2, (c - 2 * m) / 2, 0, 7); x.stroke(); },
  (x, X, Y, c) => { const w = Math.max(1, c * 0.13); x.fillRect(X + c / 2 - w / 2, Y + c * 0.2, w, c * 0.6); x.fillRect(X + c * 0.2, Y + c / 2 - w / 2, c * 0.6, w); },
  (x, X, Y, c) => { x.lineWidth = Math.max(1, c * 0.15); x.beginPath(); x.moveTo(X + c * 0.15, Y + c * 0.15); x.lineTo(X + c * 0.85, Y + c * 0.85); x.stroke(); },
  (x, X, Y, c) => { x.lineWidth = Math.max(1, c * 0.13); x.beginPath(); x.moveTo(X + c * 0.18, Y + c * 0.18); x.lineTo(X + c * 0.82, Y + c * 0.82); x.moveTo(X + c * 0.82, Y + c * 0.18); x.lineTo(X + c * 0.18, Y + c * 0.82); x.stroke(); },
  (x, X, Y, c) => { const m = c * 0.14; x.lineWidth = Math.max(1, c * 0.14); x.beginPath(); x.arc(X + c / 2, Y + c / 2, (c - 2 * m) / 2, 0, 7); x.stroke(); },
  (x, X, Y, c) => { const m = c * 0.14; x.lineWidth = Math.max(1, c * 0.14); x.strokeRect(X + m, Y + m, c - 2 * m, c - 2 * m); },
  (x, X, Y, c) => { x.beginPath(); x.arc(X + c / 2, Y + c / 2, c * 0.28, 0, 7); x.fill(); },
  (x, X, Y, c) => { const h = c / 2; x.fillRect(X, Y, h, h); x.fillRect(X + h, Y + h, h, h); },
  (x, X, Y, c) => { x.beginPath(); x.arc(X + c / 2, Y + c / 2, c * 0.40, 0, 7); x.fill(); },
  (x, X, Y, c) => { const m = c * 0.10; x.fillRect(X + m, Y + m, c - 2 * m, c - 2 * m); },
  (x, X, Y, c) => { x.fillRect(X, Y, c, c); x.save(); x.fillStyle = '#fff'; x.beginPath(); x.arc(X + c / 2, Y + c / 2, c * 0.20, 0, 7); x.fill(); x.restore(); },
  (x, X, Y, c) => { x.fillRect(X, Y, c, c); },
  (x, X, Y, c) => { const m = c * 0.10; x.lineWidth = Math.max(1, c * 0.22); x.beginPath(); x.arc(X + c / 2, Y + c / 2, (c - 2 * m) / 2, 0, 7); x.stroke(); },
  (x, X, Y, c) => { x.beginPath(); x.moveTo(X + c * 0.5, Y + c * 0.12); x.lineTo(X + c * 0.9, Y + c * 0.88); x.lineTo(X + c * 0.1, Y + c * 0.88); x.closePath(); x.fill(); },
  (x, X, Y, c) => { x.fillRect(X, Y + c / 2, c, c / 2); },
  (x, X, Y, c) => { const h = Math.max(1, c * 0.16); for (let k = 0; k < 3; k++) x.fillRect(X, Y + c * (0.12 + k * 0.30), c, h); },
];

let gcan: ReturnType<typeof createCanvas> | null = null;
let gctx: CanvasRenderingContext2D | null = null;
function getG() {
  if (!gcan) {
    gcan = createCanvas();
    gctx = gcan.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
  }
  return { gcan, gctx: gctx as CanvasRenderingContext2D };
}

function inkOfDraw(fn: GlyphFn, c: number): number {
  const { gcan, gctx } = getG();
  gcan.width = c; gcan.height = c;
  gctx.fillStyle = '#fff'; gctx.fillRect(0, 0, c, c);
  gctx.fillStyle = '#000'; gctx.strokeStyle = '#000';
  fn(gctx, 0, 0, c);
  const d = gctx.getImageData(0, 0, c, c).data;
  let s = 0;
  for (let i = 0; i < d.length; i += 4) s += (255 - d[i]) / 255;
  return s / (c * c);
}

let TIERS: number[][] | null = null;
let TW: number[] | null = null;

function buildTiers(): void {
  const w = GLYPHS.map(g => inkOfDraw(g, 24));
  const idx = w.map((_v, i) => i).sort((a, b) => w[a] - w[b]);
  const tiers: number[][] = [];
  let buf = [idx[0]];
  for (let i = 1; i < idx.length; i++) {
    if (w[idx[i]] - w[buf[0]] > 0.07) { tiers.push(buf); buf = [idx[i]]; } else buf.push(idx[i]);
  }
  tiers.push(buf);
  TIERS = tiers;
  TW = tiers.map(t => t.reduce((a, i) => a + w[i], 0) / t.length);
}

const CHARS = " .'`^\",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";

/** Collapses whitespace/newlines to single spaces so the `lyrics` style can
 *  walk a flat character stream with no line-break special-casing. */
export function flattenLyrics(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

interface Ramp {
  list: { ch: string; ink: number }[];
  adv: number;
  F: number;
  h: number;
}
let ramp: Ramp | null = null;
let rampF = 0;

function buildRamp(F: number): Ramp {
  const { gcan, gctx } = getG();
  gcan.width = 8; gcan.height = 8;
  gctx.font = 'bold ' + F + 'px ' + MONO;
  const adv = gctx.measureText('M').width;
  const w = Math.max(2, Math.ceil(adv)), h = Math.max(2, Math.ceil(F * 1.25));
  const out: { ch: string; ink: number }[] = [];
  for (const ch of CHARS) {
    gcan.width = w; gcan.height = h;
    gctx.fillStyle = '#fff'; gctx.fillRect(0, 0, w, h);
    gctx.fillStyle = '#000'; gctx.font = 'bold ' + F + 'px ' + MONO; gctx.textBaseline = 'alphabetic';
    gctx.fillText(ch, 0, F * 0.88);
    const d = gctx.getImageData(0, 0, w, h).data;
    let s = 0;
    for (let i = 0; i < d.length; i += 4) s += (255 - d[i]) / 255;
    out.push({ ch, ink: s / (w * h) });
  }
  out.sort((a, b) => a.ink - b.ink);
  ramp = { list: out, adv, F, h };
  rampF = F;
  return ramp;
}

/** Background stipple density for the period tier (0.06-0.15 ink) — kept
 *  well below the first letter tier's density so the blank->period->letter
 *  ramp keeps climbing smoothly. */
const PERIOD_DENSITY = 0.0625;

/** Background stipple density per lyrics letter-tier (see the comment at
 *  the call site for why this isn't evenly spaced). Only the first entry
 *  changed from the original tuning (was 0, a flat-white tier) — the rest
 *  keep the spacing already verified to climb monotonically through the
 *  black/white letter-color flip. */
const LYRICS_DENSITIES = [0.0625, 0.125, 0.25, 0.375, 0.4375, 0.625, 0.75, 0.875];

/** Fills a cell with a Bayer-dithered black/white stipple at the given
 *  density (0-1 fraction of pixels turned black). BAYER8 is a permutation of
 *  0-63, so thresholding it at `density * 64` selects exactly that fraction
 *  of cells (8x8 gives finer-grained density steps than the 4x4 BAYER matrix
 *  would) — the printer is strictly 1-bit, so "grey" has to be an actual
 *  dot pattern rather than a flat pixel value. */
function stippleCell(x: CanvasRenderingContext2D, x0: number, y0: number, C: number, density: number): void {
  x.fillStyle = '#fff'; x.fillRect(x0, y0, C, C);
  x.fillStyle = '#000';
  const threshold = density * 64;
  for (let yy = 0; yy < C; yy++) {
    for (let xx = 0; xx < C; xx++) {
      if (BAYER8[yy % 8][xx % 8] < threshold) x.fillRect(x0 + xx, y0 + yy, 1, 1);
    }
  }
}

/** Renders the image as shapes or characters, then thresholds to 1 bit. */
export function glyphRender(g: Float32Array, W: number, H: number, st: ToneSettings): Uint8ClampedArray {
  const C = Math.max(st.algo === 'lyrics' ? 16 : st.algo === 'ascii' ? 9 : 4, st.cell || 8);
  const c = createCanvas();
  c.width = W; c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
  x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#000'; x.strokeStyle = '#000';

  const cellInk = (x0: number, y0: number, cw: number, chh: number): number => {
    let s = 0, n = 0;
    for (let yy = y0; yy < Math.min(y0 + chh, H); yy++) {
      for (let xx = x0; xx < Math.min(x0 + cw, W); xx++) { s += g[yy * W + xx]; n++; }
    }
    return n ? 1 - (s / n) / 255 : 0;
  };

  if (st.algo === 'ascii') {
    if (!ramp || rampF !== C) buildRamp(C);
    const r = ramp as Ramp;
    const A = Math.max(2, r.adv), LH = Math.max(2, C * 1.05);
    x.font = 'bold ' + C + 'px ' + MONO; x.textBaseline = 'alphabetic';
    const lo = r.list[0].ink, hi = r.list[r.list.length - 1].ink;
    for (let cy = 0; cy * LH < H; cy++) {
      for (let cx = 0; cx * A < W; cx++) {
        const ink = cellInk(Math.round(cx * A), Math.round(cy * LH), Math.round(A), Math.round(LH));
        const t = lo + (hi - lo) * ink;
        let best = 0, bd = 9;
        for (let k = 0; k < r.list.length; k++) {
          const d = Math.abs(r.list[k].ink - t);
          if (d < bd) { bd = d; best = k; }
        }
        x.fillText(r.list[best].ch, cx * A, cy * LH + C * 0.88);
      }
    }
  } else if (st.algo === 'lyrics') {
    /* Tone comes from density/weight, not symbol choice: the lyrics must stay
     *  in reading order, so unlike `ascii` this can't pick characters by ink
     *  match. Every non-blank cell gets a Bayer-dithered stipple background
     *  matching its ink tier (this is a thermal printer, so "grey" has to be
     *  an actual dot pattern, not a flat pixel value) — including the period
     *  tier and the very first letter tier, which otherwise would default to
     *  flat white and lose a whole swath of the lighter-to-mid tonal range.
     *  A space from the lyric text itself still consumes a cell, but it
     *  still paints that cell's tier background — only the letter itself is
     *  skipped, so word gaps read as the photo's actual tone rather than as
     *  blank holes punched through it. Letter color flips to white once the
     *  stipple gets darker than the letter itself so it stays legible
     *  against its own background. At the very darkest end the cell goes
     *  true solid black with no letter cut out of it at all — symmetric with
     *  the true-blank tier at the lightest end, and likewise doesn't consume
     *  a character from the lyric stream. */
    const text = (st.lyrics?.text ?? '').toUpperCase();
    x.textAlign = 'center'; x.textBaseline = 'middle';
    const size = Math.round(C * 0.78);
    let pos = 0;
    for (let cy = 0; cy * C < H; cy++) {
      for (let cx = 0; cx * C < W; cx++) {
        const ink = cellInk(cx * C, cy * C, C, C);
        if (ink < 0.06) continue;
        const px = cx * C + C / 2, py = cy * C + C / 2;
        if (ink < 0.15) {
          // Below ~8px a period anti-aliases too faintly to survive the
          // 1-bit threshold below — it would render invisible.
          stippleCell(x, cx * C, cy * C, C, PERIOD_DENSITY);
          x.font = Math.max(8, Math.round(C * 0.5)) + 'px ' + MONO;
          x.fillStyle = '#000';
          x.fillText('.', px, py);
          continue;
        }
        // 9 tiers across 0.15-1.0 (blank+period only get the bottom 0.15 of
        // the range — most of the tonal range is letters, so the image
        // stays recognizable): tIdx 0-7 are letter tiers, tIdx 8 is true
        // black (no letter).
        const tIdx = Math.min(8, Math.floor((ink - 0.15) / (0.85 / 9)));
        if (tIdx === 8) {
          x.fillStyle = '#000';
          x.fillRect(cx * C, cy * C, C, C);
          continue;
        }
        if (!text.length) continue;
        const ch = text[pos % text.length];
        pos++;
        /* Not evenly spaced: a black letter ADDS ink on top of its
         *  background stipple, a white letter CUTS a hole out of its
         *  background stipple, so the two regimes aren't continuous —
         *  stepping the density evenly straight across the black/white
         *  letter-color switch would make one tier read as less ink than the
         *  tier before it. The white-letter side starts at a deliberately
         *  higher density than the black-letter side ended on, so total ink
         *  keeps climbing every tier despite the color flip. */
        const density = LYRICS_DENSITIES[tIdx];
        if (density > 0) stippleCell(x, cx * C, cy * C, C, density);
        if (ch === ' ') continue;
        x.font = 'bold ' + size + 'px ' + MONO;
        x.fillStyle = density < 0.5 ? '#000' : '#fff';
        x.fillText(ch, px, py);
      }
    }
  } else {
    if (!TIERS) buildTiers();
    const tiers = TIERS as number[][], tw = TW as number[];
    for (let cy = 0; cy * C < H; cy++) {
      for (let cx = 0; cx * C < W; cx++) {
        const ink = cellInk(cx * C, cy * C, C, C);
        let k = 0, bd = 9;
        for (let t = 0; t < tw.length; t++) {
          const d = Math.abs(tw[t] - ink);
          if (d < bd) { bd = d; k = t; }
        }
        const grp = tiers[k];
        const pick = grp[(cx * 7919 + cy * 104729 + k * 31) % grp.length];
        GLYPHS[pick](x, cx * C, cy * C, C);
      }
    }
  }
  const d = x.getImageData(0, 0, W, H).data;
  const bits = new Uint8ClampedArray(W * H);
  for (let i = 0; i < bits.length; i++) bits[i] = d[i * 4] < 128 ? 0 : 255;
  return bits;
}
