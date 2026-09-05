import type { ToneSettings } from '../engine/types';
import { useBatchStore } from '../state/batchStore';
import { useHistoryStore } from '../state/historyStore';
import { useToneStore } from '../state/toneStore';

/** The tone settings actually driving the current preview: the batch item's
 *  own override if it has one, otherwise the shared tone — plus a setter
 *  that writes to whichever of those is active and schedules an undo step
 *  (index.html:1449-1470's `cfg()`/`schedule()`, shared by Tone/Style/preset
 *  controls so every one of them contributes to the same history). */
export function useActiveTone() {
  const tone = useToneStore((s) => s.tone);
  const setTone = useToneStore((s) => s.setTone);
  const item = useBatchStore((s) => s.items[s.cur] ?? null);
  const cur = useBatchStore((s) => s.cur);
  const updateItem = useBatchStore((s) => s.updateItem);
  const schedule = useHistoryStore((s) => s.schedule);

  const active = item?.own ?? tone;
  const setActive = (patch: Partial<ToneSettings>) => {
    if (item?.own) {
      const own = { ...item.own, ...patch };
      updateItem(item.id, { own });
      schedule({ cur, own, tone });
    } else {
      const next = { ...tone, ...patch };
      setTone(patch);
      schedule({ cur, own: null, tone: next });
    }
  };

  return { active, setActive };
}
