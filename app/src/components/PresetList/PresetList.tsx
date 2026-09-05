import type { ToneSettings } from '../../engine/types';
import { FACTORY_PRESETS, usePresetsStore } from '../../state/presetsStore';
import styles from './PresetList.module.scss';

/** Force the same two rows the original chip list falls into on a phone
 *  screen (Fine grain/White sky, then Architecture/Silhouette/GB Cam),
 *  instead of leaving it to the container's actual width. */
const ROW_BREAK_AFTER = new Set([1, 4]);

export function PresetList({ setActive }: { setActive: (patch: Partial<ToneSettings>) => void }) {
  const presets = usePresetsStore((s) => s.presets);
  const remove = usePresetsStore((s) => s.remove);

  if (!presets.length) return null;

  const removeWithConfirm = (index: number, name: string) => {
    if (window.confirm(`Delete preset "${name}"?`)) remove(index);
  };

  return (
    <div className={styles.list}>
      {presets.flatMap((p, i) => {
        const custom = i >= FACTORY_PRESETS.length;
        const chip = (
          <div key={`${p.name}-${i}`} className={styles.chip}>
            <b onClick={() => setActive(p.s)}>{p.name}</b>
            {custom && <i onClick={() => removeWithConfirm(i, p.name)}>×</i>}
          </div>
        );
        return ROW_BREAK_AFTER.has(i)
          ? [chip, <div key={`break-${i}`} className={styles.rowBreak} />]
          : [chip];
      })}
    </div>
  );
}
