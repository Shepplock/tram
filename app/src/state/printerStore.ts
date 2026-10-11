import { create } from 'zustand';
import { ChooserCancelled, bluetoothSupported, connect, disconnect, sendJob } from '../printer/bluetooth';
import { PRINT_WIDTH, rgbaToBitmap, type Bitmap, type Darkness } from '../printer/protocol';

export type PrinterStatus = 'unsupported' | 'disconnected' | 'connecting' | 'connected' | 'printing';

interface PrinterStore {
  status: PrinterStatus;
  name: string | null;
  /** 0..1 across the whole job (all frames). */
  progress: number;
  /** Last user-facing message: an error, or "Printed." */
  message: string | null;
  error: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  print: (canvases: HTMLCanvasElement[], darkness: Darkness) => Promise<void>;
}

function toBitmap(c: HTMLCanvasElement): Bitmap {
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('canvas unreadable');
  return rgbaToBitmap(ctx.getImageData(0, 0, PRINT_WIDTH, c.height).data, c.height);
}

export const usePrinterStore = create<PrinterStore>((set, get) => ({
  status: bluetoothSupported ? 'disconnected' : 'unsupported',
  name: null,
  progress: 0,
  message: null,
  error: false,

  connect: async () => {
    if (get().status !== 'disconnected') return;
    set({ status: 'connecting', message: null, error: false });
    try {
      const name = await connect(() => set({ status: 'disconnected', name: null }));
      set({ status: 'connected', name });
    } catch (e) {
      const cancelled = e instanceof ChooserCancelled;
      set({
        status: 'disconnected',
        message: cancelled ? null : e instanceof Error ? e.message : String(e),
        error: !cancelled,
      });
    }
  },

  disconnect: () => disconnect(),

  print: async (canvases, darkness) => {
    if (get().status !== 'connected' || !canvases.length) return;
    if (canvases.some((c) => c.width !== PRINT_WIDTH)) return;
    set({ status: 'printing', progress: 0, message: null, error: false });
    try {
      for (let i = 0; i < canvases.length; i++) {
        await sendJob(toBitmap(canvases[i]), darkness, (p) =>
          set({ progress: (i + p) / canvases.length }));
      }
      set({ message: 'Printed.' });
    } catch (e) {
      set({ message: `Printing stopped: ${e instanceof Error ? e.message : String(e)}`, error: true });
    }
    // A disconnect mid-job already moved status to 'disconnected'.
    if (get().status === 'printing') set({ status: 'connected' });
  },
}));
