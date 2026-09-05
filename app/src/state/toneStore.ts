import { create } from 'zustand';
import type { ToneSettings } from '../engine/types';

export const DEFAULT_TONE: ToneSettings = {
  w: 384, sky: 65, white: 180, floor: 40, gamma: 80, sharp: 14, blur: 0,
  invert: false, algo: 'fs', cell: 8, scale: 1, edge: 16, vig: 30,
  gsort: 0, gshear: 0, gseed: 1, clip: false,
};

interface ToneStore {
  tone: ToneSettings;
  setTone: (patch: Partial<ToneSettings>) => void;
  replaceTone: (tone: ToneSettings) => void;
  resetTone: () => void;
}

export const useToneStore = create<ToneStore>((set) => ({
  tone: { ...DEFAULT_TONE },
  setTone: (patch) => set((s) => ({ tone: { ...s.tone, ...patch } })),
  replaceTone: (tone) => set({ tone }),
  resetTone: () => set({ tone: { ...DEFAULT_TONE } }),
}));
