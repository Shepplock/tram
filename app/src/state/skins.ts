import { create } from 'zustand';
import { storage } from '../services/storage';

export const SKINS = ['dmg', 'pocket', 'light', 'atomic', 'onebit'] as const;
export type Skin = typeof SKINS[number];

const STORAGE_KEY = 'trame:skin';

interface SkinStore {
  skin: Skin;
  setSkin: (s: Skin) => void;
  load: () => void;
}

export const useSkinStore = create<SkinStore>((set) => ({
  skin: 'dmg',
  setSkin: (skin) => {
    document.documentElement.setAttribute('data-skin', skin);
    storage.set(STORAGE_KEY, skin);
    set({ skin });
  },
  load: () => {
    const saved = storage.get<Skin>(STORAGE_KEY);
    const skin = saved && SKINS.includes(saved) ? saved : 'dmg';
    document.documentElement.setAttribute('data-skin', skin);
    set({ skin });
  },
}));
