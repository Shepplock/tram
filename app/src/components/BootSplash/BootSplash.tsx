import { useEffect, useState } from 'react';
import { useBootStore } from '../../state/bootStore';
import styles from './BootSplash.module.scss';

/** Two-note chime, softened through a lowpass filter (index.html:2562-2585).
 *  Web Audio stays locked until a user gesture on iOS, so this can fail
 *  silently on first try — the caller arms a one-shot pointerdown retry. */
function chime(): boolean {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return false;
  let ac: AudioContext;
  try {
    ac = new AC();
  } catch {
    return false;
  }
  if (ac.state === 'suspended') ac.resume();
  if (ac.state !== 'running') {
    ac.close?.();
    return false;
  }
  const t0 = ac.currentTime + 0.01;
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2600;
  lp.connect(ac.destination);
  ([[587.33, 0], [880.0, 0.115]] as const).forEach(([f, d]) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'square';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0 + d);
    g.gain.exponentialRampToValueAtTime(0.14, t0 + d + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.4);
    o.connect(g);
    g.connect(lp);
    o.start(t0 + d);
    o.stop(t0 + d + 0.42);
  });
  setTimeout(() => { try { ac.close(); } catch { /* already closed */ } }, 1400);
  return true;
}

export function BootSplash() {
  const enabled = useBootStore((s) => s.enabled);
  const [dismissed, setDismissed] = useState(false);
  const [out, setOut] = useState(false);

  useEffect(() => {
    if (!enabled || dismissed) return;
    const slow = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
    let armed: (() => void) | null = null;

    const chimeTimer = setTimeout(() => {
      if (!chime()) {
        armed = () => { chime(); document.removeEventListener('pointerdown', armed!); armed = null; };
        document.addEventListener('pointerdown', armed);
      }
    }, slow ? 0 : 580);

    const doneTimer = setTimeout(() => setOut(true), slow ? 300 : 1150);
    const removeTimer = setTimeout(() => setDismissed(true), (slow ? 300 : 1150) + 240);

    return () => {
      clearTimeout(chimeTimer);
      clearTimeout(doneTimer);
      clearTimeout(removeTimer);
      if (armed) document.removeEventListener('pointerdown', armed);
    };
  }, [enabled, dismissed]);

  if (!enabled || dismissed) return null;

  const dismiss = () => { chime(); setOut(true); setTimeout(() => setDismissed(true), 240); };

  return (
    <div className={`${styles.boot} ${out ? styles.out : ''}`} onPointerDown={dismiss}>
      <button type="button" className={styles.skip} onClick={(e) => { e.stopPropagation(); dismiss(); }}>Skip</button>
      <div className={styles.logo}>Print Pak</div>
    </div>
  );
}
