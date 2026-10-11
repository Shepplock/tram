import { create } from 'zustand';

/** Re-renders the sheet's outputs from the current stores, e.g. after a paper-width switch. */
type Rebuild = () => HTMLCanvasElement[];

interface ExportSheetStore {
  outputs: HTMLCanvasElement[];
  index: number;
  rendering: boolean;
  rebuild: Rebuild | null;
  show: (outputs: HTMLCanvasElement[], rebuild?: Rebuild) => void;
  showRendering: () => void;
  close: () => void;
  next: () => void;
  prev: () => void;
}

export const useExportSheetStore = create<ExportSheetStore>((set, get) => ({
  outputs: [],
  index: 0,
  rendering: false,
  rebuild: null,
  show: (outputs, rebuild) => set({ outputs, index: 0, rendering: false, rebuild: rebuild ?? null }),
  showRendering: () => set({ outputs: [], rendering: true }),
  close: () => set({ outputs: [], rendering: false, rebuild: null }),
  next: () => set((s) => ({ index: (s.index + 1) % Math.max(1, s.outputs.length) })),
  prev: () => set((s) => ({ index: (s.index - 1 + s.outputs.length) % Math.max(1, get().outputs.length) })),
}));
