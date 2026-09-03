import { useEffect, useRef, useState } from 'react';
import type { Algo } from '../../engine/types';
import { useActiveTone } from '../../hooks/useActiveTone';
import { useCamera } from '../../hooks/useCamera';
import { useImportFiles } from '../../hooks/useImportFiles';
import { useLiveDither } from '../../hooks/useLiveDither';
import { useVideoRecording } from '../../hooks/useVideoRecording';
import { formatElapsed } from '../../services/videoRecording';
import { Slider } from '../Slider/Slider';
import { VideoModal } from '../VideoModal/VideoModal';
import { useBatchStore } from '../../state/batchStore';
import { useDeviceStore } from '../../state/deviceStore';
import styles from './CameraOverlay.module.scss';

const FPS_OPTIONS = [4, 8, 12, 24];

const ALGOS: { id: Algo; label: string }[] = [
  { id: 'fs', label: 'Floyd' },
  { id: 'atkinson', label: 'Atkinson' },
  { id: 'stucki', label: 'Stucki' },
  { id: 'jarvis', label: 'Jarvis' },
  { id: 'bayer', label: 'Bayer 4' },
  { id: 'bayer8', label: 'Bayer 8' },
  { id: 'bluenoise', label: 'Blue noise' },
  { id: 'halftone', label: 'Halftone' },
  { id: 'seuil', label: 'Threshold' },
  { id: 'glyphes', label: 'Glyphs' },
  { id: 'ascii', label: 'ASCII' },
  { id: 'gbcam', label: 'GB Cam' },
];

export function CameraOverlay({ onClose }: { onClose: () => void }) {
  const { videoRef, facing, flip, ready, error } = useCamera(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileCamRef = useRef<HTMLInputElement>(null);
  const firedFallback = useRef(false);
  const addItems = useBatchStore((s) => s.addItems);
  const { addFiles } = useImportFiles();
  const { active, setActive } = useActiveTone();
  const [tuneOpen, setTuneOpen] = useState(false);
  const capture = useDeviceStore((s) => s.device.capture);
  const fps = useDeviceStore((s) => s.device.fps);
  const setDevice = useDeviceStore((s) => s.setDevice);
  const [video, setVideo] = useState<Blob | null>(null);

  useLiveDither(videoRef, canvasRef, facing, true);
  const { mimeType, recording, elapsedMs, start: startRec, stop: stopRec } = useVideoRecording(
    canvasRef, fps, (blob) => setVideo(blob),
  );
  const videoMode = capture === 'video' && !!mimeType;

  // No getUserMedia, or permission denied: fall back to the OS camera app
  // via a native file input, same as the original (index.html:1836-1838).
  useEffect(() => {
    if (error && !firedFallback.current) {
      firedFallback.current = true;
      fileCamRef.current?.click();
    }
  }, [error]);

  const shoot = () => {
    const videoEl = videoRef.current;
    if (!videoEl || !videoEl.videoWidth) return;
    const shot = document.createElement('canvas');
    shot.width = videoEl.videoWidth;
    shot.height = videoEl.videoHeight;
    const ctx = shot.getContext('2d')!;
    if (facing === 'user') { ctx.translate(shot.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(videoEl, 0, 0);
    addItems([{
      id: '', name: `capture-${Date.now()}.png`, source: shot,
      width: shot.width, height: shot.height, rot: 0, own: null, skip: false,
    }]);
    onClose();
  };

  const toggleRecord = () => { if (recording) stopRec(); else startRec(); };

  const onNativeCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length) await addFiles(files);
    onClose();
  };

  const grid = active.algo === 'glyphes' || active.algo === 'ascii';

  return (
    <div className={styles.overlay}>
      <input
        ref={fileCamRef} type="file" accept="image/*" capture="environment"
        style={{ display: 'none' }} onChange={onNativeCapture}
      />
      <div className={styles.stage}>
        {error ? (
          <div className={styles.empty}>{error}</div>
        ) : (
          <>
            <video ref={videoRef} playsInline muted style={{ display: 'none' }} />
            <canvas ref={canvasRef} className={styles.canvas} />
            {!ready && <div className={styles.empty}>Starting…</div>}
            {recording && <div className={styles.recTime}>{formatElapsed(elapsedMs)}</div>}
          </>
        )}
      </div>

      {videoMode && !error && (
        <div className={styles.fpsSeg}>
          {FPS_OPTIONS.map((f) => (
            <button key={f} type="button" aria-pressed={fps === f} disabled={recording} onClick={() => setDevice({ fps: f })}>
              {f} fps
            </button>
          ))}
        </div>
      )}

      {tuneOpen && !error && (
        <div className={styles.tune}>
          <div className={styles.tuneAlgos}>
            {ALGOS.map((a) => (
              <button
                key={a.id} type="button" aria-pressed={active.algo === a.id}
                onClick={() => setActive({ algo: a.id })}
              >
                {a.label}
              </button>
            ))}
          </div>
          <Slider label="White point" value={active.white} min={50} max={255} onChange={(v) => setActive({ white: v })} glyph="W" />
          <Slider label="Sky" value={active.sky} min={0} max={100} onChange={(v) => setActive({ sky: v })} glyph="S" />
          <Slider label="Gamma" value={active.gamma} min={40} max={160} onChange={(v) => setActive({ gamma: v })} glyph="G"
            format={(v) => (v / 100).toFixed(2)} />
          {grid ? (
            <Slider label="Cell size" value={active.cell ?? 8} min={4} max={24} onChange={(v) => setActive({ cell: v })} glyph="C" />
          ) : (
            <Slider label="Pixel size" value={active.scale ?? 1} min={1} max={6} onChange={(v) => setActive({ scale: v })} glyph="P"
              format={(v) => v.toFixed(1)} />
          )}
        </div>
      )}

      <div className={styles.bar}>
        <button type="button" className={styles.iconBtn} onClick={onClose}>Close</button>
        <button
          type="button" className={styles.iconBtn} aria-pressed={tuneOpen}
          onClick={() => setTuneOpen((o) => !o)}
        >
          Tune
        </button>
        {videoMode ? (
          <button
            type="button" className={`${styles.shutter} ${styles.recBtn} ${recording ? styles.on : ''}`}
            aria-label="Record" onClick={toggleRecord} disabled={!ready}
          />
        ) : (
          <button type="button" className={styles.shutter} aria-label="Capture" onClick={shoot} disabled={!ready} />
        )}
        <button type="button" className={styles.iconBtn} onClick={flip} disabled={recording}>Flip</button>
      </div>

      {video && <VideoModal blob={video} fps={fps} onClose={() => setVideo(null)} />}
    </div>
  );
}
