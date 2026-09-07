// Build mode: a chosen placeable follows the cursor as a half-opaque ghost; each left click stamps one.
// While active, weapons and tools are off. Escape (or picking a hotbar slot) leaves build mode.
import { TILE, PLAYER } from './config.js';
import { BUILDS } from './items.js';
import { isAir } from './world/tiles.js';
import { overlap } from './physics.js';
import { canAfford, take, costLabel } from './inventory.js';
import { showHint } from './ui/hints.js';

export const buildById = id => BUILDS.find(b => b.id === id);

export function enterBuild(state, id) { state.build = { id, c: 0, r: 0, ok: false, why: '' }; }
export function exitBuild(state) { state.build = null; }

// Can `build` go at (c, r) right now, and if not, why not.
export function canPlaceAt(state, build, c, r) {
  const { world, player: p, zombies, inventory } = state;
  if (!world.inBounds(c, r)) return { ok: false, why: 'out of bounds' };
  if (!isAir(world.get(c, r))) return { ok: false, why: 'not empty' };
  const rect = world.rectOf(c, r);
  if (overlap(p, rect) || zombies.some(z => !z.stunned && overlap(z, rect))) return { ok: false, why: 'blocked' };
  const near = Math.hypot(p.x + p.w / 2 - (c * TILE + TILE / 2), p.y + p.h / 2 - (r * TILE + TILE / 2)) < PLAYER.REACH;
  if (!near) return { ok: false, why: 'too far' };
  if (!canAfford(inventory, build.cost)) return { ok: false, why: `need ${costLabel(build.cost)}` };
  return { ok: true, why: '' };
}

export function updateBuild(state) {
  const b = state.build;
  if (!b || state.player.dead) return;
  const { world, input, player: p } = state;
  const build = buildById(b.id);
  b.c = world.colOf(input.mouse.wx); b.r = world.rowOf(input.mouse.wy);
  const check = canPlaceAt(state, build, b.c, b.r);
  b.ok = check.ok; b.why = check.why;
  if (!input.actions.use) return;
  if (!b.ok) { showHint(state, b.why); return; }
  take(state.inventory, build.cost);
  const insideDir = Math.sign(p.x + p.w / 2 - (b.c * TILE + TILE / 2)) || 1;
  const tile = build.make(insideDir);
  tile.back = world.get(b.c, b.r)?.back ?? null;
  world.set(b.c, b.r, tile);
}
