import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { pickMimeType } from '../services/videoRecording';

/** A minute is enough on a printer roll, and it bounds encoder memory
 *  (index.html:1946). */
const MAX_MS = 60000;

/** Owns the MediaRecorder lifecycle for the camera overlay's video mode.
 *  Records from a second, upscaled canvas fed by the already-dithered
 *  preview canvas (`pushFrame`, index.html:1910-1917) rather than opening
 *  a second camera stream — recording is just "keep copying what's already
 *  on screen into an encoder". The caller owns what happens with the
 *  finished blob (`onDone`), same separation `useCamera` has from "what do
 *  you do with a shot". */
export function useVideoRecording(
  previewCanvasRef: RefObject<HTMLCanvasElement | null>,
  fps: number,
  onDone: (blob: Blob, mimeType: string) => void,
) {
  const mimeType = pickMimeType();
  const recCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef(0);
  const lastPushRef = useRef(0);
  const startTimeRef = useRef(0);
  const capTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  const pushFrame = useCallback(() => {
    const src = previewCanvasRef.current;
    if (!src || !src.width) return;
    if (!recCanvasRef.current) recCanvasRef.current = document.createElement('canvas');
    const rec = recCanvasRef.current;
    // Nearest-neighbor upscale to a ~1080px shortest side — a smoothed
    // upscale would blur the dither pattern back into grey.
    const k = Math.max(1, Math.round(1080 / src.width));
    const w = src.width * k, h = src.height * k;
    if (rec.width !== w || rec.height !== h) { rec.width = w; rec.height = h; }
    const ctx = rec.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 0, 0, w, h);
  }, [previewCanvasRef]);

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === 'recording') recorderRef.current.stop();
  }, []);

  const start = useCallback(() => {
    if (!mimeType || recorderRef.current) return;
    pushFrame();
    const recCanvas = recCanvasRef.current;
    if (!recCanvas) return;

    let stream: MediaStream;
    try {
      stream = recCanvas.captureStream(fps);
    } catch {
      return;
    }
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_500_000 });
    } catch {
      try {
        recorder = new MediaRecorder(stream);
      } catch {
        return;
      }
    }

    chunksRef.current = [];
    recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(capTimerRef.current);
      setRecording(false);
      recorderRef.current = null;
      const blob = new Blob(chunksRef.current, { type: mimeType });
      if (blob.size) onDone(blob, mimeType);
    };
    recorder.start(300);
    recorderRef.current = recorder;
    startTimeRef.current = performance.now();
    lastPushRef.current = 0;
    setElapsedMs(0);
    setRecording(true);
    capTimerRef.current = setTimeout(stop, MAX_MS);

    const gate = 1000 / fps;
    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      const now = performance.now();
      setElapsedMs(now - startTimeRef.current);
      if (now - lastPushRef.current < gate) return;
      lastPushRef.current = now;
      pushFrame();
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [mimeType, fps, pushFrame, onDone, stop]);

  // A recorder left running in a backgrounded tab drains the battery
  // unnoticed — hard-stop rather than just pausing (index.html:1791-1794).
  useEffect(() => {
    const onVisibility = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', stop);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', stop);
    };
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { mimeType, recording, elapsedMs, start, stop };
}
