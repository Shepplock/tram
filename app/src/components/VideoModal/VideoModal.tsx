import { useEffect, useRef, useState } from 'react';
import styles from './VideoModal.module.scss';

export function VideoModal({ blob, fps, onClose }: { blob: Blob; fps: number; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [url, setUrl] = useState<string | null>(null);

  // Create and revoke the URL within the same effect invocation — under
  // StrictMode's dev-only mount->cleanup->mount, a `useMemo`'d URL would
  // survive the fake unmount (its `blob` dependency hasn't changed) while
  // the cleanup effect still revoked it, leaving `<video>` pointed at a
  // dead blob: URL that just hangs instead of playing.
  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);

  const ext = blob.type.includes('mp4') ? 'MP4' : 'WebM';
  const info = `${ext} · ${fps} fps · ${(blob.size / 1048576).toFixed(1)} MB`;

  const save = async () => {
    const file = new File([blob], `printpak.${ext.toLowerCase()}`, { type: blob.type });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return;
        // fall through to the download link on any other share failure
      }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };

  const close = () => {
    videoRef.current?.pause();
    onClose();
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.box}>
        {url && <video ref={videoRef} className={styles.video} src={url} controls loop playsInline />}
        <p className={styles.info}>{info}</p>
        <p className={styles.hint}>Video doesn't save the same way as a photo — use the button below.</p>
        <button type="button" className={styles.save} onClick={save}>Save video</button>
        <button type="button" className={styles.close} onClick={close}>Close</button>
      </div>
    </div>
  );
}
