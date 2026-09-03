export type Algo =
  | 'fs' | 'atkinson' | 'stucki' | 'jarvis'
  | 'bayer' | 'bayer8' | 'bluenoise' | 'halftone' | 'seuil'
  | 'glyphes' | 'ascii' | 'gbcam';

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
