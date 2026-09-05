import { buildExportOutputs } from '../services/export';
import { useBatchStore } from '../state/batchStore';
import { useDeviceStore } from '../state/deviceStore';
import { useExportSheetStore } from '../state/exportSheetStore';
import { useToneStore } from '../state/toneStore';

export function useExport() {
  const tone = useToneStore((s) => s.tone);
  const device = useDeviceStore((s) => s.device);
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
      show(buildExportOutputs(items, tone, device.comp, device));
    }, 30);
  };

  return { doExport, canExport };
}
