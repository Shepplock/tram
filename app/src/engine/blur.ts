/** Separable box blur over a flat greyscale buffer, using a running sum so
 *  cost stays O(w*h) regardless of radius. */
export function boxBlur(g: Float32Array, w: number, h: number, r: number): Float32Array {
  if (r <= 0) return g;
  const t = new Float32Array(g.length);
  const o = new Float32Array(g.length);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let sum = 0, n = 0;
    for (let x = 0; x <= r && x < w; x++) { sum += g[row + x]; n++; }
    for (let x = 0; x < w; x++) {
      o[row + x] = sum / n;
      const a = x + r + 1, b = x - r;
      if (a < w) { sum += g[row + a]; n++; }
      if (b >= 0) { sum -= g[row + b]; n--; }
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0, n = 0;
    for (let y = 0; y <= r && y < h; y++) { sum += o[y * w + x]; n++; }
    for (let y = 0; y < h; y++) {
      t[y * w + x] = sum / n;
      const a = y + r + 1, b = y - r;
      if (a < h) { sum += o[a * w + x]; n++; }
      if (b >= 0) { sum -= o[b * w + x]; n--; }
    }
  }
  return t;
}
