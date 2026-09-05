import { dither, expand } from '../engine/dither';
import { gbQuant } from '../engine/gbcam';
import { flattenLyrics, glyphRender } from '../engine/glyph';
import type { Algo, ProcessResult, ToneSettings } from '../engine/types';

/** Fixed placeholder text for the "Lyrics" style button's own preview swatch
 *  — never the user's actual pick, so the button never triggers a network
 *  call just to draw its icon. */
const PLACEHOLDER_LYRICS = flattenLyrics(`
It's been a few years since you've been gone
There's been a few tears
But that was years and years ago
Yeah, I grew up to be exactly what you wanted
Yeah, I been living out the dream that you dreamt up
It's been a few years with more to come
It's been a few years since I've felt sure of what I want
And I woke up today and found that you were waiting here for me
And I thought, woah, old friend, it's bittersweet
Woah, but how could you do this to me?
How could you do this to me, yeah
'Cause you are not who you think you are
There's no green on these brown eyes
But they can be green if they really want
And I can bend your words
So they say exactly what hurts the most
But silence is better than fake laughs or faking we're always up
Loose grip
The world bends around you
And living through cracked screens
We fold down to what we want
Out of love
We talk through lines, we're made of smoke
And just in time, we drift away
Diffusing light
Confusing times
Growing up, or cascading down
Cascading down
I'm hurting now
But change comes slow
If you hate what's in your head
The fuck would you speak your mind?
In search of lost time
Just 21 so I'm young and I'm stupid
Only 16, yeah, I think you should've known
I think you fucked me up
I think
I think you fucked me up
And I've got nothing to say to you
It's been a few years and I've moved on
Couldn't make it disappear
Oh, I tried so hard to be strong
But I grew up today and faced that I'm not just lonely
Don't feel much better, but I guess that it's a start
`);

/** Renders a black-to-white gradient through one algorithm, at its real
 *  size — the same trick as index.html:2486-2504, so each style button
 *  shows that algorithm's own texture instead of a shared placeholder. */
export function renderSwatch(algo: Algo, W: number, H: number, cell: number, scale: number): ProcessResult {
  const isGrid = algo === 'glyphes' || algo === 'ascii' || algo === 'lyrics';
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
    ? glyphRender(g, dW, dH, {
      algo, cell,
      ...(algo === 'lyrics' ? { lyrics: { text: PLACEHOLDER_LYRICS, track: '', artist: '' } } : {}),
    } as ToneSettings)
    : dither(g, dW, dH, algo);
  const bits = S === 1 ? small : expand(small, dW, dH, W, H);
  return { W, H, pct: 0, bits };
}
