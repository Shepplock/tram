/**
 * Canvas creation is factored out so the engine has no hard dependency on a
 * global `document` — this is what lets the pure image-processing functions
 * below be unit-tested under Vitest/Node (via @napi-rs/canvas) instead of
 * only inside a real browser, as the original single-file app required.
 */
export interface CanvasLike {
  width: number;
  height: number;
  getContext(type: '2d', opts?: CanvasRenderingContext2DSettings): CanvasRenderingContext2D | null;
}

type CanvasFactory = () => CanvasLike;

let factory: CanvasFactory = () => document.createElement('canvas') as unknown as CanvasLike;

export function setCanvasFactory(f: CanvasFactory): void {
  factory = f;
}

export function createCanvas(): CanvasLike {
  return factory();
}
