import { useEffect, useRef, useState } from 'react';
import { coverageVerdict, paint } from '../../engine/paint';
import type { ProcessResult } from '../../engine/types';
import { usePreviewResult } from '../../hooks/usePreviewResult';
import { renderItem } from '../../services/renderItem';
import { useBatchStore } from '../../state/batchStore';
import { useDeviceStore } from '../../state/deviceStore';
import { useToneStore } from '../../state/toneStore';
import { useUiStore } from '../../state/uiStore';
import { LotBar } from '../LotBar/LotBar';
import { LiveViewfinder } from './LiveViewfinder';
import styles from './PreviewScreen.module.scss';

function Thumb({ index }: { index: number }) {
  const item = useBatchStore((s) => s.items[index]);
  const cur = useBatchStore((s) => s.cur);
  const setCur = useBatchStore((s) => s.setCur);
  const tone = useToneStore((s) => s.tone);
  const comp = useDeviceStore((s) => s.device.comp);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || item.skip) return;
    const st = item.own ?? tone;
    const r = renderItem(item, { ...st, w: 64 }, comp);
    paint(canvasRef.current, r);
  }, [item, tone, comp]);

  return (
    <button
      type="button"
      className={`${styles.thumb} ${item.skip ? styles.off : ''}`}
      aria-current={index === cur}
      onClick={() => setCur(index)}
    >
      <canvas ref={canvasRef} />
    </button>
  );
}

export function PreviewScreen() {
  const items = useBatchStore((s) => s.items);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const result = usePreviewResult();
  const tone = useToneStore((s) => s.tone);
  const cameraOpen = useUiStore((s) => s.cameraOpen);
  const setCameraOpen = useUiStore((s) => s.setCameraOpen);
  // Coverage while the live viewfinder is showing, not just a captured
  // photo — the original updates its gauge continuously while framing
  // (index.html:1858-1861). Reset once a real result exists so a stale
  // live reading never lingers behind an actual photo.
  const [liveCoverage, setLiveCoverage] = useState<ProcessResult | null>(null);
  useEffect(() => {
    if (result) setLiveCoverage(null);
  }, [result]);

  useEffect(() => {
    if (canvasRef.current && result) paint(canvasRef.current, result);
  }, [result]);

  const active = result ?? liveCoverage;
  const pct = active?.pct ?? 0;
  const verdict = coverageVerdict(pct);
  const blocksFilled = Math.min(12, Math.round(pct / 4));

  return (
    <div className={styles.pin}>
      <div className={styles.lcd}>
        <div className={styles.well}>
          {result ? (
            <canvas ref={canvasRef} className={styles.canvas} />
          ) : !cameraOpen ? (
            <LiveViewfinder onOpenCamera={() => setCameraOpen(true)} onCoverage={setLiveCoverage} />
          ) : null}
        </div>

        <div className={styles.meter}>
          <div className={styles.lab}>
            <span>Coverage</span>
          </div>
          <div className={styles.cov}>{pct.toFixed(1)}<small>%</small></div>
          <div className={styles.blocks}>
            {Array.from({ length: 12 }, (_, i) => (
              <i
                key={i}
                className={`${styles.block} ${i < blocksFilled ? styles.filled : (i >= 3 && i <= 5 ? styles.target : '')}`}
              />
            ))}
          </div>
          <div className={`${styles.verdict} ${verdict.className === 'verdict warn' ? styles.verdictWarn : ''}`}>
            {active ? verdict.text : ''}
          </div>
          <div className={styles.blank}>
            {active && active.blank != null && !tone.invert
              ? <>Blank paper guaranteed: <b>{active.blank.toFixed(0)}%</b> — no dot can occur there.</>
              : null}
          </div>
        </div>

        {items.length > 1 && (
          <div className={styles.film}>
            {items.map((it, i) => <Thumb key={it.id} index={i} />)}
          </div>
        )}
        <LotBar />
      </div>
    </div>
  );
}
