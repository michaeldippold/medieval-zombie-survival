// The enclosure model (DESIGN §9): flood-fill from a point through non-opaque tiles.
// Sight spreads through 4-neighbours only (no peeking through diagonal gaps), but any opaque
// tile touching visible air in any of the 8 directions is lit — you see the whole wall,
// including its corners and the ground it stands on, without seeing through it.
import { isOpaque } from './tiles.js';

export function computeVision(world, px, py) {
  const visible = new Set();
  let exposed = false;
  const sc = world.colOf(px), sr = world.rowOf(py);
  if (!world.inBounds(sc, sr)) return { visible, exposed: true };
  const seen = new Set([world.idx(sc, sr)]);       // air tiles already queued
  const stack = [[sc, sr]];
  while (stack.length) {
    const [c, r] = stack.pop();
    visible.add(world.idx(c, r));
    if (r === 0) exposed = true;
    for (const [dc, dr] of RING8) {
      const nc = c + dc, nr = r + dr;
      if (!world.inBounds(nc, nr)) continue;
      const idx = world.idx(nc, nr);
      if (isOpaque(world.grid[nr][nc])) { visible.add(idx); continue; }
      if ((dc === 0 || dr === 0) && !seen.has(idx)) { seen.add(idx); stack.push([nc, nr]); }
    }
  }
  return { visible, exposed };
}

const RING8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
