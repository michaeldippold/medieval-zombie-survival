// Placing a block straight from the hotbar: whatever placeable item is in the selected slot
// follows the cursor as a ghost, and left click stamps one. There is no separate "build mode" —
// holding a placeable item IS the mode, so selecting a different slot is the only way out, and
// weapons/tools simply don't do anything while a placeable is selected (see combat.js / tools.js,
// which no-op on a kind mismatch the same way this does). DESIGN §5.5, §7.3.
import { TILE, PLAYER } from './config.js';
import { ITEMS } from './items.js';
import { heldId, take } from './inventory.js';
import { isAir, applyPlacedHp, stampMulti, TILE_DEFS } from './world/tiles.js';
import { overlap } from './physics.js';
import { showHint } from './ui/hints.js';

// The extra cells (beyond (c, r) itself) a currently-held placeable's footprint occupies, if
// it's the kind of thing DESIGN §5.8 calls multi-cell (a 2-tall door, say) — [] for everything
// single-cell. `item.make(1)` is a cheap, side-effect-free tile constructor call just to read
// its kind; the `insideDir` passed doesn't matter here, only the resulting tile's `kind` does.
function footprintOf(item) {
  if (!item?.make) return [];
  return TILE_DEFS[item.make(1).kind].footprint || [];
}

// Can this item go with its anchor at (c, r) right now, and if not, why not. Checks every cell
// of its footprint, not just the one under the cursor. Exported for tests/tools.
export function canPlaceAt(state, c, r) {
  const { world, player: p, zombies, inventory } = state;
  const item = ITEMS[heldId(inventory, state.held)];
  const cells = [[0, 0], ...footprintOf(item)].map(([dc, dr]) => [c + dc, r + dr]);
  for (const [cc, rr] of cells) {
    if (!world.inBounds(cc, rr)) return { ok: false, why: 'out of bounds' };
    if (!isAir(world.get(cc, rr))) return { ok: false, why: 'not empty' };
  }
  for (const [cc, rr] of cells) {
    const rect = world.rectOf(cc, rr);
    if (overlap(p, rect) || zombies.some(z => !z.stunned && overlap(z, rect))) return { ok: false, why: 'blocked' };
  }
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

  // Click to place one, hold and drag to paint a line (DESIGN §7.1). The "why not" hint only
  // fires on the click itself — while painting, the cells just passed over are legitimately
  // "not empty" and the hint would flicker the whole stroke.
  if (!(input.actions.use || input.mouse.down)) return;
  if (!check.ok) { if (input.actions.use) showHint(state, check.why); return; }
  const insideDir = Math.sign(p.x + p.w / 2 - (c * TILE + TILE / 2)) || 1;
  const tile = applyPlacedHp(item.make(insideDir));
  tile.back = world.get(c, r)?.back ?? null;
  stampMulti(world, c, r, tile);
  take(state.inventory, { [id]: 1 });
}
