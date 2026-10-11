import { describe, expect, it } from 'vitest';
import { CMD, PRINT_WIDTH, crc8, encodeJob, packRow, packet, rgbaToBitmap } from './protocol';

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join(' ');

describe('packet framing', () => {
  it('matches the known get-state packet', () => {
    expect(hex(CMD.getState())).toBe('51 78 a3 00 01 00 00 00 ff');
  });

  it('encodes length little-endian and ends with crc + ff', () => {
    const p = packet(0xa1, [0x34, 0x12]);
    expect(hex(p.subarray(0, 6))).toBe('51 78 a1 00 02 00');
    expect(p[8]).toBe(crc8(Uint8Array.from([0x34, 0x12])));
    expect(p[9]).toBe(0xff);
  });

  it('crc8 is the 0x07 polynomial', () => {
    expect(crc8(Uint8Array.from([0x01]))).toBe(0x07);
    expect(crc8(Uint8Array.from([0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39]))).toBe(0xf4);
  });
});

describe('packRow', () => {
  it('packs dots LSB-first', () => {
    const bits = new Uint8Array(PRINT_WIDTH);
    bits[0] = 1;
    bits[9] = 1;
    const row = packRow(bits, 0);
    expect(row.length).toBe(48);
    expect(row[0]).toBe(0b00000001);
    expect(row[1]).toBe(0b00000010);
  });
});

describe('rgbaToBitmap', () => {
  it('thresholds black/white and treats transparent as paper', () => {
    const data = new Uint8ClampedArray(PRINT_WIDTH * 4);
    data.set([0, 0, 0, 255], 0); // opaque black
    data.set([255, 255, 255, 255], 4); // white
    data.set([0, 0, 0, 0], 8); // transparent black
    const { bits } = rgbaToBitmap(data, 1);
    expect([bits[0], bits[1], bits[2]]).toEqual([1, 0, 0]);
  });
});

describe('encodeJob', () => {
  const cmdOf = (b: Uint8Array) => b[2];

  it('collapses blank-row runs into one feed and ends at progress 1', () => {
    const height = 5;
    const bits = new Uint8Array(PRINT_WIDTH * height);
    bits[0] = 1; // row 0 inked, rows 1-3 blank
    bits[4 * PRINT_WIDTH] = 1; // row 4 inked
    const steps = [...encodeJob({ bits, height }, 4)];
    const body = steps.slice(7, -3).map((s) => s.bytes);
    expect(body.map(cmdOf)).toEqual([0xa2, 0xa1, 0xa2]);
    expect(body[1][6]).toBe(3); // feed 3 rows
    expect(steps.at(-1)?.progress).toBe(1);
  });

  it('sets head energy from darkness', () => {
    const steps = [...encodeJob({ bits: new Uint8Array(PRINT_WIDTH), height: 1 }, 1)];
    const energy = steps.find((s) => cmdOf(s.bytes) === 0xaf)!.bytes;
    expect(energy[6] | (energy[7] << 8)).toBe(4000);
  });
});
