import type { Algo } from './types';

export const KERNELS: Record<string, [number, number, number][]> = {
  fs: [[1, 0, 7 / 16], [-1, 1, 3 / 16], [0, 1, 5 / 16], [1, 1, 1 / 16]],
  atkinson: [[1, 0, .125], [2, 0, .125], [-1, 1, .125], [0, 1, .125], [1, 1, .125], [0, 2, .125]],
  stucki: [
    [1, 0, 8 / 42], [2, 0, 4 / 42], [-2, 1, 2 / 42], [-1, 1, 4 / 42], [0, 1, 8 / 42], [1, 1, 4 / 42], [2, 1, 2 / 42],
    [-2, 2, 1 / 42], [-1, 2, 2 / 42], [0, 2, 4 / 42], [1, 2, 2 / 42], [2, 2, 1 / 42],
  ],
  jarvis: [
    [1, 0, 7 / 48], [2, 0, 5 / 48], [-2, 1, 3 / 48], [-1, 1, 5 / 48], [0, 1, 7 / 48], [1, 1, 5 / 48], [2, 1, 3 / 48],
    [-2, 2, 1 / 48], [-1, 2, 3 / 48], [0, 2, 5 / 48], [1, 2, 3 / 48], [2, 2, 1 / 48],
  ],
};

export const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

/** Clustered-dot halftone matrix, 8x8, screen angled at 45deg. */
export const HALFTONE = [
  [24, 10, 12, 26, 35, 47, 49, 37], [8, 0, 2, 14, 45, 59, 61, 51],
  [22, 6, 4, 16, 43, 57, 63, 53], [30, 20, 18, 28, 33, 41, 55, 39],
  [34, 46, 48, 38, 25, 11, 13, 27], [44, 58, 60, 50, 9, 1, 3, 15],
  [42, 56, 62, 52, 23, 7, 5, 17], [32, 40, 54, 36, 31, 21, 19, 29],
];

export const BAYER8 = [
  [0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38], [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21],
];

/**
 * Blue noise threshold tile via void-and-cluster (Ulichney). Like Bayer it's
 * a fixed threshold matrix — the screen doesn't shift between frames, which
 * removes the flicker error-diffusion would cause on video — but its
 * spectrum has no visible pattern, so it avoids Bayer's grid look.
 * Built once, lazily, on first use.
 */
export const BN_N = 64;
let BN: Int32Array | null = null;

export function buildBlueNoise(): Int32Array {
  const N = BN_N, T = N * N;
  const M = new Int32Array(T);
  const pat = new Uint8Array(T);
  const E = new Float32Array(T);

  const R = 5, SIG = 1.5;
  const K: [number, number, number][] = [];
  for (let dy = -R; dy <= R; dy++) {
    for (let dx = -R; dx <= R; dx++) {
      K.push([dx, dy, Math.exp(-(dx * dx + dy * dy) / (2 * SIG * SIG))]);
    }
  }

  const bump = (i: number, sign: number) => {
    const x = i % N, y = (i / N) | 0;
    for (let k = 0; k < K.length; k++) {
      const nx = (x + K[k][0] + N) % N, ny = (y + K[k][1] + N) % N;
      E[ny * N + nx] += sign * K[k][2];
    }
  };
  const tightest = () => {
    let best = -1, bv = -Infinity;
    for (let i = 0; i < T; i++) if (pat[i] && E[i] > bv) { bv = E[i]; best = i; }
    return best;
  };
  const largestVoid = () => {
    let best = -1, bv = Infinity;
    for (let i = 0; i < T; i++) if (!pat[i] && E[i] < bv) { bv = E[i]; best = i; }
    return best;
  };

  let seed = 12345;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  let count = 0;
  const want = Math.round(T * 0.1);
  while (count < want) {
    const i = (rnd() * T) | 0;
    if (!pat[i]) { pat[i] = 1; bump(i, 1); count++; }
  }

  for (;;) {
    const c = tightest();
    pat[c] = 0; bump(c, -1);
    const v = largestVoid();
    if (v === c) { pat[c] = 1; bump(c, 1); break; }
    pat[v] = 1; bump(v, 1);
  }

  const initial = Uint8Array.from(pat);
  let rank = count - 1;
  while (rank >= 0) {
    const c = tightest();
    pat[c] = 0; bump(c, -1);
    M[c] = rank--;
  }

  pat.set(initial);
  E.fill(0);
  for (let i = 0; i < T; i++) if (pat[i]) bump(i, 1);
  rank = count;
  while (rank < T) {
    const v = largestVoid();
    pat[v] = 1; bump(v, 1);
    M[v] = rank++;
  }
  return M;
}

export function getBlueNoiseTile(): Int32Array {
  if (!BN) BN = buildBlueNoise();
  return BN;
}

export function isValidAlgo(a: string): a is Algo {
  return ['fs', 'atkinson', 'stucki', 'jarvis', 'bayer', 'bayer8', 'bluenoise', 'halftone', 'seuil', 'glyphes', 'ascii', 'gbcam'].includes(a);
}
