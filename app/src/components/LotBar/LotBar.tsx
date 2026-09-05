import { useBatchStore } from '../../state/batchStore';
import { useHistoryStore } from '../../state/historyStore';
import { useToneStore } from '../../state/toneStore';
import { useUndoRedo } from '../../hooks/useUndoRedo';
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
  const clearHistory = useHistoryStore((s) => s.clear);
  const { canUndo, canRedo, undo, redo } = useUndoRedo();

  // Hidden until there's at least one photo — Undo/Redo alone would
  // otherwise sit in this row (each taking half its width) on the plain
  // live-viewfinder screen, before any photo-related action has happened
  // (the original's `.lotbar` stays `display:none` until then too).
  if (!items.length) return null;

  const item = items[cur] ?? null;
  const many = items.length > 1;
  const active = item?.own ?? tone;

  const discard = () => {
    removeCurrent();
    clearHistory();
  };

  return (
    <div className={styles.bar}>
      <button type="button" className={styles.btn} disabled={!canUndo} onClick={undo}>Undo</button>
      <button type="button" className={styles.btn} disabled={!canRedo} onClick={redo}>Redo</button>
      <button type="button" className={styles.btn} onClick={discard}>Discard</button>
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
