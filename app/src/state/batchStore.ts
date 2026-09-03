import { create } from 'zustand';
import type { CropRect, ImageSource, ToneSettings } from '../engine/types';

/** Fractional crop box (0..1 of the rotated source), never pixels — this is
 *  what makes it independent of rotation and of any later resize/shrink of
 *  the decoded source. */
export type FractionalCrop = CropRect;

export const FULL_CROP: FractionalCrop = { x: 0, y: 0, w: 1, h: 1 };

export interface BatchItem {
  id: string;
  name: string;
  source: ImageSource;
  width: number;
  height: number;
  rot: 0 | 90 | 180 | 270;
  crop: FractionalCrop;
  /** Per-item tone override; null means "use the shared tone settings". */
  own: ToneSettings | null;
  skip: boolean;
}

interface BatchStore {
  items: BatchItem[];
  cur: number;
  addItems: (items: Omit<BatchItem, 'crop'>[]) => void;
  removeCurrent: () => void;
  setCur: (i: number) => void;
  updateItem: (id: string, patch: Partial<BatchItem>) => void;
  detachCurrent: (tone: ToneSettings) => void;
  applyToAll: (tone: ToneSettings) => void;
  toggleSkip: (id: string) => void;
  clear: () => void;
}

let nextId = 0;

export const useBatchStore = create<BatchStore>((set, get) => ({
  items: [],
  cur: 0,
  addItems: (newItems) => {
    const withCrop: BatchItem[] = newItems.map((it) => ({
      ...it,
      id: it.id || `img-${nextId++}`,
      crop: FULL_CROP,
    }));
    set((s) => ({ items: [...s.items, ...withCrop], cur: s.items.length === 0 ? 0 : s.cur }));
  },
  removeCurrent: () => {
    const { items, cur } = get();
    if (!items.length) return;
    const next = items.filter((_, i) => i !== cur);
    set({ items: next, cur: Math.min(cur, Math.max(0, next.length - 1)) });
  },
  setCur: (i) => set((s) => ({ cur: Math.max(0, Math.min(i, s.items.length - 1)) })),
  updateItem: (id, patch) => set((s) => ({
    items: s.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
  })),
  detachCurrent: (tone) => set((s) => ({
    items: s.items.map((it, i) => (i === s.cur ? { ...it, own: { ...tone } } : it)),
  })),
  applyToAll: (tone) => set((s) => ({
    items: s.items.map((it) => ({ ...it, own: { ...tone } })),
  })),
  toggleSkip: (id) => set((s) => ({
    items: s.items.map((it) => (it.id === id ? { ...it, skip: !it.skip } : it)),
  })),
  clear: () => set({ items: [], cur: 0 }),
}));
