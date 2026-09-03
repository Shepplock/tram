import { useEffect, useRef, useState } from 'react';
import type { ProcessResult } from '../engine/types';
import { renderItem } from '../services/renderItem';
import { useBatchStore } from '../state/batchStore';
import { useDeviceStore } from '../state/deviceStore';
import { useToneStore } from '../state/toneStore';

/**
 * Debounces engine renders to one per animation frame, mirroring the
 * original app's `schedule`/`render` pair — a slider drag fires many state
 * updates, but the (relatively expensive) dither pass only needs to run
 * once per frame.
 */
export function usePreviewResult(): ProcessResult | null {
  const item = useBatchStore((s) => s.items[s.cur] ?? null);
  const tone = useToneStore((s) => s.tone);
  const comp = useDeviceStore((s) => s.device.comp);

  const [result, setResult] = useState<ProcessResult | null>(null);
  const queued = useRef(false);

  useEffect(() => {
    if (!item || item.skip) { setResult(null); return; }
    if (queued.current) return;
    queued.current = true;
    requestAnimationFrame(() => {
      queued.current = false;
      const st = item.own ?? tone;
      setResult(renderItem(item, st, comp));
    });
  }, [item, tone, comp]);

  return result;
}
