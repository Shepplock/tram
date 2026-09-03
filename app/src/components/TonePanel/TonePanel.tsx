import { useState } from 'react';
import { solveWhite } from '../../engine/whitepoint';
import { Slider } from '../Slider/Slider';
import { useBatchStore } from '../../state/batchStore';
import { useDeviceStore } from '../../state/deviceStore';
import { useToneStore } from '../../state/toneStore';
import { withCompensation } from '../../services/renderItem';
import styles from './TonePanel.module.scss';

const AUTO_TARGET_PCT = 16;

export function TonePanel() {
  const tone = useToneStore((s) => s.tone);
  const setTone = useToneStore((s) => s.setTone);
  const item = useBatchStore((s) => s.items[s.cur] ?? null);
  const updateItem = useBatchStore((s) => s.updateItem);
  const comp = useDeviceStore((s) => s.device.comp);

  const [moreOpen, setMoreOpen] = useState(false);
  const [autoMsg, setAutoMsg] = useState('Auto finds the white point that lands coverage in the target zone.');

  const active = item?.own ?? tone;
  const setActive = (patch: Partial<typeof tone>) => {
    if (item?.own) updateItem(item.id, { own: { ...item.own, ...patch } });
    else setTone(patch);
  };

  // Derived from the active item's own values every render — not local state
  // seeded once — so switching batch items with different glitch settings
  // keeps the toggle in sync (index.html:1641-1643).
  const glitchOn = active.gsort > 0 || active.gshear > 0;
  const toggleGlitch = () => {
    if (glitchOn) setActive({ gsort: 0, gshear: 0 });
    else setActive({ gsort: 55, gshear: 18 });
  };

  const runAuto = () => {
    if (!item) { setAutoMsg('Load or shoot a photo first.'); return; }
    setAutoMsg('Searching…');
    setTimeout(() => {
      const r = solveWhite(
        { source: item.source, crop: { x: 0, y: 0, w: item.width, h: item.height } },
        withCompensation(active, comp),
        AUTO_TARGET_PCT,
      );
      const white = Math.max(50, Math.min(255, r.white - comp));
      setActive({ white });
      setAutoMsg(r.capped
        ? `White point set to ${white}, the closest this photo allows — ${r.pct.toFixed(1)}% coverage. Lower Floor or raise Gamma to reach further.`
        : `White point set to ${white} — ${r.pct.toFixed(1)}% coverage, inside the target zone. Adjust from there.`);
    }, 20);
  };

  return (
    <div>
      <div className={styles.legend}>Start here</div>
      <div className={styles.seg}>
        <button type="button" className={styles.toggle} onClick={runAuto}>Auto</button>
      </div>
      <div className={styles.hint}>{autoMsg}</div>

      <div className={styles.legend}>Main</div>
      <Slider label="White point" value={active.white} min={50} max={255} onChange={(v) => setActive({ white: v })} glyph="W"
        hint="The one setting that guarantees zero dots. At 254 some still remain." />
      <Slider label="Sky" value={active.sky} min={0} max={100} onChange={(v) => setActive({ sky: v })} glyph="S"
        hint="Weights the blue channel when converting. At 0, a blue sky lands in mid-grey and fills with dots." />

      <div className={styles.seg}>
        <button type="button" className={styles.toggle} aria-pressed={moreOpen} onClick={() => setMoreOpen((o) => !o)}>
          More settings
        </button>
      </div>

      {moreOpen && (
        <div>
          <Slider label="Floor" value={active.floor} min={0} max={70} onChange={(v) => setActive({ floor: v })}
            hint="Prevents pure black, which buckles the paper." />
          <Slider label="Gamma" value={active.gamma} min={40} max={160} onChange={(v) => setActive({ gamma: v })}
            format={(v) => (v / 100).toFixed(2)} />
          <Slider label="Detail" value={active.sharp} min={0} max={30} onChange={(v) => setActive({ sharp: v })}
            format={(v) => (v / 10).toFixed(1)}
            hint="Rescues fine detail lost when scaling down: wires, grilles, type." />
          <Slider label="Blur" value={active.blur} min={0} max={3} onChange={(v) => setActive({ blur: v })}
            hint="Raise only for dark, noisy photos." />
        </div>
      )}

      <div className={styles.legend}>Glitch</div>
      <div className={styles.seg}>
        <button type="button" className={styles.toggle} aria-pressed={glitchOn} onClick={toggleGlitch}>
          Enable glitch
        </button>
      </div>
      {glitchOn && (
        <div>
          <Slider label="Melt" value={active.gsort} min={0} max={95} onChange={(v) => setActive({ gsort: v })}
            hint="Sorts runs of pixels along each row, stretching them into streaks. The value is a percentile, so it adapts to each photo." />
          <Slider label="Shear" value={active.gshear} min={0} max={60} onChange={(v) => setActive({ gshear: v })}
            hint="Displaces bands of rows sideways." />
          <Slider label="Seed" value={active.gseed} min={1} max={99} onChange={(v) => setActive({ gseed: v })} />
          <div className={styles.hint}>Neither effect changes ink coverage — both only shuffle existing pixels, so nothing needs recalibrating.</div>
        </div>
      )}

      <div className={styles.seg} style={{ marginTop: 20 }}>
        <button type="button" className={styles.toggle} aria-pressed={active.invert} onClick={() => setActive({ invert: !active.invert })}>
          Invert
        </button>
        <button type="button" className={styles.toggle} aria-pressed={!!active.clip} onClick={() => setActive({ clip: !active.clip })}>
          Show clipping
        </button>
      </div>
      <div className={styles.hint}>
        Clipping tints the preview only: blue where the tone has hit pure white and no dot can appear,
        red where it has bottomed out into solid black. Exports are never tinted.
      </div>
    </div>
  );
}
