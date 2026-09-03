import { create } from 'zustand';

interface ExportSheetStore {
  outputs: HTMLCanvasElement[];
  index: number;
  rendering: boolean;
  show: (outputs: HTMLCanvasElement[]) => void;
  showRendering: () => void;
  close: () => void;
  next: () => void;
  prev: () => void;
}

export const useExportSheetStore = create<ExportSheetStore>((set, get) => ({
  outputs: [],
  index: 0,
  rendering: false,
  show: (outputs) => set({ outputs, index: 0, rendering: false }),
  showRendering: () => set({ outputs: [], rendering: true }),
  close: () => set({ outputs: [], rendering: false }),
  next: () => set((s) => ({ index: (s.index + 1) % Math.max(1, s.outputs.length) })),
  prev: () => set((s) => ({ index: (s.index - 1 + s.outputs.length) % Math.max(1, get().outputs.length) })),
}));
