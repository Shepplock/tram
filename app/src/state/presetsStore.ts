import { create } from 'zustand';
import type { ToneSettings } from '../engine/types';
import { storage } from '../services/storage';

export interface Preset {
  name: string;
  s: Partial<ToneSettings>;
}

const STORAGE_KEY = 'trame:presets';

/** Factory presets. Each carries every field its group touches, since a
 *  partial preset would leave scale/cell trailing from whatever was set
 *  before it (index.html:2103-2112). Always present, never deletable —
 *  only what the user saves themselves (`custom`) can be removed. */
const BASE: Partial<ToneSettings> = {
  w: 384, cell: 8, scale: 1, edge: 16, vig: 30, invert: false, gsort: 0, gshear: 0, gseed: 1,
};

export const FACTORY_PRESETS: Preset[] = [
  { name: 'Fine grain', s: { ...BASE, sky: 20, white: 200, floor: 42, gamma: 62, sharp: 8, blur: 1, algo: 'fs' } },
  { name: 'White sky', s: { ...BASE, sky: 100, white: 168, floor: 43, gamma: 74, sharp: 14, blur: 0, algo: 'fs' } },
  { name: 'Architecture', s: { ...BASE, sky: 65, white: 180, floor: 40, gamma: 80, sharp: 14, blur: 0, algo: 'fs' } },
  { name: 'Silhouette', s: { ...BASE, sky: 30, white: 190, floor: 0, gamma: 90, sharp: 10, blur: 1, algo: 'seuil' } },
  { name: 'GB Cam', s: { ...BASE, sky: 20, white: 205, floor: 0, gamma: 80, sharp: 0, blur: 0, algo: 'gbcam' } },
];

interface PresetsStore {
  /** Factory presets first, then whatever the user has saved. */
  presets: Preset[];
  custom: Preset[];
  load: () => void;
  save: (name: string, tone: ToneSettings) => void;
  /** Removes a user-saved preset by its index within `presets` — a no-op
   *  on a factory index. */
  remove: (index: number) => void;
}

export const usePresetsStore = create<PresetsStore>((set, get) => ({
  presets: FACTORY_PRESETS,
  custom: [],
  load: () => {
    // Older builds persisted the whole list (factory + custom) as one blob
    // and let any of it be deleted, which could wipe the factory presets
    // out of storage with no way back. Filtering by name here repairs that:
    // anything still saved under a factory name is dropped in favour of the
    // real factory definition, so those five are always present again.
    const saved = storage.get<Preset[]>(STORAGE_KEY) ?? [];
    const factoryNames = new Set(FACTORY_PRESETS.map((p) => p.name));
    const custom = saved.filter((p) => !factoryNames.has(p.name));
    set({ presets: [...FACTORY_PRESETS, ...custom], custom });
  },
  save: (name, tone) => {
    const custom = [...get().custom, { name: name.slice(0, 22), s: { ...tone } }];
    set({ custom, presets: [...FACTORY_PRESETS, ...custom] });
    storage.set(STORAGE_KEY, custom);
  },
  remove: (index) => {
    const customIndex = index - FACTORY_PRESETS.length;
    if (customIndex < 0) return;
    const custom = get().custom.filter((_, i) => i !== customIndex);
    set({ custom, presets: [...FACTORY_PRESETS, ...custom] });
    storage.set(STORAGE_KEY, custom);
  },
}));
