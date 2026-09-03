import { Slider } from '../Slider/Slider';
import { estimateExport } from '../../services/export';
import { useBatchStore } from '../../state/batchStore';
import { useDeviceStore } from '../../state/deviceStore';
import { useToneStore } from '../../state/toneStore';
import styles from './ExportPanel.module.scss';

export function ExportPanel() {
  const tone = useToneStore((s) => s.tone);
  const setTone = useToneStore((s) => s.setTone);
  const device = useDeviceStore((s) => s.device);
  const setDevice = useDeviceStore((s) => s.setDevice);
  const items = useBatchStore((s) => s.items);
  const estimate = estimateExport(items, tone, device);
  const showGap = device.outMode === 'bande' && items.filter((it) => !it.skip).length > 1;

  return (
    <div>
      <div className={styles.legend}>Paper width</div>
      <div className={styles.seg}>
        <button type="button" className={styles.toggle} aria-pressed={tone.w === 384} onClick={() => setTone({ w: 384 })}>
          384px — 58mm
        </button>
        <button type="button" className={styles.toggle} aria-pressed={tone.w === 576} onClick={() => setTone({ w: 576 })}>
          576px — 80mm
        </button>
      </div>

      <div className={styles.legend}>Output</div>
      <div className={styles.seg}>
        <button type="button" className={styles.toggle} aria-pressed={device.outMode === 'bande'} onClick={() => setDevice({ outMode: 'bande' })}>
          Single strip
        </button>
        <button type="button" className={styles.toggle} aria-pressed={device.outMode === 'frames'} onClick={() => setDevice({ outMode: 'frames' })}>
          Separate frames
        </button>
      </div>
      {showGap && (
        <Slider label="Gap between frames" value={device.gap} min={0} max={80} onChange={(v) => setDevice({ gap: v })}
          hint="White left between frames in the strip, for cutting." />
      )}
      <div className={styles.seg}>
        <button type="button" className={styles.toggle} aria-pressed={device.num} onClick={() => setDevice({ num: !device.num })}>
          Number the frames
        </button>
      </div>
      <div className={styles.hint}>
        {device.outMode === 'bande'
          ? 'Every frame end to end in one PNG, ready to print in a single run.'
          : 'One PNG per frame, saved one at a time from the export sheet.'}
      </div>

      <div className={styles.legend}>Reserved band</div>
      <div className={styles.hint}>White left untouched at top or bottom, so you can print onto a used receipt without covering its type.</div>
      <Slider label="Top" value={device.mtop} min={0} max={400} onChange={(v) => setDevice({ mtop: v })} />
      <Slider label="Bottom" value={device.mbot} min={0} max={400} onChange={(v) => setDevice({ mbot: v })} />

      <div className={styles.legend}>Summary</div>
      <div className={styles.hint}>
        {estimate ? (
          <>
            {estimate.keepCount} frame{estimate.keepCount > 1 ? 's' : ''}
            {estimate.exclCount ? ` — ${estimate.exclCount} excluded` : ''}<br />
            {device.outMode === 'bande'
              ? <>Strip of <b>{estimate.totalPx} px</b>, about <b>{estimate.totalMm.toFixed(0)} mm</b> of paper.</>
              : <>About <b>{estimate.totalMm.toFixed(0)} mm</b> of paper in total.</>}
          </>
        ) : 'Import a photo first, then use the Export key below.'}
      </div>
    </div>
  );
}
