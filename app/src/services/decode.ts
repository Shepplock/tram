export const RAW_EXTENSIONS = ['DNG', 'ARW', 'CR2', 'CR3', 'NEF', 'ORF', 'RAF', 'RW2', 'SRW', 'PEF', '3FR', 'IIQ'];

/** Decode chain: try the most capable decoder first. */
export async function decode(f: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof window.createImageBitmap === 'function') {
    // Also applies EXIF orientation, which phone photos almost always carry.
    try { return await createImageBitmap(f, { imageOrientation: 'from-image' }); } catch { /* fall through */ }
    try { return await createImageBitmap(f); } catch { /* fall through */ }
  }
  return await new Promise((res, rej) => {
    const url = URL.createObjectURL(f);
    const im = new Image();
    im.onload = () => { URL.revokeObjectURL(url); res(im); };
    im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('decode')); };
    im.src = url;
  });
}

export function isRawFile(name: string): boolean {
  const ext = (name.split('.').pop() || '').toUpperCase();
  return RAW_EXTENSIONS.includes(ext);
}
