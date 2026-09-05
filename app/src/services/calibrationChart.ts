import { dither } from '../engine/dither';

/** Printable calibration chart: eight labeled coverage steps dithered at
 *  the current paper width (index.html:2345-2371). The original references
 *  an undefined `PA` here — a live ReferenceError — fixed by using `PH`,
 *  the row height, as clearly intended. */
export function buildChart(w: number): HTMLCanvasElement {
  const W = w, PH = 58, LAB = 34;
  const covs = [5, 8, 11, 14, 18, 22, 27, 33];
  const c = document.createElement('canvas');
  c.width = W;
  c.height = PH * covs.length + 30;
  const x = c.getContext('2d')!;
  x.fillStyle = '#fff';
  x.fillRect(0, 0, c.width, c.height);
  covs.forEach((cv, i) => {
    const val = 255 * (1 - cv / 100);
    const pw = W - LAB;
    const g = new Float32Array(pw * PH).fill(val);
    const bits = dither(g, pw, PH, 'fs');
    const im = x.createImageData(pw, PH);
    for (let k = 0; k < bits.length; k++) {
      const p = k * 4;
      im.data[p] = im.data[p + 1] = im.data[p + 2] = bits[k];
      im.data[p + 3] = 255;
    }
    x.putImageData(im, LAB, i * PH + 24);
    x.fillStyle = '#000';
    x.font = 'bold 15px ui-monospace,monospace';
    x.textBaseline = 'middle';
    x.fillText(String(cv), 4, i * PH + 24 + PH / 2);
  });
  x.fillStyle = '#000';
  x.font = 'bold 13px ui-monospace,monospace';
  x.textBaseline = 'top';
  x.fillText('CHART — coverage %', 4, 5);
  return c;
}

/** Full 0-100% ramp plus 1-4px lines, to find where the head saturates or
 *  drops steps and how fine a line it can still resolve (index.html:2374-2421). */
export function buildTest(w: number): HTMLCanvasElement {
  const W = w, LAB = 34, PA = 22, GAP = 4, PH = PA + GAP, TOP = 24, LINES = 64;
  const steps: number[] = [];
  for (let v = 0; v <= 100; v += 5) steps.push(v);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = TOP + steps.length * PH + 14 + LINES;
  const x = c.getContext('2d')!;
  x.fillStyle = '#fff';
  x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = '#000';
  x.textBaseline = 'top';
  x.font = 'bold 13px ui-monospace,monospace';
  x.fillText(`PRINT TEST  0-100%  ${W}px`, 4, 5);

  const pw = W - LAB;
  steps.forEach((v, i) => {
    const y = TOP + i * PH;
    x.font = 'bold 12px ui-monospace,monospace';
    x.textBaseline = 'middle';
    x.fillStyle = '#000';
    x.fillText(String(v).padStart(3, ' '), 3, y + PA / 2);
    if (v === 0) return;
    const bits = v === 100
      ? new Uint8ClampedArray(pw * PA)
      : dither(new Float32Array(pw * PA).fill(255 * (1 - v / 100)), pw, PA, 'fs');
    const im = x.createImageData(pw, PA);
    for (let k = 0; k < bits.length; k++) {
      const p = k * 4;
      im.data[p] = im.data[p + 1] = im.data[p + 2] = bits[k];
      im.data[p + 3] = 255;
    }
    x.putImageData(im, LAB, y);
  });

  let y = TOP + steps.length * PH + 12;
  x.fillStyle = '#000';
  x.textBaseline = 'top';
  x.font = 'bold 11px ui-monospace,monospace';
  x.fillText('LINES 1-4px', 4, y);
  y += 15;
  let px = LAB;
  for (const wdt of [1, 2, 3, 4]) {
    for (let k = 0; k < 5; k++) { x.fillRect(px, y, wdt, 20); px += wdt * 2; }
    px += 8;
  }
  y += 26;
  let py = y;
  for (const wdt of [1, 2, 3, 4]) {
    for (let k = 0; k < 3; k++) { x.fillRect(LAB, py, W - LAB - 8, wdt); py += wdt * 2; }
    py += 4;
  }
  return c;
}
