import { useEffect, useRef, useState } from 'react';
import { useCamera } from '../../hooks/useCamera';
import { useLiveDither } from '../../hooks/useLiveDither';
import type { ProcessResult } from '../../engine/types';
import styles from './PreviewScreen.module.scss';

/** Shuts the viewfinder's camera stream off after 90s of no interaction —
 *  it's the app's single heaviest thing to leave running unattended
 *  (index.html:1776-1787). */
const IDLE_MS = 90000;

/**
 * Default screen when nothing has been imported yet: an auto-starting,
 * inline dithered live preview (mirroring the original app's default
 * behavior), falling back to a "tap to start" prompt if the camera is
 * unavailable or permission hasn't been granted. Tapping it opens the
 * full-screen camera overlay, which is where the actual shutter lives.
 */
export function LiveViewfinder({ onOpenCamera, onCoverage }: {
  onOpenCamera: () => void;
  /** Fired with each live frame's coverage, throttled to the preview's own
   *  frame rate — lets the coverage meter above track the live feed, not
   *  just a captured photo (index.html:1858-1861). */
  onCoverage?: (r: ProcessResult) => void;
}) {
  const [wantsCamera, setWantsCamera] = useState(true);
  const [idle, setIdle] = useState(false);
  const idleTimer = useRef(0);
  const { videoRef, facing, flip, ready, error } = useCamera(wantsCamera && !idle);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLiveDither(videoRef, canvasRef, facing, wantsCamera && !idle, onCoverage);

  useEffect(() => {
    if (idle) return;
    const arm = () => {
      clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(() => setIdle(true), IDLE_MS);
    };
    arm();
    document.addEventListener('pointerdown', arm, { passive: true });
    return () => {
      clearTimeout(idleTimer.current);
      document.removeEventListener('pointerdown', arm);
    };
  }, [idle]);

  if (idle) {
    return (
      <button type="button" className={styles.empty} onClick={() => setIdle(false)}>
        Tap to start viewfinder
      </button>
    );
  }

  if (error) {
    return (
      <button type="button" className={styles.empty} onClick={() => setWantsCamera(true)}>
        Tap to start viewfinder
      </button>
    );
  }

  return (
    <>
      <button type="button" className={styles.liveButton} onClick={onOpenCamera} aria-label="Open camera">
        <video ref={videoRef} playsInline muted style={{ display: 'none' }} />
        <canvas ref={canvasRef} className={styles.canvas} />
        {!ready && <div className={styles.empty}>Starting…</div>}
      </button>
      {ready && (
        <button
          type="button" className={styles.liveFlip}
          onClick={(e) => { e.stopPropagation(); flip(); }}
        >
          Flip
        </button>
      )}
    </>
  );
}
