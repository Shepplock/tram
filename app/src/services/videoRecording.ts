/** Best available container/codec, MP4 first since it's the only one iOS
 *  Photos will import via the share sheet (index.html:1897-1903). Returns
 *  null when `MediaRecorder` doesn't exist or nothing on the list is
 *  supported — the caller treats that as "video isn't available here". */
export function pickMimeType(): string | null {
  if (typeof window === 'undefined' || !window.MediaRecorder) return null;
  const candidates = [
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  for (const type of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(type)) return type;
    } catch {
      /* isTypeSupported itself can throw on some old implementations */
    }
  }
  return null;
}

/** "● m:ss" (index.html:1918-1921). */
export function formatElapsed(ms: number): string {
  const t = Math.floor(ms / 1000);
  return `● ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}
