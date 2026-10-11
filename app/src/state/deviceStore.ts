import { create } from 'zustand';
import type { Darkness } from '../printer/protocol';
import { storage } from '../services/storage';

/** Describes the printer/paper, not a photo — one object, one storage key. */
export interface DeviceSettings {
  comp: number;
  gap: number;
  mtop: number;
  mbot: number;
  num: boolean;
  outMode: 'bande' | 'frames';
  fps: number;
  capture: 'photo' | 'video';
  /** Bluetooth printer head energy, 1 (light) to 4 (dark). */
  darkness: Darkness;
}

export const DEFAULT_DEVICE: DeviceSettings = {
  comp: 0, gap: 16, mtop: 0, mbot: 0, num: false, outMode: 'bande', fps: 8, capture: 'photo', darkness: 4,
};

const STORAGE_KEY = 'pp:device';

interface DeviceStore {
  device: DeviceSettings;
  setDevice: (patch: Partial<DeviceSettings>) => void;
  load: () => void;
}

export const useDeviceStore = create<DeviceStore>((set, get) => ({
  device: { ...DEFAULT_DEVICE },
  setDevice: (patch) => {
    const device = { ...get().device, ...patch };
    set({ device });
    storage.set(STORAGE_KEY, device);
  },
  load: () => {
    const saved = storage.get<Partial<DeviceSettings>>(STORAGE_KEY);
    if (saved) set({ device: { ...DEFAULT_DEVICE, ...saved } });
  },
}));
