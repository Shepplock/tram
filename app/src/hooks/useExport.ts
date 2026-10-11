import { buildExportOutputs } from '../services/export';
import { useBatchStore } from '../state/batchStore';
import { useDeviceStore } from '../state/deviceStore';
import { useExportSheetStore } from '../state/exportSheetStore';
import { useToneStore } from '../state/toneStore';

/** Reads the stores at call time, so the sheet can re-run it after settings change. */
function buildFromStores(): HTMLCanvasElement[] {
  const { device } = useDeviceStore.getState();
  return buildExportOutputs(useBatchStore.getState().items, useToneStore.getState().tone, device.comp, device);
}

export function useExport() {
  const items = useBatchStore((s) => s.items);
  const showRendering = useExportSheetStore((s) => s.showRendering);
  const show = useExportSheetStore((s) => s.show);

  const canExport = items.some((it) => !it.skip);

  const doExport = () => {
    if (!canExport) return;
    showRendering();
    // Mirrors the original's setTimeout(30) — lets the "Rendering…" message
    // paint before the synchronous canvas work below (index.html:2089-2094).
    setTimeout(() => {
      show(buildFromStores(), buildFromStores);
    }, 30);
  };

  return { doExport, canExport };
}
