import type { ToneSettings } from '../engine/types';
import { paint } from '../engine/paint';
import type { BatchItem } from '../state/batchStore';
import type { DeviceSettings } from '../state/deviceStore';
import { renderItem } from './renderItem';

/** 203dpi is the standard resolution for these thermal printers (index.html:2054). */
const DPI = 203;
export function pxToMm(px: number): number {
  return (px / DPI) * 25.4;
}

export function renderOne(item: BatchItem, tone: ToneSettings, comp: number): HTMLCanvasElement {
  const r = renderItem(item, tone, comp);
  const c = document.createElement('canvas');
  paint(c, r);
  return c;
}

/** Stacks frames into one vertical strip, white gap between each, optionally
 *  numbering the gaps (index.html:2015-2036). */
export function buildStrip(list: HTMLCanvasElement[], gap: number, numbered: boolean): HTMLCanvasElement {
  const W = Math.max(...list.map((c) => c.width));
  const H = list.reduce((a, c) => a + c.height, 0) + gap * (list.length - 1);
  const s = document.createElement('canvas');
  s.width = W;
  s.height = H;
  const ctx = s.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);
  let y = 0;
  list.forEach((c, i) => {
    ctx.drawImage(c, Math.round((W - c.width) / 2), y);
    y += c.height;
    if (numbered && i < list.length - 1 && gap >= 14) {
      ctx.fillStyle = '#000';
      ctx.font = '9px ui-monospace,monospace';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'right';
      ctx.fillText(String(i + 1), W - 4, y + gap / 2);
      ctx.textAlign = 'left';
    }
    y += gap;
  });
  return s;
}

/** White band reserved at top/bottom, e.g. to print onto a used receipt
 *  without covering its type (index.html:2334-2342). */
export function withMargins(c: HTMLCanvasElement, mtop: number, mbot: number): HTMLCanvasElement {
  if (!mtop && !mbot) return c;
  const o = document.createElement('canvas');
  o.width = c.width;
  o.height = c.height + mtop + mbot;
  const ctx = o.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, o.width, o.height);
  ctx.drawImage(c, 0, mtop);
  return o;
}

/** Renders every non-skipped item and composes them per `device.outMode` —
 *  one strip, or one PNG per frame — each with margins applied
 *  (index.html:2079-2085). */
export function buildExportOutputs(
  items: BatchItem[],
  tone: ToneSettings,
  comp: number,
  device: DeviceSettings,
): HTMLCanvasElement[] {
  const keep = items.filter((it) => !it.skip);
  if (!keep.length) return [];
  const rendered = keep.map((it) => renderOne(it, it.own ?? tone, comp));
  if (rendered.length === 1) return [withMargins(rendered[0], device.mtop, device.mbot)];
  if (device.outMode === 'frames') return rendered.map((c) => withMargins(c, device.mtop, device.mbot));
  return [withMargins(buildStrip(rendered, device.gap, device.num), device.mtop, device.mbot)];
}

export interface ExportEstimate {
  keepCount: number;
  exclCount: number;
  totalPx: number;
  totalMm: number;
}

/** Mirrors `updateExpInfo()` (index.html:2055-2077) — an approximate output
 *  size for the summary line, ignoring crop/rotation like the original does. */
export function estimateExport(
  items: BatchItem[],
  tone: ToneSettings,
  device: DeviceSettings,
): ExportEstimate | null {
  const keep = items.filter((it) => !it.skip);
  if (!keep.length) return null;
  let total = 0;
  keep.forEach((it) => {
    const st = it.own ?? tone;
    total += Math.max(1, Math.round((it.height * st.w) / it.width));
  });
  if (device.outMode === 'bande' && keep.length > 1) total += device.gap * (keep.length - 1);
  total += (device.mtop + device.mbot) * (device.outMode === 'frames' ? keep.length : 1);
  return { keepCount: keep.length, exclCount: items.length - keep.length, totalPx: total, totalMm: pxToMm(total) };
}
