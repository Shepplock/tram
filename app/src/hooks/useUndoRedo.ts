import type { HistorySnapshot } from '../state/historyStore';
import { useHistoryStore } from '../state/historyStore';
import { useBatchStore } from '../state/batchStore';
import { useToneStore } from '../state/toneStore';

/** Restores a history snapshot to the tone/batch stores, mirroring the
 *  original's `restore()` (index.html:1453-1458). */
export function useUndoRedo() {
  const canUndo = useHistoryStore((s) => s.undoStack.length > 0);
  const canRedo = useHistoryStore((s) => s.redoStack.length > 0);
  const doUndo = useHistoryStore((s) => s.undo);
  const doRedo = useHistoryStore((s) => s.redo);
  const replaceTone = useToneStore((s) => s.replaceTone);
  const items = useBatchStore((s) => s.items);
  const setCur = useBatchStore((s) => s.setCur);
  const updateItem = useBatchStore((s) => s.updateItem);

  const apply = (snap: HistorySnapshot | null) => {
    if (!snap) return;
    replaceTone(snap.tone);
    const item = items[snap.cur];
    if (item) updateItem(item.id, { own: snap.own });
    if (snap.cur < items.length) setCur(snap.cur);
  };

  return { canUndo, canRedo, undo: () => apply(doUndo()), redo: () => apply(doRedo()) };
}
