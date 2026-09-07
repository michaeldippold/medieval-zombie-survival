// The enclosure model (DESIGN §9): flood-fill from a point through non-opaque tiles.
// Opaque tiles bordering the region are included (you see the wall) but not expanded.
import { isOpaque } from './tiles.js';

export function computeVision(world, px, py) {
  const visible = new Set();
  let exposed = false;
  const sc = world.colOf(px), sr = world.rowOf(py);
  if (!world.inBounds(sc, sr)) return { visible, exposed: true };
  const stack = [[sc, sr]];
  visible.add(world.idx(sc, sr));
  while (stack.length) {
    const [c, r] = stack.pop();
    if (r === 0) exposed = true;
    for (const [dc, dr] of NEIGHBOURS) {
      const nc = c + dc, nr = r + dr;
      if (!world.inBounds(nc, nr)) continue;
      const idx = world.idx(nc, nr);
      if (visible.has(idx)) continue;
      visible.add(idx);
      if (!isOpaque(world.grid[nr][nc])) stack.push([nc, nr]);
    }
  }
  return { visible, exposed };
}

const NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
