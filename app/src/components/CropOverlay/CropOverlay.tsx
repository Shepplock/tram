import { useEffect, useMemo, useRef, useState } from 'react';
import type { CropRect } from '../../engine/types';
import { rotateSource } from '../../services/rotate';
import { useBatchStore, FULL_CROP, type BatchItem } from '../../state/batchStore';
import styles from './CropOverlay.module.scss';

type Corner = 'tl' | 'tr' | 'bl' | 'br';
type DragMode = 'move' | Corner;
interface Drag { mode: DragMode; startX: number; startY: number; rect: CropRect; }

const MIN = 0.06;

function toDataURL(source: CanvasImageSource): string {
  const c = source as HTMLCanvasElement;
  if (typeof c.toDataURL === 'function') return c.toDataURL('image/png');
  // Fallback: draw whatever we got onto a canvas first.
  const canvas = document.createElement('canvas');
  const w = (source as { width?: number }).width ?? 1;
  const h = (source as { height?: number }).height ?? 1;
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d')!.drawImage(source, 0, 0);
  return canvas.toDataURL('image/png');
}

export function CropOverlay({ item, onClose }: { item: BatchItem; onClose: () => void }) {
  const updateItem = useBatchStore((s) => s.updateItem);
  const [rot, setRot] = useState<BatchItem['rot']>(item.rot);
  const [rect, setRect] = useState<CropRect>(item.crop ?? FULL_CROP);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<Drag | null>(null);

  const imgSrc = useMemo(() => {
    const rotated = rotateSource(item.source as unknown as CanvasImageSource, item.width, item.height, rot);
    return toDataURL(rotated);
  }, [item.source, item.width, item.height, rot]);

  useEffect(() => { setRect(FULL_CROP); }, [rot]);

  const fracPoint = (e: React.PointerEvent) => {
    const b = imgRef.current!.getBoundingClientRect();
    return { x: (e.clientX - b.left) / b.width, y: (e.clientY - b.top) / b.height };
  };

  const onRectDown = (e: React.PointerEvent<HTMLDivElement>, mode: DragMode) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = fracPoint(e);
    dragRef.current = { mode, startX: p.x, startY: p.y, rect: { ...rect } };
  };
  const onRectMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const p = fracPoint(e);
    const dx = p.x - drag.startX, dy = p.y - drag.startY, o = drag.rect;
    if (drag.mode === 'move') {
      setRect({
        ...o,
        x: Math.min(Math.max(0, o.x + dx), 1 - o.w),
        y: Math.min(Math.max(0, o.y + dy), 1 - o.h),
      });
      return;
    }
    let l = o.x, t = o.y, r = o.x + o.w, b = o.y + o.h;
    if (drag.mode[0] === 't') t = Math.min(Math.max(0, t + dy), b - MIN); else b = Math.max(Math.min(1, b + dy), t + MIN);
    if (drag.mode[1] === 'l') l = Math.min(Math.max(0, l + dx), r - MIN); else r = Math.max(Math.min(1, r + dx), l + MIN);
    setRect({ x: l, y: t, w: r - l, h: b - t });
  };
  const endDrag = () => { dragRef.current = null; };

  const rotate = () => setRot(((rot + 90) % 360) as BatchItem['rot']);
  const full = () => setRect(FULL_CROP);
  const confirm = () => {
    const isFull = rect.x <= 0.001 && rect.y <= 0.001 && rect.w >= 0.999 && rect.h >= 0.999;
    updateItem(item.id, { rot, crop: isFull ? FULL_CROP : rect });
    onClose();
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.stage}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img ref={imgRef} src={imgSrc} className={styles.img} alt="" draggable={false} />
          <div
            className={styles.rect}
            style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.w * 100}%`, height: `${rect.h * 100}%` }}
            onPointerDown={(e) => onRectDown(e, 'move')}
            onPointerMove={onRectMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {(['tl', 'tr', 'bl', 'br'] as Corner[]).map((c) => (
              <div
                key={c}
                className={`${styles.handle} ${styles[c]}`}
                onPointerDown={(e) => { e.stopPropagation(); onRectDown(e, c); }}
                onPointerMove={onRectMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              />
            ))}
          </div>
        </div>
      </div>
      <div className={styles.bar}>
        <button type="button" className={styles.btn} onClick={onClose}>Cancel</button>
        <button type="button" className={styles.btn} onClick={full}>Full</button>
        <button type="button" className={styles.btn} onClick={rotate}>Rotate</button>
        <button type="button" className={`${styles.btn} ${styles.ok}`} onClick={confirm}>Done</button>
      </div>
    </div>
  );
}
