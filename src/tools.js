// Tool use: left-click with a shovel / axe / pickaxe harvests the tile under the cursor, in reach.
import { TILE, PLAYER, TOOLS } from './config.js';
import { ITEMS } from './items.js';
import { defOf, harvestTile, airAfter, TOOL_NAMES } from './world/tiles.js';
import { give } from './inventory.js';
import { spawnDrop } from './entities/drops.js';
import { showHint } from './ui/hints.js';

export function updateTools(state, dt) {
  const { world, player: p, input } = state;
  state.toolCool = Math.max(0, state.toolCool - dt);
  const item = ITEMS[state.held];
  state.target = null;
  if (item.kind !== 'tool' || p.dead) return;

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
  if (res.drop) spawnDrop(state, c * TILE + TILE / 2, r * TILE + TILE / 2, res.drop);
  if (res.removed) world.set(c, r, airAfter(t, world.isUnderground(c, r))); else world.touch();
}
