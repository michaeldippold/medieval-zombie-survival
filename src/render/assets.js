// Loads the hand-drawn asset manifest (drawn in tools/editor, saved to assets/manifest.json)
// at boot and hands out a sprite per tile kind. `paintTile` draws a sprite the moment one
// exists and falls back to its flat painter otherwise, so art can land one tile at a time.
// See DESIGN §16. A missing manifest (nothing drawn yet, or opened via file://) is not an
// error — every kind just keeps using its flat painter.
const sprites = new Map();   // kind -> offscreen canvas, sized w*16 x h*16 art pixels

export async function loadAssets() {
  try {
    const res = await fetch('assets/manifest.json', { cache: 'no-store' });
    if (!res.ok) return;
    const manifest = await res.json();
    for (const [id, asset] of Object.entries(manifest)) sprites.set(id, buildSprite(asset));
  } catch { /* no assets yet */ }
}

function buildSprite({ w, h, pixels }) {
  const cw = w * 16, ch = h * 16;
  const canvas = document.createElement('canvas');
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext('2d');
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const color = pixels[y * cw + x];
    if (color) { ctx.fillStyle = color; ctx.fillRect(x, y, 1, 1); }
  }
  return canvas;
}

// The sprite for a tile/item kind, or null if nothing's been drawn for it yet.
export const spriteFor = kind => sprites.get(kind) || null;
