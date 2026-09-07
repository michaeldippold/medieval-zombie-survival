// What the player can do to a tile, as context-menu items. Rules live here; the menu widget just renders.
import { TILE, PLAYER, PORTAL } from './config.js';
import { isPortal, isSolid, portalName, defOf } from './world/tiles.js';
import { overlap } from './physics.js';

// Returns [{ label, primary?, disabled?, run? }]. Always ends with Cancel.
export function menuItemsForTile(state, c, r) {
  const { world, player: p, zombies } = state;
  const t = world.get(c, r);
  const items = [];

  if (isPortal(t) && !p.dead) {
    const name = portalName(t), def = defOf(t);
    const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
    const tcx = c * TILE + TILE / 2, tcy = r * TILE + TILE / 2;
    const near = Math.hypot(pcx - tcx, pcy - tcy) < PLAYER.REACH;
    const far = near ? '' : ' (walk closer)';
    const rect = world.rectOf(c, r);
    const blocked = overlap(p, rect) || zombies.some(z => !z.stunned && overlap(z, rect));
    const inside = def.barFrom === 'above' ? pcy < r * TILE : (pcx - tcx) * t.insideDir > 0;
    const sideNote = def.barFrom === 'above' ? ' (only from above)' : ' (only from inside)';
    const change = fn => () => { fn(); world.touch(); };

    if (t.bars === 0) {
      if (t.broken) items.push({ label: `${name} is broken`, disabled: true });
      else if (t.open) items.push({ label: blocked ? `Close ${name} (blocked)` : `Close ${name}${far}`, primary: true, disabled: !near || blocked, run: change(() => { t.open = false; }) });
      else items.push({ label: `Open ${name}${far}`, primary: true, disabled: !near, run: change(() => { t.open = true; }) });
      if (def.climbThrough && !isSolid(t)) items.push({ label: `Climb through${far}`, primary: true, disabled: !near, run: () => { p.x = c * TILE + (TILE - p.w) / 2; p.y = r * TILE + TILE - p.h; p.vy = 0; } });
    }
    if (t.bars < PORTAL.MAX_BARS) {
      const openUnbroken = t.open && !t.broken;
      const why = openUnbroken ? ' — close it first' : !inside ? sideNote : far;
      items.push({ label: `Bar ${name} (${t.bars}/${PORTAL.MAX_BARS})${why}`, disabled: !near || openUnbroken || !inside, run: change(() => { t.bars++; t.barHp = PORTAL.BAR_HP; }) });
    }
    if (t.bars > 0) items.push({ label: `Remove bar (${t.bars}/${PORTAL.MAX_BARS})${!inside ? sideNote : far}`, disabled: !near || !inside, run: change(() => { t.bars--; t.barHp = PORTAL.BAR_HP; }) });
  }

  items.push({ label: 'Cancel' });
  return items;
}
