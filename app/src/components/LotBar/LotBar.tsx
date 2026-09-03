import { useBatchStore } from '../../state/batchStore';
import { useToneStore } from '../../state/toneStore';
import styles from './LotBar.module.scss';

export function LotBar() {
  const items = useBatchStore((s) => s.items);
  const cur = useBatchStore((s) => s.cur);
  const detachCurrent = useBatchStore((s) => s.detachCurrent);
  const applyToAll = useBatchStore((s) => s.applyToAll);
  const toggleSkip = useBatchStore((s) => s.toggleSkip);
  const removeCurrent = useBatchStore((s) => s.removeCurrent);
  const tone = useToneStore((s) => s.tone);
  const setTone = useToneStore((s) => s.setTone);

  const item = items[cur] ?? null;
  if (!items.length) return null;

  const many = items.length > 1;
  const active = item?.own ?? tone;

  return (
    <div className={styles.bar}>
      <button type="button" className={styles.btn} onClick={removeCurrent}>Discard</button>
      {many && (
        <>
          <button
            type="button"
            className={styles.btn}
            aria-pressed={!!item?.own}
            onClick={() => detachCurrent(tone)}
          >
            Own settings
          </button>
          <button
            type="button"
            className={styles.btn}
            onClick={() => { setTone(active); applyToAll(); }}
          >
            Apply to all
          </button>
          <button
            type="button"
            className={styles.btn}
            aria-pressed={!!item?.skip}
            onClick={() => item && toggleSkip(item.id)}
          >
            Exclude
          </button>
        </>
      )}
    </div>
  );
}
