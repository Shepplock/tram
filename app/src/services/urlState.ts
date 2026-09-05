import type { ToneSettings } from '../engine/types';
import type { DeviceSettings } from '../state/deviceStore';

/** Short single-letter keys, kept from the original so old shared links
 *  keep working (index.html:2451-2452). */
const URLKEYS: Record<string, keyof ToneSettings> = {
  w: 'w', s: 'sky', p: 'white', f: 'floor', g: 'gamma', a: 'sharp', b: 'blur',
  k: 'algo', z: 'cell', y: 'scale', q: 'gsort', r: 'gshear', d: 'gseed',
};
const DEVKEYS: Record<string, keyof DeviceSettings> = { c: 'comp', e: 'gap', t: 'mtop', m: 'mbot' };

export function stateToHash(tone: ToneSettings, device: DeviceSettings): string {
  const o: string[] = [];
  for (const key in URLKEYS) o.push(`${key}=${encodeURIComponent(String(tone[URLKEYS[key]]))}`);
  for (const key in DEVKEYS) o.push(`${key}=${device[DEVKEYS[key]]}`);
  o.push(`i=${tone.invert ? 1 : 0}`);
  o.push(`n=${device.num ? 1 : 0}`);
  return `#${o.join('&')}`;
}

export interface HashState {
  tone: Partial<ToneSettings>;
  device: Partial<DeviceSettings>;
}

export function hashToState(hash: string): HashState | null {
  if (!hash || hash.length < 3) return null;
  const q: Record<string, string> = {};
  hash.replace(/^#/, '').split('&').forEach((kv) => {
    const [key, value] = kv.split('=');
    q[key] = decodeURIComponent(value || '');
  });

  const tone: Partial<ToneSettings> = {};
  let hit = false;
  for (const key in URLKEYS) {
    const v = q[key];
    if (v === undefined) continue;
    const field = URLKEYS[key];
    (tone as Record<string, unknown>)[field] = field === 'algo' ? v : Number(v);
    hit = true;
  }
  if (q.i !== undefined) { tone.invert = q.i === '1'; hit = true; }

  const device: Partial<DeviceSettings> = {};
  for (const key in DEVKEYS) {
    const v = q[key];
    if (v === undefined) continue;
    (device as Record<string, unknown>)[DEVKEYS[key]] = Number(v);
    hit = true;
  }
  if (q.n !== undefined) { device.num = q.n === '1'; hit = true; }

  return hit ? { tone, device } : null;
}
