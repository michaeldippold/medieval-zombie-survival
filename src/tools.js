// Tool use: left-click with a shovel / axe / pickaxe harvests the tile under the cursor, in reach.
import { TILE, PLAYER, TOOLS } from './config.js';
import { ITEMS } from './items.js';
import { heldId } from './inventory.js';
import { defOf, harvestTile, airAfter, isSolid, footprintCells, TOOL_NAMES } from './world/tiles.js';
import { spawnDrop } from './entities/drops.js';
import { showHint } from './ui/hints.js';

export function updateTools(state, dt) {
  const { world, player: p, input } = state;
  state.toolCool = Math.max(0, state.toolCool - dt);
  const item = ITEMS[heldId(state.inventory, state.held)];
  state.target = null;
  if (!item || item.kind !== 'tool' || p.dead) return;

  const c = world.colOf(input.mouse.wx), r = world.rowOf(input.mouse.wy);
  const t = world.get(c, r);
  if (!t || !defOf(t).harvest) return;
  const near = Math.hypot(p.x + p.w / 2 - (c * TILE + TILE / 2), p.y + p.h / 2 - (r * TILE + TILE / 2)) < PLAYER.REACH;
  state.target = { c, r, near };

  if (!input.actions.use || state.toolCool > 0) return;
  state.toolCool = TOOLS.COOLDOWN;
  if (!near) { showHint(state, 'too far'); return; }

  const res = harvestTile(t, item.tool);
  if (res.wrongTool) { showHint(state, `needs ${TOOL_NAMES[res.wrongTool]}`); return; }
  if (res.removed) {
    // A multi-cell tile (a 2-tall door, DESIGN §5.8) is dismantled whole: clear every cell of
    // its footprint, not just the one the player is aiming at, so no `part` is left orphaned
    // pointing at an anchor that no longer exists.
    // Only something `stampMulti` placed has a footprint to walk; an ordinary block (dirt,
    // a leaf, a wall) has no `footAt` and is just the one cell under the cursor.
    const anchor = t.kind === 'part' ? t.anchor : t;
    const cells = anchor.footAt ? footprintCells(anchor) : [[c, r]];
    for (const [cc, rr] of cells) world.set(cc, rr, airAfter(anchor, world.isUnderground(cc, rr)));
  } else world.touch();
  if (res.drop) {
    // A per-hit drop from a block that's still there must not spawn inside it: use the nearest
    // free neighbour on the player's side, and send it toward the player.
    const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
    const [sx, sy] = res.removed ? [c * TILE + TILE / 2, r * TILE + TILE / 2] : freeSpotNear(world, c, r, pcx, pcy);
    spawnDrop(state, sx, sy, res.drop, 1, Math.sign(pcx - sx) * 50);
  }
}

function freeSpotNear(world, c, r, px, py) {
  const cands = [[1, 0], [-1, 0], [0, -1], [0, 1]]
    .map(([dc, dr]) => ({ c: c + dc, r: r + dr }))
    .filter(n => world.inBounds(n.c, n.r) && !isSolid(world.get(n.c, n.r)))
    .sort((a, b) => Math.hypot(a.c * TILE + TILE / 2 - px, a.r * TILE + TILE / 2 - py) - Math.hypot(b.c * TILE + TILE / 2 - px, b.r * TILE + TILE / 2 - py));
  const n = cands[0] ?? { c, r };
  return [n.c * TILE + TILE / 2, n.r * TILE + TILE / 2];
}
