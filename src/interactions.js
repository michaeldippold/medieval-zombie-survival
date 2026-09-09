// What the player can do to a tile, as context-menu items, plus the craft palette entries.
// Rules live here; the widgets just render.
import { TILE, PLAYER, REINFORCE } from './config.js';
import { isPortal, isAir, portalName, defOf, TOOL_NAMES } from './world/tiles.js';
import { overlap } from './physics.js';
import { CRAFTS, ITEMS } from './items.js';
import { canAfford, take, give, haveLabel, count } from './inventory.js';
import { paintTile } from './render/tiles.js';
import { paintItemIcon } from './render/icons.js';
import { spawnDrop } from './entities/drops.js';
import { showHint } from './ui/hints.js';

// Reinforcement (bars/boards, DESIGN §11.1): an additive HP layer, available on any tile
// whose def names a `reinforceLabel` — doors/hatches ("Bar"), glass ("Board"). Costs a plank,
// never returned. `allowed`/`blockedNote` carry the one portal-specific rule (must be the
// "inside" side, and not while open); glass has neither, so it's just `true`/''.
function pushReinforcementItems(items, t, inv, near, far, allowed, blockedNote, change) {
  const label = defOf(t).reinforceLabel;
  if (!label) return;
  if (t.bars < REINFORCE.MAX) {
    const noPlank = !canAfford(inv, { plank: 1 });
    const why = !allowed ? blockedNote : noPlank ? ' — needs a plank' : far;
    items.push({
      label: `${label} ${portalName(t)} (${t.bars}/${REINFORCE.MAX})${why}`,
      disabled: !near || !allowed || noPlank,
      run: change(() => { take(inv, { plank: 1 }); t.bars++; t.barHp = REINFORCE.HP; }),
    });
  }
  if (t.bars > 0) {
    items.push({
      label: `Remove ${label.toLowerCase()} (${t.bars}/${REINFORCE.MAX})${!allowed ? blockedNote : far}`,
      disabled: !near || !allowed,
      run: change(() => { t.bars--; t.barHp = REINFORCE.HP; }),
    });
  }
}

// A curtain's own vertical run: every contiguous curtained glass cell above and below the one
// clicked, so opening or closing one works the whole window in one click (DESIGN §5.4b).
function curtainRun(world, c, r) {
  const cells = [[c, r]];
  for (let rr = r - 1; world.get(c, rr)?.curtain; rr--) cells.push([c, rr]);
  for (let rr = r + 1; world.get(c, rr)?.curtain; rr++) cells.push([c, rr]);
  return cells;
}

// State (curtain, DESIGN §11.1): applying or removing is a menu action gated on having one
// anywhere in the pack — matching bars and crafting, not a held-item interaction. Hanging and
// taking down touch only the clicked cell; opening/closing touches the whole vertical run.
function pushCurtainItems(items, world, t, c, r, inv, near, far, change) {
  if (!defOf(t).curtainable) return;
  if (!t.curtain) {
    const have = count(inv, 'curtain') > 0;
    items.push({
      label: `Hang curtain${have ? far : ' — needs one'}`, disabled: !near || !have,
      run: change(() => { take(inv, { curtain: 1 }); t.curtain = 'open'; }),
    });
    return;
  }
  const toggleTo = t.curtain === 'open' ? 'closed' : 'open';
  items.push({
    label: `${toggleTo === 'closed' ? 'Close' : 'Open'} curtain${far}`, primary: true, disabled: !near,
    run: change(() => { for (const [cc, rr] of curtainRun(world, c, r)) { const cell = world.get(cc, rr); if (cell) cell.curtain = toggleTo; } }),
  });
  items.push({
    label: `Take down curtain${far}`, disabled: !near,
    run: change(() => { give(inv, 'curtain', 1); t.curtain = null; }),
  });
}

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
    }
    const openUnbroken = t.open && !t.broken;
    pushReinforcementItems(items, t, inv, near, far, inside && !openUnbroken, openUnbroken ? ' — close it first' : sideNote, change);
  } else if (isAir(t)) {
    const canCraft = CRAFTS.some(cr => canAfford(inv, cr.cost));
    items.push({ label: canCraft ? 'Craft…' : 'Craft… (nothing you can afford yet)', primary: canCraft, run: () => ui.openCraft() });
  } else {
    pushCurtainItems(items, world, t, c, r, inv, near, far, change);
    pushReinforcementItems(items, t, inv, near, far, true, '', change);
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
