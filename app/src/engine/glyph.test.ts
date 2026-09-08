import { describe, expect, it } from 'vitest';
import { flattenLyrics, glyphRender } from './glyph';
import type { ToneSettings } from './types';

const base: ToneSettings = {
  w: 384, sky: 65, white: 180, floor: 40, gamma: 80, sharp: 14, blur: 0,
  invert: false, algo: 'lyrics', cell: 12, scale: 1, edge: 16, vig: 30,
  gsort: 0, gshear: 0, gseed: 1,
};
const flat = (w: number, h: number, v: number) => new Float32Array(w * h).fill(v);
const ink = (bits: ArrayLike<number>) => {
  let k = 0;
  for (let i = 0; i < bits.length; i++) if (bits[i] < 128) k++;
  return k / bits.length;
};

describe('flattenLyrics', () => {
  it('collapses newlines and runs of whitespace into single spaces', () => {
    expect(flattenLyrics('hello\n\nworld   foo\t bar')).toBe('hello world foo bar');
  });

  it('trims leading/trailing whitespace', () => {
    expect(flattenLyrics('  \n hello \n ')).toBe('hello');
  });
});

describe('glyphRender (lyrics style)', () => {
  const W = 96, H = 96;

  it('a flat white field deposits no ink at all', () => {
    const bits = glyphRender(flat(W, H, 255), W, H, base);
    expect(ink(bits)).toBe(0);
  });

  it('a flat dark field draws lyrics text (some ink present)', () => {
    const st = { ...base, lyrics: { text: 'the quick brown fox jumps over the lazy dog', track: 't', artist: 'a' } };
    const bits = glyphRender(flat(W, H, 40), W, H, st);
    expect(ink(bits)).toBeGreaterThan(0);
  });

  it('missing lyrics selection falls back to blank/dot only — no crash', () => {
    const bits = glyphRender(flat(W, H, 40), W, H, base);
    expect(bits.length).toBe(W * H);
  });

  it('is deterministic — identical inputs never drift frame to frame', () => {
    const st = { ...base, lyrics: { text: 'repeat after me, over and over', track: 't', artist: 'a' } };
    const a = glyphRender(flat(W, H, 60), W, H, st);
    const b = glyphRender(flat(W, H, 60), W, H, st);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('darker images consume and reveal more of the lyrics (more ink)', () => {
    const st = { ...base, lyrics: { text: 'the quick brown fox jumps over the lazy dog', track: 't', artist: 'a' } };
    const dark = ink(glyphRender(flat(W, H, 30), W, H, st));
    const mid = ink(glyphRender(flat(W, H, 150), W, H, st));
    expect(dark).toBeGreaterThan(mid);
  });

  it('renders lowercase lyrics as uppercase letters', () => {
    // ink ~0.412 at v=150 lands in a letter tier (any tier works — rendering
    // should differ only in letter case): bits must match between a
    // lowercase and an already-uppercase source string.
    const lower = { ...base, lyrics: { text: 'hello world', track: 't', artist: 'a' } };
    const upper = { ...base, lyrics: { text: 'HELLO WORLD', track: 't', artist: 'a' } };
    const a = glyphRender(flat(W, H, 150), W, H, lower);
    const b = glyphRender(flat(W, H, 150), W, H, upper);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('grey tiers (mid-dark) are dithered stipples, not solid black or blank', () => {
    // v=95 -> ink = 1 - 95/255 ~= 0.627, inside a mid-range stipple band.
    const st = { ...base, lyrics: { text: 'the quick brown fox jumps over the lazy dog', track: 't', artist: 'a' } };
    const bits = glyphRender(flat(W, H, 95), W, H, st);
    const frac = ink(bits);
    expect(frac).toBeGreaterThan(0.1);
    expect(frac).toBeLessThan(0.9);
  });

  it('true-black tier (darkest) fills cells fully solid black, no letter cut out', () => {
    // v=10 -> ink ~= 0.961, past the true-black cutoff (~0.9056): mirrors the
    // true-blank tier at the other extreme — no letter at all, so the whole
    // flat field renders as fully solid black with zero white pixels.
    const st = { ...base, lyrics: { text: 'the quick brown fox jumps over the lazy dog', track: 't', artist: 'a' } };
    const bits = glyphRender(flat(W, H, 10), W, H, st);
    expect(ink(bits)).toBe(1);
  });

  it('true-black cells do not consume a character from the lyric stream', () => {
    // The first cell (v=10, true black) should be skipped for pointer
    // purposes: the letter drawn in the second (letter-tier) cell should be
    // the lyric's first character, same as if the true-black cell were
    // absent (e.g. replaced by a period cell, which also doesn't consume).
    const C = 16, W2 = C * 2;
    const g = new Float32Array(W2 * H);
    for (let y = 0; y < H; y++) {
      g[y * W2 + 0] = 10; // first cell: true black (ink ~0.961)
      for (let x = 1; x < W2; x++) g[y * W2 + x] = 150; // rest: a letter tier
    }
    const gControl = new Float32Array(W2 * H);
    for (let y = 0; y < H; y++) {
      gControl[y * W2 + 0] = 230; // first cell: period tier (ink ~0.098, pointer-free)
      for (let x = 1; x < W2; x++) gControl[y * W2 + x] = 150;
    }
    const st = { ...base, cell: 16, lyrics: { text: 'ab', track: 't', artist: 'a' } };
    const bits = glyphRender(g, W2, H, st);
    const bitsControl = glyphRender(gControl, W2, H, st);
    // The second cell (the only letter-drawing cell in both renders) should
    // be identical either way: both paths reach it with pos still at 0.
    const secondCell = (arr: Uint8ClampedArray) => {
      const out: number[] = [];
      for (let y = 0; y < H; y++) for (let x = C; x < W2; x++) out.push(arr[y * W2 + x]);
      return out;
    };
    expect(secondCell(bits)).toEqual(secondCell(bitsControl));
  });

  it('period tier deposits a dithered background, not just the dot itself', () => {
    // v=229 -> ink ~= 0.102, squarely in the period band (0.06-0.15). The
    // period glyph alone is tiny (a handful of pixels); with the new
    // PERIOD_DENSITY stipple the cell should read well above that.
    const st = { ...base, cell: 16, lyrics: { text: 'the quick brown fox jumps over the lazy dog', track: 't', artist: 'a' } };
    const bits = glyphRender(flat(W, H, 229), W, H, st);
    expect(ink(bits)).toBeGreaterThan(0.03);
  });

  it('the first (lightest) letter tier now has a dithered background, not flat white', () => {
    // v=205 -> ink ~= 0.196, the first letter tier (tIdx 0). A lyric of just
    // a space should skip the letter but still show a nonzero stipple —
    // previously this tier's density was 0 and a space rendered fully blank.
    const st = { ...base, cell: 16, lyrics: { text: ' ', track: 't', artist: 'a' } };
    const bits = glyphRender(flat(96, 96, 205), 96, 96, st);
    expect(ink(bits)).toBeGreaterThan(0);
  });

  it('a lyric space inside a stippled tier still paints the tier background, not a blank hole', () => {
    // v=84 -> ink ~= 0.671, a mid stipple tier (density 0.625). A lyric
    // consisting of just a space should skip the letter but still show the
    // dithered background — not render as a fully blank/white cell.
    const st = { ...base, cell: 16, lyrics: { text: ' ', track: 't', artist: 'a' } };
    const bits = glyphRender(flat(96, 96, 84), 96, 96, st);
    expect(ink(bits)).toBeGreaterThan(0.3);
    expect(ink(bits)).toBeLessThan(0.9);
  });

  it('walks through 9 distinct, monotonically increasing tier ink levels', () => {
    // One value per tier (t=0..7: white-bg, 7-step grey stipple ramp; t=8:
    // true black), each chosen to land mid-band. ink = 1 - v/255, so v
    // descends as the tier darkens.
    const st = { ...base, lyrics: { text: 'the quick brown fox jumps over the lazy dog', track: 't', artist: 'a' } };
    const vs = [205, 181, 157, 132, 108, 84, 60, 36, 12];
    const fracs = vs.map(v => ink(glyphRender(flat(W, H, v), W, H, st)));
    for (let i = 1; i < fracs.length; i++) expect(fracs[i]).toBeGreaterThan(fracs[i - 1]);
    expect(fracs[fracs.length - 1]).toBe(1); // true-black tier: fully solid
  });

  it('gives most of the tonal range to letters, not blank/period', () => {
    // Across a full black-to-white gradient, blank+period cells (no letter
    // drawn at all) should be a small minority of columns — most of the
    // range needs to actually draw lyric text for the image to stay
    // recognizable, not just fall back to blank/dot.
    const gradW = 288; // 18 cells at the 16px lyrics floor
    const g = new Float32Array(gradW * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < gradW; x++) g[y * gradW + x] = (x / (gradW - 1)) * 255;
    }
    const st = { ...base, lyrics: { text: 'the quick brown fox jumps over the lazy dog', track: 't', artist: 'a' } };
    const bits = glyphRender(g, gradW, H, st);
    const C = 16;
    let blankOrPeriodCols = 0, totalCols = 0;
    for (let cx = 0; cx * C < gradW; cx++) {
      totalCols++;
      let black = 0;
      for (let yy = 0; yy < C; yy++) for (let xx = 0; xx < C; xx++) {
        if (bits[yy * gradW + cx * C + xx] < 128) black++;
      }
      // A period or blank cell deposits at most a few dark pixels (a single
      // small dot); a letter cell deposits far more (bold, ~0.78*C tall).
      if (black < 5) blankOrPeriodCols++;
    }
    expect(blankOrPeriodCols / totalCols).toBeLessThan(0.34);
  });

  it('enforces a 16px cell floor regardless of a smaller cell setting', () => {
    const st = { ...base, cell: 8, lyrics: { text: 'abc', track: 't', artist: 'a' } };
    const small = { ...base, cell: 16, lyrics: { text: 'abc', track: 't', artist: 'a' } };
    const a = glyphRender(flat(W, H, 150), W, H, st);
    const b = glyphRender(flat(W, H, 150), W, H, small);
    expect(Array.from(a)).toEqual(Array.from(b));
  });
});
