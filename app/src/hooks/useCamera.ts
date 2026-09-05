import { useCallback, useEffect, useRef, useState } from 'react';

export type Facing = 'environment' | 'user';

/** Resolves which camera is actually active, rather than trusting the
 *  `facingMode` constraint we requested: many laptops only have one
 *  (front-facing) camera and silently ignore an "environment" request, and
 *  some devices don't report `facingMode` on the track at all. Falls back
 *  to "there's only one camera, so it must be front-facing" when the
 *  browser doesn't tell us. This is what mirroring is based on. */
async function resolveFacing(track: MediaStreamTrack, requested: Facing): Promise<Facing> {
  const reported = track.getSettings().facingMode;
  if (reported === 'user' || reported === 'environment') return reported;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((d) => d.kind === 'videoinput');
    if (cameras.length <= 1) return 'user';
  } catch {
    /* enumerateDevices can fail without an active permission grant; keep the request as-is */
  }
  return requested;
}

/** Manages the getUserMedia stream lifecycle for the live viewfinder.
 *  Guards against React StrictMode's double-invoked effects (mount ->
 *  cleanup -> mount): each start() call carries a token, and a call whose
 *  token is no longer current stops its own stream instead of touching
 *  state — otherwise the two overlapping calls abort each other's
 *  video.play() and the hook gets stuck reporting an error. */
export function useCamera(active: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const tokenRef = useRef(0);
  const [requestedFacing, setRequestedFacing] = useState<Facing>('environment');
  const [facing, setFacing] = useState<Facing>('user');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    tokenRef.current++;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setReady(false);
  }, []);

  const start = useCallback(async (f: Facing) => {
    const token = ++tokenRef.current;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('No camera available');
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: f, width: { ideal: 1440 }, height: { ideal: 1440 } },
        audio: false,
      });
      if (token !== tokenRef.current) { stream.getTracks().forEach((t) => t.stop()); return false; }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      if (token !== tokenRef.current) { stream.getTracks().forEach((t) => t.stop()); return false; }
      setFacing(await resolveFacing(stream.getVideoTracks()[0], f));
      setReady(true);
      setError(null);
      return true;
    } catch {
      if (token !== tokenRef.current) return false;
      setError('No camera available');
      return false;
    }
  }, []);

  useEffect(() => {
    if (!active) { stop(); return; }
    start(requestedFacing);
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, requestedFacing]);

  // Nothing should keep the camera running once the tab is backgrounded,
  // and it should pick back up when the tab returns (index.html:1789-1800).
  useEffect(() => {
    if (!active) return;
    const onVisibility = () => {
      if (document.hidden) stop();
      else start(requestedFacing);
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', stop);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', stop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, requestedFacing]);

  const flip = useCallback(() => {
    setRequestedFacing((f) => (f === 'environment' ? 'user' : 'environment'));
  }, []);

  return { videoRef, facing, flip, ready, error };
}
