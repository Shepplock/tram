import { create } from 'zustand';
import type { ToneSettings } from '../engine/types';

/** The confirmed shared tone, the current item's own override (if any), and
 *  which item was current — one step of undo history (index.html:1449-1452). */
export interface HistorySnapshot {
  cur: number;
  own: ToneSettings | null;
  tone: ToneSettings;
}

interface HistoryStore {
  undoStack: HistorySnapshot[];
  redoStack: HistorySnapshot[];
  committed: HistorySnapshot | null;
  /** Debounced 350ms so a burst of slider drags counts as one undo step
   *  (index.html:1459-1470). */
  schedule: (snap: HistorySnapshot) => void;
  undo: () => HistorySnapshot | null;
  redo: () => HistorySnapshot | null;
  clear: () => void;
}

let timer: ReturnType<typeof setTimeout> | undefined;

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  undoStack: [],
  redoStack: [],
  committed: null,
  schedule: (snap) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const { committed, undoStack } = get();
      if (committed) {
        const next = [...undoStack, committed];
        if (next.length > 40) next.shift();
        set({ undoStack: next, redoStack: [], committed: snap });
      } else {
        set({ committed: snap });
      }
    }, 350);
  },
  undo: () => {
    const { undoStack, committed, redoStack } = get();
    if (!undoStack.length || !committed) return null;
    const prev = undoStack[undoStack.length - 1];
    set({ undoStack: undoStack.slice(0, -1), redoStack: [...redoStack, committed], committed: prev });
    return prev;
  },
  redo: () => {
    const { redoStack, committed, undoStack } = get();
    if (!redoStack.length || !committed) return null;
    const next = redoStack[redoStack.length - 1];
    set({ redoStack: redoStack.slice(0, -1), undoStack: [...undoStack, committed], committed: next });
    return next;
  },
  clear: () => {
    clearTimeout(timer);
    set({ undoStack: [], redoStack: [], committed: null });
  },
}));
