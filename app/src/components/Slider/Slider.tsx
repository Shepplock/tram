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
}

export function Slider({ label, value, min, max, step = 1, onChange, format, hint }: SliderProps) {
  return (
    <div className={styles.row}>
      <div className={styles.label}>
        <span>{label}</span>
        <i>{format ? format(value) : value}</i>
      </div>
      <input
        className={styles.range}
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
