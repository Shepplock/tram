import { create } from 'zustand';

interface UiStore {
  cameraOpen: boolean;
  setCameraOpen: (open: boolean) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  cameraOpen: false,
  setCameraOpen: (open) => set({ cameraOpen: open }),
}));
