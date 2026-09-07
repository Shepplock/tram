export type Algo =
  | 'fs' | 'atkinson' | 'stucki' | 'jarvis'
  | 'bayer' | 'bayer8' | 'bluenoise' | 'halftone' | 'seuil'
  | 'glyphes' | 'ascii' | 'gbcam' | 'lyrics';

/** A song's lyrics picked for the `lyrics` style — `text` is pre-flattened
 *  (whitespace/newlines collapsed) so `glyph.ts` can just walk a flat stream. */
export interface LyricsSelection {
  text: string;
  track: string;
  artist: string;
}

/** Tone/style settings for a single photo — mirrors the original `state` object. */
export interface ToneSettings {
  w: number;
  sky: number;
  white: number;
  floor: number;
  gamma: number;
  sharp: number;
  blur: number;
  invert: boolean;
  algo: Algo;
  cell?: number;
  scale?: number;
  edge?: number;
  vig?: number;
  gsort: number;
  gshear: number;
  gseed: number;
  clip?: boolean;
  lyrics?: LyricsSelection;
  /** `lyrics` style's own floor, kept separate from `floor` so switching
   *  away from `lyrics` doesn't carry a lyrics-tuned floor into other
   *  styles (and vice versa). Defaults to the same 40 as `floor` when unset. */
  lyricsFloor?: number;
}

export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A drawable image source: an HTMLImageElement/ImageBitmap in the browser,
 *  or anything else `CanvasRenderingContext2D.drawImage` accepts. */
export type ImageSource = CanvasImageSource;

export interface ProcessInput {
  source: ImageSource;
  crop: CropRect;
  st: ToneSettings;
  mirror?: boolean;
}

export interface ProcessResult {
  bits: Uint8ClampedArray;
  W: number;
  H: number;
  pct: number;
  blank?: number;
  clipHi?: Uint8ClampedArray;
  clipLo?: Uint8ClampedArray;
}
