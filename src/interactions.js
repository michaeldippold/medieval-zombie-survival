// What the player can do to a tile, as context-menu items, plus the craft palette entries.
// Rules live here; the widgets just render.
import { TILE, PLAYER, PORTAL } from './config.js';
import { isPortal, isSolid, isAir, portalName, defOf, TOOL_NAMES } from './world/tiles.js';
import { overlap } from './physics.js';
import { CRAFTS, ITEMS } from './items.js';
import { canAfford, take, give, haveLabel } from './inventory.js';
import { paintTile } from './render/tiles.js';
import { paintItemIcon } from './render/icons.js';
import { spawnDrop } from './entities/drops.js';
import { showHint } from './ui/hints.js';

// Returns [{ label, primary?, disabled?, run? }]. Always ends with Cancel.
// `ui.openCraft()` opens the craft palette where the menu was opened.
export function menuItemsForTile(state, c, r, ui) {
  const { world, player: p, zombies, inventory: inv } = state;
  // Every read below (isPortal, portalName, defOf, ...) already resolves a `part` to its
  // anchor internally, but a *mutation* here is a plain `t.field = ...`, not a call through
  // one of those — done on a raw part wrapper that would silently miss the shared door state
  // entirely. Resolve once, up front, so every `t.` below is always the real, shared tile.
  const raw = world.get(c, r);
  const t = raw?.kind === 'part' ? raw.anchor : raw;
  const items = [];
  if (p.dead || !world.inBounds(c, r)) return [{ label: 'Cancel' }];

  const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
  const tcx = c * TILE + TILE / 2, tcy = r * TILE + TILE / 2;
  const near = Math.hypot(pcx - tcx, pcy - tcy) < PLAYER.REACH;
  const far = near ? '' : ' (walk closer)';
  const rect = world.rectOf(c, r);
  const blocked = overlap(p, rect) || zombies.some(z => !z.stunned && overlap(z, rect));
  const change = fn => () => { fn(); world.touch(); };

  if (isPortal(t)) {
    const name = portalName(t), def = defOf(t);
    const inside = def.barFrom === 'above' ? pcy < r * TILE : (pcx - tcx) * t.insideDir > 0;
    const sideNote = def.barFrom === 'above' ? ' (only from above)' : ' (only from inside)';
    if (t.bars === 0) {
      if (t.broken) items.push({ label: `${name} is broken`, disabled: true });
      else if (t.open) items.push({ label: blocked ? `Close ${name} (blocked)` : `Close ${name}${far}`, primary: true, disabled: !near || blocked, run: change(() => { t.open = false; }) });
      else items.push({ label: `Open ${name}${far}`, primary: true, disabled: !near, run: change(() => { t.open = true; }) });
      if (def.climbThrough && !isSolid(t)) items.push({ label: `Climb through${far}`, primary: true, disabled: !near, run: () => { p.x = c * TILE + (TILE - p.w) / 2; p.y = (t.footAt?.r ?? r) * TILE + TILE - p.h; p.vy = 0; } });
    }
    if (t.bars < PORTAL.MAX_BARS) {
      const openUnbroken = t.open && !t.broken;
      const why = openUnbroken ? ' — close it first' : !inside ? sideNote : far;
      items.push({ label: `Bar ${name} (${t.bars}/${PORTAL.MAX_BARS})${why}`, disabled: !near || openUnbroken || !inside, run: change(() => { t.bars++; t.barHp = PORTAL.BAR_HP; }) });
    }
    if (t.bars > 0) items.push({ label: `Remove bar (${t.bars}/${PORTAL.MAX_BARS})${!inside ? sideNote : far}`, disabled: !near || !inside, run: change(() => { t.bars--; t.barHp = PORTAL.BAR_HP; }) });
  } else if (isAir(t)) {
    const canCraft = CRAFTS.some(cr => canAfford(inv, cr.cost));
    items.push({ label: canCraft ? 'Craft…' : 'Craft… (nothing you can afford yet)', primary: canCraft, run: () => ui.openCraft() });
  } else {
    const h = defOf(t).harvest;
    items.push({ label: h ? `${ITEMS[h.drop]?.name ?? t.kind} — ${h.tool === 'any' ? 'hit it with anything' : `needs ${TOOL_NAMES[h.tool]}`}` : `${t.kind} — cannot be harvested`, disabled: true });
  }

  items.push({ label: 'Cancel' });
  return items;
}

// Icon for a craft entry: the tile if it makes one, otherwise the item's own icon.
function paintCraftIcon(ctx, giveId) {
  const item = ITEMS[giveId];
  if (item?.make) paintTile(ctx, 0, 0, item.make(1));
  else paintItemIcon(ctx, giveId);
}

export const craftEntries = inv => CRAFTS.map(cr => ({
  id: cr.id, label: cr.label, have: haveLabel(inv, cr.cost), enabled: canAfford(inv, cr.cost),
  paint: ctx => paintCraftIcon(ctx, Object.keys(cr.gives)[0]),
}));

// Craft one batch. Anything that doesn't fit in the inventory drops at the player's feet.
export function craft(state, id) {
  const recipe = CRAFTS.find(cr => cr.id === id);
  if (!recipe || !take(state.inventory, recipe.cost)) return false;
  const p = state.player;
  for (const [item, n] of Object.entries(recipe.gives)) {
    const left = give(state.inventory, item, n);
    if (left > 0) { spawnDrop(state, p.x + p.w / 2, p.y, item, left); showHint(state, 'inventory full'); }
  }
  return true;
}
