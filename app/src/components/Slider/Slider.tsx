import { useMemo, type CSSProperties } from 'react';
import { useSkinStore } from '../../state/skins';
import { thumbGlyphUri } from '../../services/thumbGlyph';
import styles from './Slider.module.scss';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  hint?: string;
  /** Single letter painted on the thumb, e.g. "W" for White point (index.html:2532). */
  glyph?: string;
}

export function Slider({ label, value, min, max, step = 1, onChange, format, hint, glyph }: SliderProps) {
  const skin = useSkinStore((s) => s.skin);
  const thumbStyle = useMemo(
    () => (glyph ? ({ '--thumb': thumbGlyphUri(glyph) } as CSSProperties) : undefined),
    [glyph, skin],
  );

  return (
    <div className={styles.row}>
      <div className={styles.label}>
        <span>{label}</span>
        <i>{format ? format(value) : value}</i>
      </div>
      <input
        className={`${styles.range} ${glyph ? styles.glyph : ''}`}
        style={thumbStyle}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && <div className={styles.hint}>{hint}</div>}
    </div>
  );
}
