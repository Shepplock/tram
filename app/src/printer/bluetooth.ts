/**
 * Web Bluetooth transport for the cat printer, ported from `printy`.
 * Holds the live GATT handles at module level (they don't belong in React
 * state) and exposes connect / disconnect / sendJob.
 */
import { encodeJob, type Bitmap, type Darkness } from './protocol';

const uuid = (s: string) => `0000${s}-0000-1000-8000-00805f9b34fb`;
const SERVICE_ADV = uuid('af30');
const SERVICE = uuid('ae30');
const TX = uuid('ae01');
const RX = uuid('ae02');
/** Delay between writes; faster floods the printer. */
const PACE_MS = 6;

export const bluetoothSupported = typeof navigator !== 'undefined' && !!navigator.bluetooth;

let device: BluetoothDevice | null = null;
let tx: BluetoothRemoteGATTCharacteristic | null = null;
let paused = false;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The printer sends 51 78 AE ... with 0x10 to ask us to pause, 0x00 to resume. */
function onNotify(ev: Event) {
  const value = (ev.target as BluetoothRemoteGATTCharacteristic).value;
  if (!value) return;
  const v = new Uint8Array(value.buffer);
  if (v[0] === 0x51 && v[1] === 0x78 && v[2] === 0xae) paused = v[6] === 0x10;
}

/** Thrown when the user dismisses the device chooser — not an error worth showing. */
export class ChooserCancelled extends Error {}

/** Opens the browser's device chooser and connects. Returns the printer name. */
export async function connect(onDisconnect: () => void): Promise<string> {
  let step = 'choosing the printer';
  try {
    const d = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: 'X6' }, { services: [SERVICE_ADV] }],
      optionalServices: [SERVICE, SERVICE_ADV],
    });
    d.addEventListener('gattserverdisconnected', () => {
      device = null;
      tx = null;
      onDisconnect();
    });
    step = 'connecting';
    if (!d.gatt) throw new Error('no GATT server');
    const server = await d.gatt.connect();
    step = 'finding the print service';
    const svc = await server.getPrimaryService(SERVICE);
    step = 'finding the write channel';
    const write = await svc.getCharacteristic(TX);
    step = 'finding the status channel';
    const rx = await svc.getCharacteristic(RX);
    try {
      await rx.startNotifications();
      rx.addEventListener('characteristicvaluechanged', onNotify);
    } catch (e) {
      console.warn('Printer notifications unavailable', e); // printing still works without them
    }
    device = d;
    tx = write;
    paused = false;
    return d.name || 'Printer';
  } catch (e) {
    tx = null;
    if (e instanceof DOMException && e.name === 'NotFoundError' && step === 'choosing the printer') {
      throw new ChooserCancelled();
    }
    const detail = e instanceof Error ? e.message || e.name : String(e);
    throw new Error(`Connection failed while ${step}: ${detail}`, { cause: e });
  }
}

export function disconnect(): void {
  device?.gatt?.disconnect();
}

async function send(bytes: Uint8Array): Promise<void> {
  if (!tx) throw new Error('printer disconnected');
  while (paused) await sleep(20);
  // Copy into a plain ArrayBuffer-backed view — BufferSource rejects shared buffers.
  const buf = new Uint8Array(bytes);
  if (tx.writeValueWithoutResponse) await tx.writeValueWithoutResponse(buf);
  else await tx.writeValue(buf);
  await sleep(PACE_MS);
}

/** Streams one bitmap to the printer, reporting progress 0..1. */
export async function sendJob(bitmap: Bitmap, darkness: Darkness, onProgress: (p: number) => void): Promise<void> {
  let last = -1;
  for (const { bytes, progress } of encodeJob(bitmap, darkness)) {
    await send(bytes);
    const pct = Math.floor(progress * 100);
    if (pct !== last) {
      last = pct;
      onProgress(progress);
    }
  }
}
