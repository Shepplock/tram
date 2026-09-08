import { createCanvas } from '@napi-rs/canvas';
import { describe, expect, it } from 'vitest';
import { process } from './process';
import { solveWhite } from './whitepoint';
import type { ProcessInput, ToneSettings } from './types';

// A 240x180 canvas with a black-to-white horizontal gradient — the same
// synthetic source tests.html used to exercise the full pipeline.
const srcCanvas = (() => {
  const c = createCanvas(240, 180);
  const x = c.getContext('2d');
  const grad = x.createLinearGradient(0, 0, 240, 0);
  grad.addColorStop(0, '#000');
  grad.addColorStop(1, '#fff');
  x.fillStyle = grad;
  x.fillRect(0, 0, 240, 180);
  return c;
})();

const base: ToneSettings = {
  w: 384, sky: 65, white: 180, floor: 40, gamma: 80, sharp: 14, blur: 0,
  invert: false, algo: 'fs', cell: 8, scale: 1, edge: 16, vig: 30,
  gsort: 0, gshear: 0, gseed: 1,
};

function call(over: Partial<ToneSettings>) {
  return process({
    source: srcCanvas as unknown as ProcessInput['source'],
    crop: { x: 0, y: 0, w: 240, h: 180 },
    st: { ...base, ...over },
  });
}

describe('process', () => {
  it('renders the requested paper width', () => {
    const r = call({});
    expect(r.W).toBe(384);
    expect(r.H).toBe(288);
  });

  it('lowering the white point always lightens (more ink)', () => {
    const a = call({ white: 240 }).pct;
    const b = call({ white: 120 }).pct;
    expect(b).toBeLessThan(a);
  });

  it('the guaranteed-blank clip zone never contains ink', () => {
    const r = call({ white: 150, clip: true });
    expect(r.clipHi).toBeDefined();
    for (let i = 0; i < r.bits.length; i++) {
      if (r.clipHi![i]) expect(r.bits[i]).toBeGreaterThanOrEqual(128);
    }
  });

  it('zero glitch leaves the image unchanged', () => {
    const a = call({ gsort: 0, gshear: 0 }).pct;
    const b = call({}).pct;
    expect(Math.abs(a - b)).toBeLessThanOrEqual(0.001);
  });

  it('glitch does not cost significantly more ink', () => {
    const a = call({}).pct;
    const b = call({ gsort: 55, gshear: 18, gseed: 3 }).pct;
    expect(Math.abs(b - a)).toBeLessThanOrEqual(1.5);
  });

  it('scale grows the grain without density drift', () => {
    const a = call({ scale: 1 }).pct;
    const b = call({ scale: 3 }).pct;
    expect(Math.abs(b - a)).toBeLessThanOrEqual(6);
  });

  it('invert roughly swaps ink and paper', () => {
    const a = call({ floor: 0, white: 200 }).pct;
    const b = call({ floor: 0, white: 200, invert: true }).pct;
    expect(Math.abs(a + b - 100)).toBeLessThanOrEqual(12);
  });

  it('ASCII ignores the floor setting (it was smothering coverage)', () => {
    const a = call({ algo: 'ascii', cell: 12, floor: 0 }).pct;
    const b = call({ algo: 'ascii', cell: 12, floor: 60 }).pct;
    expect(Math.abs(a - b)).toBeLessThanOrEqual(0.5);
  });

  it('lyrics uses its own floor, separate from the shared floor setting', () => {
    const lyrics = { text: 'the quick brown fox jumps over the lazy dog', track: 't', artist: 'a' };
    // The shared `floor` should have zero effect on lyrics coverage...
    const a = call({ algo: 'lyrics', floor: 0, lyricsFloor: 40, lyrics }).pct;
    const b = call({ algo: 'lyrics', floor: 60, lyricsFloor: 40, lyrics }).pct;
    expect(Math.abs(a - b)).toBeLessThanOrEqual(0.5);
    // ...while lyricsFloor itself still has the expected effect (a lower
    // floor unlocks darker tiers, raising ink coverage).
    const low = call({ algo: 'lyrics', floor: 40, lyricsFloor: 0, lyrics }).pct;
    const high = call({ algo: 'lyrics', floor: 40, lyricsFloor: 60, lyrics }).pct;
    expect(low).toBeGreaterThan(high);
  });

  it("switching away from lyrics doesn't carry its floor into other styles", () => {
    // A style other than lyrics/ascii should be fully governed by `floor`,
    // regardless of whatever lyricsFloor happens to be set to.
    const a = call({ algo: 'fs', floor: 40, lyricsFloor: 0 }).pct;
    const b = call({ algo: 'fs', floor: 40, lyricsFloor: 70 }).pct;
    expect(Math.abs(a - b)).toBeLessThanOrEqual(0.001);
  });

  it('grid styles ignore the scale slider', () => {
    const a = call({ algo: 'glyphes', cell: 8, scale: 1 }).pct;
    const b = call({ algo: 'glyphes', cell: 8, scale: 4 }).pct;
    expect(Math.abs(a - b)).toBeLessThanOrEqual(0.5);
  });

  it('GB Cam width is a multiple of 128', () => {
    const r = call({ algo: 'gbcam' });
    expect(r.W % 128).toBe(0);
  });

  it('all thirteen styles produce a valid, non-degenerate image', () => {
    const algos: ToneSettings['algo'][] = [
      'fs', 'atkinson', 'stucki', 'jarvis', 'bayer', 'bayer8', 'bluenoise',
      'halftone', 'seuil', 'glyphes', 'ascii', 'gbcam', 'lyrics',
    ];
    for (const a of algos) {
      const over: Partial<ToneSettings> = { algo: a, white: 210 };
      if (a === 'lyrics') over.lyrics = { text: 'the quick brown fox jumps over the lazy dog', track: 't', artist: 'a' };
      const r = call(over);
      expect(r.bits.length).toBeGreaterThan(0);
      expect(r.pct).toBeGreaterThan(0);
      expect(r.pct).toBeLessThan(100);
    }
  });
});

describe('solveWhite', () => {
  const o: ProcessInput = { source: srcCanvas as unknown as ProcessInput['source'], crop: { x: 0, y: 0, w: 240, h: 180 }, st: base };

  it('brings coverage to the target', () => {
    const r = solveWhite(o, base, 16);
    expect(Math.abs(r.pct - 16)).toBeLessThanOrEqual(2.5);
  });

  it('converges regardless of the starting point', () => {
    for (const st of [{ ...base, floor: 0, gamma: 100 }, { ...base, floor: 55, gamma: 60 }]) {
      const r = solveWhite(o, st, 16);
      if (!r.capped) expect(Math.abs(r.pct - 16)).toBeLessThanOrEqual(3);
      if (r.capped) expect(r.white <= 51 || r.white >= 254).toBe(true);
    }
  });

  it('a darker target requires a higher white point', () => {
    expect(solveWhite(o, base, 30).white).toBeGreaterThan(solveWhite(o, base, 10).white);
  });
});
