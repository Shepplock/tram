/**
 * Cat-printer (X6 family) wire protocol, ported from the sibling `printy`
 * project. Pure byte-building only — no Bluetooth, no DOM — so it can be
 * unit-tested under Vitest like the dithering engine.
 */

/** Print head width in dots. */
export const PRINT_WIDTH = 384;

export type Darkness = 1 | 2 | 3 | 4;

/** Darkness 1–4 → head energy. The printer slows its motor by itself for higher values. */
const ENERGY: Record<Darkness, number> = { 1: 4000, 2: 6500, 3: 9000, 4: 12000 };
/** Motor speed used for all of printy's calibration prints. */
const MOTOR_SPEED = 4;
/** Paper fed after the image, to push it past the tear bar. */
const TAIL_FEED = 90;

const CRC_TABLE = (() => {
  const t = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 0x80) ? ((c << 1) ^ 0x07) & 0xff : (c << 1) & 0xff;
    t[i] = c;
  }
  return t;
})();

export function crc8(data: Uint8Array): number {
  let c = 0;
  for (const b of data) c = CRC_TABLE[(c ^ b) & 0xff];
  return c;
}

/** Packet: 51 78 CMD 00 LEN_LO LEN_HI DATA... CRC8(DATA) FF */
export function packet(cmd: number, data: ArrayLike<number>): Uint8Array {
  const d = Uint8Array.from(data);
  const p = new Uint8Array(8 + d.length);
  p.set([0x51, 0x78, cmd, 0x00, d.length & 0xff, d.length >> 8]);
  p.set(d, 6);
  p[6 + d.length] = crc8(d);
  p[7 + d.length] = 0xff;
  return p;
}

const u16 = (v: number) => [v & 0xff, (v >> 8) & 0xff];

export const CMD = {
  getState: () => packet(0xa3, [0x00]),
  quality200: () => packet(0xa4, [0x32]),
  energy: (v: number) => packet(0xaf, u16(v)),
  applyEnergy: () => packet(0xbe, [0x01]),
  update: () => packet(0xa9, [0x00]),
  latticeStart: () => packet(0xa6, [0xaa, 0x55, 0x17, 0x38, 0x44, 0x5f, 0x5f, 0x5f, 0x44, 0x38, 0x2c]),
  latticeEnd: () => packet(0xa6, [0xaa, 0x55, 0x17, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x17]),
  row: (bytes: Uint8Array) => packet(0xa2, bytes),
  feed: (n: number) => packet(0xa1, u16(n)),
  speed: (v: number) => packet(0xbd, [v & 0xff]),
};

/** 1 bit per dot, 1 = black; row-major, PRINT_WIDTH dots per row. */
export interface Bitmap {
  bits: Uint8Array;
  height: number;
}

/** Pack one row of PRINT_WIDTH dots into bytes. These printers read bits LSB-first. */
export function packRow(bits: Uint8Array, y: number): Uint8Array {
  const out = new Uint8Array(PRINT_WIDTH / 8);
  const off = y * PRINT_WIDTH;
  for (let x = 0; x < PRINT_WIDTH; x++) if (bits[off + x]) out[x >> 3] |= 1 << (x & 7);
  return out;
}

/** RGBA pixels (exactly PRINT_WIDTH wide) → bitmap. The exported image is
 *  already dithered to pure black/white, so a plain threshold is enough;
 *  transparent pixels count as white paper. */
export function rgbaToBitmap(data: Uint8ClampedArray, height: number): Bitmap {
  const n = PRINT_WIDTH * height;
  const bits = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const a = data[i * 4 + 3] / 255;
    const g = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    bits[i] = g * a + 255 * (1 - a) < 128 ? 1 : 0;
  }
  return { bits, height };
}

/** One step of a print job: a packet, and how far through the image it is (0..1). */
export interface JobStep {
  bytes: Uint8Array;
  progress: number;
}

/** Every packet for one print, in order. Runs of blank rows become paper
 *  feeds, which is much faster than sending empty rows. */
export function* encodeJob({ bits, height }: Bitmap, darkness: Darkness): Generator<JobStep> {
  for (const bytes of [
    CMD.getState(), CMD.quality200(), CMD.energy(ENERGY[darkness]), CMD.applyEnergy(),
    CMD.speed(MOTOR_SPEED), CMD.update(), CMD.latticeStart(),
  ]) yield { bytes, progress: 0 };

  const isBlank = (row: Uint8Array) => row.every((b) => b === 0);
  for (let y = 0; y < height; y++) {
    const row = packRow(bits, y);
    if (isBlank(row)) {
      let n = 1;
      while (y + n < height && isBlank(packRow(bits, y + n))) n++;
      y += n - 1;
      yield { bytes: CMD.feed(n), progress: (y + 1) / height };
    } else {
      yield { bytes: CMD.row(row), progress: (y + 1) / height };
    }
  }

  for (const bytes of [CMD.feed(TAIL_FEED), CMD.latticeEnd(), CMD.getState()]) yield { bytes, progress: 1 };
}
