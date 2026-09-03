import { useRef, useState } from 'react';
import { useCamera } from '../../hooks/useCamera';
import { useLiveDither } from '../../hooks/useLiveDither';
import styles from './PreviewScreen.module.scss';

/**
 * Default screen when nothing has been imported yet: an auto-starting,
 * inline dithered live preview (mirroring the original app's default
 * behavior), falling back to a "tap to start" prompt if the camera is
 * unavailable or permission hasn't been granted. Tapping it opens the
 * full-screen camera overlay, which is where the actual shutter lives.
 */
export function LiveViewfinder({ onOpenCamera }: { onOpenCamera: () => void }) {
  const [wantsCamera, setWantsCamera] = useState(true);
  const { videoRef, facing, ready, error } = useCamera(wantsCamera);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLiveDither(videoRef, canvasRef, facing, wantsCamera);

  if (error) {
    return (
      <button type="button" className={styles.empty} onClick={() => setWantsCamera(true)}>
        Tap to start viewfinder
      </button>
    );
  }

  return (
    <button type="button" className={styles.liveButton} onClick={onOpenCamera} aria-label="Open camera">
      <video ref={videoRef} playsInline muted style={{ display: 'none' }} />
      <canvas ref={canvasRef} className={styles.canvas} />
      {!ready && <div className={styles.empty}>Starting…</div>}
    </button>
  );
}
