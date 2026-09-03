import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { paint } from '../engine/paint';
import { process } from '../engine/process';
import { useDeviceStore } from '../state/deviceStore';
import { useToneStore } from '../state/toneStore';
import type { Facing } from './useCamera';

const LIVE_FPS = 15;

/** Runs the dithered live-preview render loop: draws the current video
 *  frame through the engine at a capped frame rate, shared by the inline
 *  viewfinder and the full-screen camera overlay. */
export function useLiveDither(
  videoRef: RefObject<HTMLVideoElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  facing: Facing,
  active: boolean,
) {
  const lastFrame = useRef(0);
  const rafRef = useRef(0);
  const tone = useToneStore((s) => s.tone);
  const comp = useDeviceStore((s) => s.device.comp);

  useEffect(() => {
    if (!active) return;
    function loop() {
      rafRef.current = requestAnimationFrame(loop);
      const video = videoRef.current, canvas = canvasRef.current;
      if (!video || !canvas || !video.videoWidth) return;
      const now = performance.now();
      if (now - lastFrame.current < 1000 / LIVE_FPS) return;
      lastFrame.current = now;
      const r = process({
        source: video,
        crop: { x: 0, y: 0, w: video.videoWidth, h: video.videoHeight },
        mirror: facing === 'user',
        st: { ...tone, white: tone.white + comp },
      });
      paint(canvas, r);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [videoRef, canvasRef, facing, tone, comp, active]);
}
