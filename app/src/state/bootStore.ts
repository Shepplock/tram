import { create } from 'zustand';
import { storage } from '../services/storage';

const STORAGE_KEY = 'trame:boot';

interface BootStore {
  enabled: boolean;
  setEnabled: (on: boolean) => void;
  load: () => void;
}

export const useBootStore = create<BootStore>((set) => ({
  enabled: true,
  setEnabled: (enabled) => {
    storage.set(STORAGE_KEY, enabled);
    set({ enabled });
  },
  load: () => {
    const saved = storage.get<boolean>(STORAGE_KEY);
    if (saved === false) set({ enabled: false });
  },
}));
