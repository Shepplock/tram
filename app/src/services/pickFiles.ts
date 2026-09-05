/** Opens the native file picker on demand, without needing a shared ref
 *  between whichever components want to trigger an import (the bottom
 *  Import button, the empty-state "Import a photo to begin" prompt, etc). */
export function pickFiles(): Promise<FileList | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.style.display = 'none';
    input.addEventListener('change', () => {
      resolve(input.files);
      input.remove();
    }, { once: true });
    document.body.appendChild(input);
    input.click();
  });
}
