import { useEffect, useRef } from 'react';
import type { Algo } from '../../engine/types';
import { paint } from '../../engine/paint';
import { renderSwatch } from '../../services/swatch';
import { Slider } from '../Slider/Slider';
import { useBatchStore } from '../../state/batchStore';
import { useToneStore } from '../../state/toneStore';
import styles from './StylePanel.module.scss';

const ALGOS: { id: Algo; label: string }[] = [
  { id: 'fs', label: 'Floyd–Steinberg' },
  { id: 'atkinson', label: 'Atkinson' },
  { id: 'stucki', label: 'Stucki' },
  { id: 'jarvis', label: 'Jarvis' },
  { id: 'bayer', label: 'Bayer 4' },
  { id: 'bayer8', label: 'Bayer 8' },
  { id: 'bluenoise', label: 'Blue noise' },
  { id: 'halftone', label: 'Halftone' },
  { id: 'seuil', label: 'Seuil' },
  { id: 'glyphes', label: 'Glyphes' },
  { id: 'ascii', label: 'ASCII' },
  { id: 'gbcam', label: 'GB Cam' },
];

const SWATCH_H = 52;

/** Draws that algorithm's own dither texture on a black-to-white gradient,
 *  at the button's real rendered width — redrawn on resize/cell/scale change
 *  (index.html:2486-2518). */
function AlgoSwatch({ algo, cell, scale }: { algo: Algo; cell: number; scale: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const btn = canvas?.parentElement;
    if (!canvas || !btn) return;
    const draw = () => {
      const w = Math.max(40, Math.round(btn.clientWidth));
      paint(canvas, renderSwatch(algo, w, SWATCH_H, cell, scale));
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(btn);
    return () => ro.disconnect();
  }, [algo, cell, scale]);

  return <canvas ref={canvasRef} className={styles.swatch} />;
}

export function StylePanel() {
  const tone = useToneStore((s) => s.tone);
  const setTone = useToneStore((s) => s.setTone);
  const item = useBatchStore((s) => s.items[s.cur] ?? null);
  const updateItem = useBatchStore((s) => s.updateItem);

  const active = item?.own ?? tone;
  const setActive = (patch: Partial<typeof tone>) => {
    if (item?.own) updateItem(item.id, { own: { ...item.own, ...patch } });
    else setTone(patch);
  };

  const grid = active.algo === 'glyphes' || active.algo === 'ascii';
  const gbcam = active.algo === 'gbcam';
  const cell = active.cell ?? 8;
  const scale = active.scale ?? 1;

  return (
    <div>
      <div className={styles.legend}>Algorithm</div>
      <div className={styles.grid}>
        {ALGOS.map((a) => (
          <button
            key={a.id}
            type="button"
            className={styles.algoBtn}
            aria-pressed={active.algo === a.id}
            onClick={() => setActive({ algo: a.id })}
          >
            <AlgoSwatch algo={a.id} cell={cell} scale={scale} />
            <span>{a.label}</span>
          </button>
        ))}
      </div>

      {gbcam && (
        <div style={{ marginTop: 24 }}>
          <Slider label="Edge" value={active.edge ?? 16} min={0} max={35} onChange={(v) => setActive({ edge: v })} glyph="E"
            format={(v) => (v / 10).toFixed(1)} />
          <Slider label="Vignette" value={active.vig ?? 30} min={0} max={60} onChange={(v) => setActive({ vig: v })} glyph="V" />
          <div className={styles.hint}>
            128px wide in four grey levels, each pixel rendered as a 3×3 block of dots — 128×3 lands
            exactly on 384. The heaviest style for ink: raise the white point if coverage climbs past 25%.
          </div>
        </div>
      )}

      <div className={styles.hint}>
        <b>Blue noise</b> is a fixed matrix like Bayer, so the pattern never jumps between frames — the
        fix for shimmering video. But its spectrum carries no visible structure, so it grains like Floyd
        without the lattice.
        <br /><br />
        <b>Halftone</b> grows round dots from the centre of each cell. Clustered dots always print, where
        Floyd's single isolated pixels can be missed by the head.
      </div>

      {!grid && !gbcam && (
        <div style={{ marginTop: 24 }}>
          <Slider label="Pixel size" value={scale} min={1} max={6} onChange={(v) => setActive({ scale: v })} glyph="P"
            format={(v) => v.toFixed(1)}
            hint="Dithered at reduced resolution, then expanded. Coarsens the grain." />
        </div>
      )}

      {grid && (
        <div style={{ marginTop: 24 }}>
          <Slider label="Cell size" value={cell} min={4} max={24} onChange={(v) => setActive({ cell: v })} glyph="C"
            hint="Larger cells read more graphic and hold less detail." />
        </div>
      )}
    </div>
  );
}
