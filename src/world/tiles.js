// Tile definitions and the questions asked of every tile: does it block movement, does it block
// sight, what breaks it, what harvests it. Both blocking answers depend on state for portals. DESIGN §5.
import { PORTAL } from '../config.js';

// hp: what zombies chew through (Infinity = they can't). harvest: what the player's tools do.
//   harvest.tool   'shovel' | 'axe' | 'pick' | 'any'
//   harvest.hits   swings to remove the tile
//   harvest.drop   item given (on removal, or every hit when perHit)
export const TILE_DEFS = {
  air:        { solid: false, opaque: false },
  dirt:       { solid: true,  opaque: true, hp: Infinity, harvest: { tool: 'shovel', hits: 2, drop: 'dirt' } },
  grass:      { solid: true,  opaque: true, hp: Infinity, harvest: { tool: 'shovel', hits: 2, drop: 'dirt' } },
  stone:      { solid: true,  opaque: true, hp: Infinity, harvest: { tool: 'pick', hits: 6, drop: 'stone', perHit: true } },
  bedrock:    { solid: true,  opaque: true, hp: Infinity },
  trunk:      { solid: false, opaque: false, hp: Infinity, harvest: { tool: 'axe', hits: 1, drop: 'wood' } },
  leaf:       { solid: false, opaque: false, hp: Infinity, harvest: { tool: 'any', hits: 1 } },
  wall:       { solid: true,  opaque: true, hp: 300, harvest: { tool: 'axe', hits: 4, drop: 'wood' } },
  wall_stone: { solid: true,  opaque: true, hp: 900, harvest: { tool: 'pick', hits: 6, drop: 'stone' } },
  floor:      { solid: true,  opaque: true, hp: 120, harvest: { tool: 'axe', hits: 2, drop: 'wood' } },
  ladder:     { solid: false, opaque: false, hp: 40, climbable: true, harvest: { tool: 'axe', hits: 1, drop: 'wood' } },
  door:       { portal: true, hp: 150, name: 'door',     barFrom: 'inside', harvest: { tool: 'axe', hits: 3, drop: 'wood' } },
  shutter:    { portal: true, hp: 60,  name: 'shutter',  barFrom: 'inside', climbThrough: true, harvest: { tool: 'axe', hits: 2, drop: 'wood' } },
  hatch:      { portal: true, hp: 120, name: 'trapdoor', barFrom: 'above',  climbableWhenOpen: true, harvest: { tool: 'axe', hits: 3, drop: 'wood' } },
};

export const TOOL_NAMES = { shovel: 'a shovel', axe: 'an axe', pick: 'a pickaxe', any: 'anything' };

export function makeTile(kind, extra = {}) {
  const def = TILE_DEFS[kind];
  if (!def) throw new Error(`unknown tile kind: ${kind}`);
  return { kind, hp: def.hp ?? 0, dig: 0, bars: 0, barHp: PORTAL.BAR_HP, open: false, broken: false, insideDir: 0, back: null, ...extra };
}

export const defOf = t => TILE_DEFS[t.kind];
export const isPortal = t => !!t && !!TILE_DEFS[t.kind].portal;
export const isAir = t => !t || t.kind === 'air';

export function isSolid(t) {
  if (!t) return false;
  const d = TILE_DEFS[t.kind];
  if (d.portal) return t.bars > 0 || (!t.open && !t.broken);
  return d.solid;
}

// In the current world every solid blocks sight and every passable thing lets it through.
// Kept as its own function because fences, bars and glass will split the two.
export const isOpaque = isSolid;

export function isClimbable(t) {
  if (!t) return false;
  const d = TILE_DEFS[t.kind];
  return !!d.climbable || (!!d.climbableWhenOpen && !isSolid(t));
}

export const portalName = t => TILE_DEFS[t.kind].name || t.kind;
export const maxHp = t => TILE_DEFS[t.kind].hp ?? 0;

// Combined "how broken does this look" for painters: zombie damage or player digging, whichever is further along.
export function integrity(t) {
  const d = TILE_DEFS[t.kind];
  const byHp = Number.isFinite(d.hp) && d.hp > 0 ? t.hp / d.hp : 1;
  const byDig = d.harvest ? 1 - t.dig / d.harvest.hits : 1;
  return Math.min(byHp, byDig);
}

// Zombie damage. Bars first, then the tile. A portal at 0 HP is broken (stuck open).
// Returns 'bar' | 'barBroke' | 'hit' | 'broke' | null.
export function damageTile(t, dmg) {
  if (t.bars > 0) {
    t.barHp -= dmg;
    if (t.barHp <= 0) { t.bars--; t.barHp = PORTAL.BAR_HP; return 'barBroke'; }
    return 'bar';
  }
  const d = TILE_DEFS[t.kind];
  if (d.portal) {
    if (t.open || t.broken) return null;
    t.hp -= dmg;
    if (t.hp <= 0) { t.hp = 0; t.broken = true; t.open = true; return 'broke'; }
    return 'hit';
  }
  if (!Number.isFinite(t.hp)) return null;
  t.hp -= dmg;
  return t.hp <= 0 ? 'broke' : 'hit';
}

// Player harvesting with a tool. Returns null if the tile can't be harvested at all,
// { wrongTool: needs } if the tool doesn't match, else { removed, drop }.
export function harvestTile(t, tool) {
  const h = TILE_DEFS[t.kind].harvest;
  if (!h) return null;
  if (h.tool !== 'any' && h.tool !== tool) return { wrongTool: h.tool };
  t.dig++;
  const removed = t.dig >= h.hits;
  const drop = h.perHit || removed ? (h.drop ?? null) : null;
  return { removed, drop };
}

// What an air tile left behind by removal looks like: earth removed underground shows dark earth;
// earth removed above the surface (a mound, a placed block) shows sky; structures keep their backwall.
export function airAfter(t, underground) {
  const earthy = ['dirt', 'grass', 'stone'].includes(t.kind);
  const back = earthy ? (underground ? 'earth' : null) : t.back;
  return back ? makeTile('air', { back }) : null;
}
