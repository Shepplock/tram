import { useRef } from 'react';
import { useCamera } from '../../hooks/useCamera';
import { useLiveDither } from '../../hooks/useLiveDither';
import { useBatchStore } from '../../state/batchStore';
import styles from './CameraOverlay.module.scss';

export function CameraOverlay({ onClose }: { onClose: () => void }) {
  const { videoRef, facing, flip, ready, error } = useCamera(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const addItems = useBatchStore((s) => s.addItems);

  useLiveDither(videoRef, canvasRef, facing, true);

  const shoot = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const shot = document.createElement('canvas');
    shot.width = video.videoWidth;
    shot.height = video.videoHeight;
    const ctx = shot.getContext('2d')!;
    if (facing === 'user') { ctx.translate(shot.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, 0, 0);
    addItems([{
      id: '', name: `capture-${Date.now()}.png`, source: shot,
      width: shot.width, height: shot.height, rot: 0, own: null, skip: false,
    }]);
    onClose();
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.stage}>
        {error ? (
          <div className={styles.empty}>{error}</div>
        ) : (
          <>
            <video ref={videoRef} playsInline muted style={{ display: 'none' }} />
            <canvas ref={canvasRef} className={styles.canvas} />
            {!ready && <div className={styles.empty}>Starting…</div>}
          </>
        )}
      </div>
      <div className={styles.bar}>
        <button type="button" className={styles.iconBtn} onClick={onClose}>Close</button>
        <button type="button" className={styles.shutter} aria-label="Capture" onClick={shoot} disabled={!ready} />
        <button type="button" className={styles.iconBtn} onClick={flip}>Flip</button>
      </div>
    </div>
  );
}
