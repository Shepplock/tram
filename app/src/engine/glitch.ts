/**
 * Glitch is a pre-processing step, not a screen: it deforms the image before
 * it enters any of the twelve dither algorithms, so it composes with all of
 * them. Convenient property: sort and shift are pure permutations of pixels,
 * so the mean never moves — these effects cost no extra ink.
 */
export function mulberry(seed: number): () => number {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Threshold expressed as a percentile: the setting self-adapts to each
 *  photo instead of doing nothing on a light image and everything on a dark one. */
export function percentile(g: ArrayLike<number>, pct: number): number {
  const hist = new Int32Array(256);
  for (let i = 0; i < g.length; i++) hist[Math.max(0, Math.min(255, g[i] | 0))]++;
  const want = g.length * pct / 100;
  let acc = 0;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= want) return v;
  }
  return 255;
}

/** Pixel sort: runs below the threshold are sorted along the row. They
 *  stretch into smooth gradients, which the screen renders as long streaks. */
export function pixelSort(g: Float32Array, w: number, h: number, pct: number, seed: number): Float32Array {
  const thresh = percentile(g, pct), rnd = mulberry(seed), MAXRUN = 280;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let x = 0;
    while (x < w) {
      if (g[row + x] < thresh) {
        let x2 = x;
        while (x2 < w && g[row + x2] < thresh && (x2 - x) < MAXRUN) x2++;
        if (x2 - x > 4) {
          const seg = g.slice(row + x, row + x2);
          seg.sort();
          if (rnd() < 0.5) seg.reverse();
          g.set(seg, row + x);
        }
        x = x2;
      } else x++;
    }
  }
  return g;
}

/** Horizontal band shift: the break, the image derailing. */
export function rowShear(g: Float32Array, w: number, h: number, amp: number, seed: number): Float32Array {
  const rnd = mulberry(seed ^ 0x9E37), bands = Math.max(4, Math.round(h / 34));
  const buf = new Float32Array(w);
  for (let b = 0; b < bands; b++) {
    const y0 = Math.floor(rnd() * Math.max(1, h - 4));
    const hh = 3 + Math.floor(rnd() * 26);
    const d = Math.round((rnd() * 2 - 1) * amp);
    if (!d) continue;
    for (let y = y0; y < Math.min(h, y0 + hh); y++) {
      buf.set(g.subarray(y * w, (y + 1) * w));
      for (let x = 0; x < w; x++) g[y * w + x] = buf[((x - d) % w + w) % w];
    }
  }
  return g;
}
