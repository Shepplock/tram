import { useState } from 'react';
import { solveComp } from '../../engine/calibration';
import { buildChart, buildTest } from '../../services/calibrationChart';
import { Slider } from '../Slider/Slider';
import { useBootStore } from '../../state/bootStore';
import { useDeviceStore } from '../../state/deviceStore';
import { useExportSheetStore } from '../../state/exportSheetStore';
import { useToneStore } from '../../state/toneStore';
import { stateToHash } from '../../services/urlState';
import styles from './SettingsPanel.module.scss';

const SHARE_DEFAULT = 'Copy settings link';

function calibText(midStep: number, comp: number): string {
  if (midStep === 50) return 'Neutral printer — no compensation needed.';
  return `Your printer runs <b>${midStep < 50 ? 'dark' : 'light'}</b>. Suggested compensation: <b>${comp > 0 ? '+' : ''}${comp}</b>.`;
}

export function SettingsPanel() {
  const tone = useToneStore((s) => s.tone);
  const device = useDeviceStore((s) => s.device);
  const setDevice = useDeviceStore((s) => s.setDevice);
  const bootEnabled = useBootStore((s) => s.enabled);
  const setBootEnabled = useBootStore((s) => s.setEnabled);
  const show = useExportSheetStore((s) => s.show);

  const [midStep, setMidStep] = useState(50);
  const [applied, setApplied] = useState(false);
  const [shareLabel, setShareLabel] = useState(SHARE_DEFAULT);

  const comp = solveComp(midStep);

  const printChart = () => show([buildChart(tone.w)]);
  const printTest = () => show([buildTest(tone.w)]);

  const applyCalibration = () => {
    setDevice({ comp: solveComp(midStep) });
    setApplied(true);
  };

  const copyLink = async () => {
    const url = `${location.origin}${location.pathname}${stateToHash(tone, device)}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareLabel('Link copied');
    } catch {
      window.prompt('Copy this link:', url);
    }
    setTimeout(() => setShareLabel(SHARE_DEFAULT), 1800);
  };

  return (
    <div>
      <div className={styles.legend}>Calibration</div>
      <div className={styles.hint}>
        Print the chart once. Find the step that looks mid-grey on paper, compare it to its label, and correct the difference below.
      </div>
      <button type="button" className={styles.ghost} onClick={printChart}>Print the chart</button>
      <Slider label="Compensation" value={device.comp} min={-60} max={60} onChange={(v) => setDevice({ comp: v })} glyph="C"
        format={(v) => (v > 0 ? '+' : '') + v}
        hint="Shifts the white point across every frame at once. Negative lightens." />

      <div className={styles.legend}>Startup</div>
      <label className={styles.check}>
        <input type="checkbox" checked={bootEnabled} onChange={(e) => setBootEnabled(e.target.checked)} />
        <span>Animation on start?</span>
      </label>
      <div className={styles.hint}>Plays the wordmark and a chime on launch. Sound needs a prior tap on iOS.</div>

      <div className={styles.legend}>Sharing</div>
      <button type="button" className={styles.ghost} onClick={copyLink}>{shareLabel}</button>
      <div className={styles.hint}>The values travel in the address. Handy for moving a setting from phone to desktop.</div>

      <div className={styles.legend}>Formats</div>
      <div className={styles.hint}>
        JPEG, PNG, HEIC, WebP, AVIF, GIF, BMP, SVG, TIFF — whatever your browser can decode.
        HEIC works natively on iPhone.<br /><br />
        RAW (DNG, ARW, CR2, NEF…) cannot be read: convert to JPEG first.<br /><br />
        You can also paste an image from the clipboard, or drop one onto the page from a computer.
      </div>

      <div className={styles.legend}>Print test</div>
      <div className={styles.hint}>
        A full ramp from 0 to 100% in 5% steps, plus 1–4 px lines. Shows where your head
        saturates to solid black, where the lightest steps stop printing at all, and how fine
        a line it can still resolve.
      </div>
      <button type="button" className={styles.ghost} onClick={printTest}>Generate test strip</button>

      <Slider label="Mid-grey step" value={midStep} min={5} max={95} step={5}
        onChange={(v) => { setMidStep(v); setApplied(false); }} glyph="C"
        hint="On the printed strip, find the step that looks like an even mid-grey. Enter its label here." />
      <div className={styles.hint} dangerouslySetInnerHTML={{
        __html: calibText(midStep, comp) + (applied ? '<br><b>Applied.</b>' : ''),
      }} />
      <button type="button" className={styles.ghost} onClick={applyCalibration}>Apply calibration</button>

      <div className={styles.footer}>
        Everything is computed on your device.<br />No image is ever uploaded.
      </div>
    </div>
  );
}
