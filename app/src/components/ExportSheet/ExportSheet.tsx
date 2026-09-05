import { useMemo } from 'react';
import { useExportSheetStore } from '../../state/exportSheetStore';
import styles from './ExportSheet.module.scss';

const coarse = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
const SAVE_MSG = coarse
  ? 'Press and hold the image → Save to Photos'
  : 'Right-click the image → Save image as…';

export function ExportSheet() {
  const outputs = useExportSheetStore((s) => s.outputs);
  const index = useExportSheetStore((s) => s.index);
  const rendering = useExportSheetStore((s) => s.rendering);
  const close = useExportSheetStore((s) => s.close);
  const next = useExportSheetStore((s) => s.next);
  const prev = useExportSheetStore((s) => s.prev);

  const current = outputs[index] ?? null;
  const src = useMemo(() => current?.toDataURL('image/png'), [current]);

  if (!rendering && !outputs.length) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.box}>
        {rendering || !current ? (
          <p className={styles.msg}>Rendering…</p>
        ) : (
          <>
            <img src={src} alt="Result" className={styles.img} />
            <p className={styles.msg}>{SAVE_MSG}</p>
            <p className={styles.info}>{current.width} × {current.height} px</p>
            {outputs.length > 1 && (
              <div className={styles.nav}>
                <button type="button" className={styles.navBtn} onClick={prev}>‹</button>
                <span className={styles.navIdx}>{index + 1} / {outputs.length}</span>
                <button type="button" className={styles.navBtn} onClick={next}>›</button>
              </div>
            )}
            <button type="button" className={styles.close} onClick={close}>Close</button>
          </>
        )}
      </div>
    </div>
  );
}
