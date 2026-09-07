// Tile definitions and the two questions asked of every tile: does it block movement,
// does it block sight. Both depend on state for portals. See DESIGN §5.
import { PORTAL } from '../config.js';

export const TILE_DEFS = {
  air:     { solid: false, opaque: false },
  dirt:    { solid: true,  opaque: true, hp: 3,   diggable: 'shovel', drop: 'dirt' },
  grass:   { solid: true,  opaque: true, hp: 3,   diggable: 'shovel', drop: 'dirt' },
  stone:   { solid: true,  opaque: true, hp: 8,   diggable: 'pick',   drop: 'stone' },
  bedrock: { solid: true,  opaque: true, hp: Infinity },
  wall:    { solid: true,  opaque: true, hp: 300 },
  floor:   { solid: true,  opaque: true, hp: 120 },
  ladder:  { solid: false, opaque: false, hp: 40, climbable: true },
  door:    { portal: true, hp: 150, name: 'door',     barFrom: 'inside' },
  shutter: { portal: true, hp: 60,  name: 'shutter',  barFrom: 'inside', climbThrough: true },
  hatch:   { portal: true, hp: 120, name: 'trapdoor', barFrom: 'above',  climbableWhenOpen: true },
};

export function makeTile(kind, extra = {}) {
  const def = TILE_DEFS[kind];
  if (!def) throw new Error(`unknown tile kind: ${kind}`);
  return { kind, hp: def.hp ?? 0, bars: 0, barHp: PORTAL.BAR_HP, open: false, broken: false, insideDir: 0, back: null, ...extra };
}

export const defOf = t => TILE_DEFS[t.kind];
export const isPortal = t => !!t && !!TILE_DEFS[t.kind].portal;

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

// Bars take damage first; then the tile itself. A portal at 0 HP is broken (stuck open).
// Returns what happened so callers can react: 'bar' | 'barBroke' | 'hit' | 'broke' | null.
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
