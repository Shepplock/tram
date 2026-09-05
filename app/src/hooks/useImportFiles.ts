import { useCallback, useEffect, useState } from 'react';
import { decode, isRawFile } from '../services/decode';
import { shrink } from '../services/renderItem';
import { useBatchStore } from '../state/batchStore';

export function useImportFiles() {
  const addItems = useBatchStore((s) => s.addItems);
  const [status, setStatus] = useState<string | null>(null);

  const addFiles = useCallback(async (list: FileList | File[]) => {
    const files = Array.from(list);
    if (!files.length) return;
    setStatus(`Decoding 0/${files.length}…`);
    const ok: Parameters<typeof addItems>[0] = [];
    const bad: string[] = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const bmp = await decode(files[i]);
        const src = shrink(bmp as unknown as CanvasImageSource & { width: number; height: number }, 1600);
        ok.push({ id: '', name: files[i].name, source: src as never, width: src.width, height: src.height, rot: 0, own: null, skip: false });
      } catch {
        bad.push(files[i].name);
      }
      setStatus(`Decoding ${i + 1}/${files.length}…`);
    }
    if (ok.length) addItems(ok);
    if (bad.length && !ok.length) {
      const ext = (bad[0].split('.').pop() || '').toUpperCase();
      setStatus(isRawFile(bad[0])
        ? `RAW file (${ext}) — the browser cannot read it. Export to JPEG or HEIC first.`
        : `${ext || 'Unknown'} files are not supported by this browser.`);
    } else {
      setStatus(null);
      if (bad.length) console.warn('could not decode:', bad.join(', '));
    }
  }, [addItems]);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image/') === 0) {
          const f = items[i].getAsFile();
          if (f) addFiles([f]);
          return;
        }
      }
    };
    const prevent = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    const onDrop = (e: DragEvent) => {
      prevent(e);
      const fl = e.dataTransfer?.files;
      if (fl && fl.length) addFiles(fl);
    };
    window.addEventListener('paste', onPaste);
    window.addEventListener('dragenter', prevent);
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('paste', onPaste);
      window.removeEventListener('dragenter', prevent);
      window.removeEventListener('dragover', prevent);
      window.removeEventListener('drop', onDrop);
    };
  }, [addFiles]);

  return { addFiles, status };
}
