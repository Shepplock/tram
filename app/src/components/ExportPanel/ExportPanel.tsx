import { Slider } from '../Slider/Slider';
import { useBatchStore } from '../../state/batchStore';
import { useDeviceStore } from '../../state/deviceStore';
import { useToneStore } from '../../state/toneStore';
import { renderItem } from '../../services/renderItem';
import { paint } from '../../engine/paint';
import styles from './ExportPanel.module.scss';

export function ExportPanel() {
  const tone = useToneStore((s) => s.tone);
  const setTone = useToneStore((s) => s.setTone);
  const device = useDeviceStore((s) => s.device);
  const setDevice = useDeviceStore((s) => s.setDevice);
  const item = useBatchStore((s) => s.items[s.cur] ?? null);

  const doExport = () => {
    if (!item) return;
    const st = item.own ?? tone;
    const r = renderItem(item, st, device.comp);
    const canvas = document.createElement('canvas');
    paint(canvas, r);
    const link = document.createElement('a');
    link.download = `printpak-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

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
      <Slider label="Gap between frames" value={device.gap} min={0} max={80} onChange={(v) => setDevice({ gap: v })}
        hint="White left between frames in the strip, for cutting." />
      <div className={styles.seg}>
        <button type="button" className={styles.toggle} aria-pressed={device.num} onClick={() => setDevice({ num: !device.num })}>
          Number the frames
        </button>
      </div>

      <div className={styles.legend}>Reserved band</div>
      <div className={styles.hint}>White left untouched at top or bottom, so you can print onto a used receipt without covering its type.</div>
      <Slider label="Top" value={device.mtop} min={0} max={400} onChange={(v) => setDevice({ mtop: v })} />
      <Slider label="Bottom" value={device.mbot} min={0} max={400} onChange={(v) => setDevice({ mbot: v })} />

      <div className={styles.legend}>Summary</div>
      <div className={styles.hint}>
        {item ? `${tone.w}px wide, ${device.outMode === 'bande' ? 'single strip' : 'separate frames'}.` : 'Import a photo first.'}
      </div>
      <button type="button" className={styles.exportBtn} disabled={!item} onClick={doExport}>
        Export
      </button>
    </div>
  );
}
