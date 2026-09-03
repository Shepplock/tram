import { createCanvas as napiCreateCanvas } from '@napi-rs/canvas';
import { setCanvasFactory } from './src/engine/canvas';

// The engine draws to an offscreen canvas (crop/scale, glyph/ASCII text
// measurement, GB Cam rendering). jsdom has no real 2D canvas implementation,
// so tests run against @napi-rs/canvas — a real, prebuilt-binary canvas
// implementation — instead of a browser.
setCanvasFactory(() => napiCreateCanvas(1, 1) as any);
