import { paint } from '../engine/paint';
import { renderItem } from '../services/renderItem';
import { useBatchStore } from '../state/batchStore';
import { useDeviceStore } from '../state/deviceStore';
import { useToneStore } from '../state/toneStore';

export function useExport() {
  const tone = useToneStore((s) => s.tone);
  const comp = useDeviceStore((s) => s.device.comp);
  const item = useBatchStore((s) => s.items[s.cur] ?? null);

  const doExport = () => {
    if (!item) return;
    const st = item.own ?? tone;
    const r = renderItem(item, st, comp);
    const canvas = document.createElement('canvas');
    paint(canvas, r);
    const link = document.createElement('a');
    link.download = `printpak-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return { doExport, canExport: !!item };
}
