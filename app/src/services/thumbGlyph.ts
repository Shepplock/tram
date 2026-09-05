/** Renders a slider thumb as a small SVG data URI: an accent-filled circle,
 *  ink-colored ring, and a white letter glyph — "shaped like the console
 *  keys" (index.html:2531-2541). Colors are read from resolved CSS custom
 *  properties since a data URI can't reference the page's `var()`s itself. */
export function thumbGlyphUri(letter: string): string {
  const cs = getComputedStyle(document.documentElement);
  const fill = cs.getPropertyValue('--accent').trim() || '#8B2942';
  const ring = cs.getPropertyValue('--ink').trim() || '#0F380F';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36">`
    + `<circle cx="18" cy="18" r="15.5" fill="${fill}" stroke="${ring}" stroke-width="2.5"/>`
    + `<text x="18" y="23.5" text-anchor="middle" font-family="ui-monospace,monospace" `
    + `font-size="16" font-weight="700" fill="#FFFFFF">${letter}</text></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
