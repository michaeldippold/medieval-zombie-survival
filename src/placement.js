// Placing a block straight from the hotbar: whatever placeable item is in the selected slot
// follows the cursor as a ghost, and left click stamps one. There is no separate "build mode" —
// holding a placeable item IS the mode, so selecting a different slot is the only way out, and
// weapons/tools simply don't do anything while a placeable is selected (see combat.js / tools.js,
// which no-op on a kind mismatch the same way this does). DESIGN §5.5, §7.3.
import { TILE, PLAYER } from './config.js';
import { ITEMS } from './items.js';
import { heldId, take } from './inventory.js';
import { isAir } from './world/tiles.js';
import { overlap } from './physics.js';
import { showHint } from './ui/hints.js';

// Can this item go at (c, r) right now, and if not, why not. Exported for tests/tools.
export function canPlaceAt(state, c, r) {
  const { world, player: p, zombies } = state;
  if (!world.inBounds(c, r)) return { ok: false, why: 'out of bounds' };
  if (!isAir(world.get(c, r))) return { ok: false, why: 'not empty' };
  const rect = world.rectOf(c, r);
  if (overlap(p, rect) || zombies.some(z => !z.stunned && overlap(z, rect))) return { ok: false, why: 'blocked' };
  const near = Math.hypot(p.x + p.w / 2 - (c * TILE + TILE / 2), p.y + p.h / 2 - (r * TILE + TILE / 2)) < PLAYER.REACH;
  if (!near) return { ok: false, why: 'too far' };
  return { ok: true, why: '' };
}

export function updatePlacement(state) {
  state.ghost = null;
  const id = heldId(state.inventory, state.held);
  const item = id && ITEMS[id];
  if (!item || item.kind !== 'placeable' || state.player.dead) return;

  const { world, input, player: p } = state;
  const c = world.colOf(input.mouse.wx), r = world.rowOf(input.mouse.wy);
  const check = canPlaceAt(state, c, r);
  state.ghost = { itemId: id, c, r, ok: check.ok, why: check.why };

  if (!input.actions.use) return;
  if (!check.ok) { showHint(state, check.why); return; }
  const insideDir = Math.sign(p.x + p.w / 2 - (c * TILE + TILE / 2)) || 1;
  const tile = item.make(insideDir);
  tile.back = world.get(c, r)?.back ?? null;
  world.set(c, r, tile);
  take(state.inventory, { [id]: 1 });
}
