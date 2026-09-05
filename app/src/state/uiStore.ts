import { create } from 'zustand';

interface UiStore {
  cameraOpen: boolean;
  setCameraOpen: (open: boolean) => void;
  cropOpen: boolean;
  setCropOpen: (open: boolean) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  cameraOpen: false,
  setCameraOpen: (open) => set({ cameraOpen: open }),
  cropOpen: false,
  setCropOpen: (open) => set({ cropOpen: open }),
}));
