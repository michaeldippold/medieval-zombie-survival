// Tile definitions and the questions asked of every tile: does it block movement, does it block
// sight, what breaks it, what harvests it. Both blocking answers depend on state for portals. DESIGN §5.
import { PORTAL } from '../config.js';

// hp: what zombies chew through (Infinity = they can't). harvest: what the player's tools do.
//   harvest.tool   'shovel' | 'axe' | 'pick' | 'any'
//   harvest.hits   swings to remove the tile
//   harvest.drop   item given (on removal, or every hit when perHit)
// Look: a block with `color` (and optional `cap`, `edge`) is painted by the default painter;
// only blocks with a distinctive look need an entry in render/tiles.js. A plain new block is one row here.
//
// harvest.drop on a natural tile (dirt/stone/trunk/leaf) is a raw material — digging it up
// literally gives you that material. On a built tile (wall/floor/door/...) it is the tile's
// OWN item id: dismantling gives back the exact thing, which can be carried and placed again.
// A tile a zombie breaks (not harvested) never drops anything — see world/vision.js airAfter callers.
//
// Solidity is fixed per kind by what the kind is FOR, in three tiers — never toggled by
// natural-vs-placed origin (DESIGN §5.3):
//   terrain     (dirt, stone, bedrock)      — always solid; it's the ground, above or below
//   decoration  (trunk, leaf)               — always non-solid/non-opaque, forever, even placed
//   structure   (wall, floor, door, ...)    — always solid (ladders climb-through); the one
//                                              tier whose entire purpose is to be a barrier
// A placed log is decoration (item 'log' makes a 'trunk' tile) — a felled tree put back down
// is still a tree, not a wall. A real wall is the separate, crafted `wall` item.
//
// `placedHp`: terrain is infinite-hp (un-attackable) as the natural, contiguous earth a
// tunnel is dug into or an underground base is sealed by ("zombies cannot dig; earth is the
// strongest wall"). A tile *placed* from an item is a different thing — a block someone set
// down, not a mass of rock with no path through it — so placement.js gives it this much
// finite hp instead, letting zombies claw through a stacked-dirt "wall" the way they would any
// other flimsy barrier. Without this, dirt (the one directly-placeable terrain item, no
// crafting required) stacked 3 tall is a free, permanent, un-scrambleable, un-attackable
// fortress — worse than any crafted wall — which is exactly backwards.
export const TILE_DEFS = {
  air:        { solid: false, opaque: false },
  dirt:       { solid: true,  opaque: true, hp: Infinity, placedHp: 40, color: '#7a4f2a', harvest: { tool: 'shovel', hits: 2, drop: 'dirt' } },
  grass:      { solid: true,  opaque: true, hp: Infinity, harvest: { tool: 'shovel', hits: 2, drop: 'dirt' } },
  stone:      { solid: true,  opaque: true, hp: Infinity, color: '#8a8d93', edge: 'rgba(0,0,0,0.22)', harvest: { tool: 'pick', hits: 6, drop: 'stone', perHit: true } },
  bedrock:    { solid: true,  opaque: true, hp: Infinity, color: '#2b2d31' },
  trunk:      { solid: false, opaque: false, hp: Infinity, harvest: { tool: 'axe', hits: 1, drop: 'log' } },
  leaf:       { solid: false, opaque: false, hp: Infinity, harvest: { tool: 'any', hits: 1, drop: 'leaf' } },
  wall:       { solid: true,  opaque: true, hp: 300, color: '#c9a978', edge: 'rgba(0,0,0,0.18)', harvest: { tool: 'axe', hits: 4, drop: 'wall' } },
  wall_stone: { solid: true,  opaque: true, hp: 900, harvest: { tool: 'pick', hits: 6, drop: 'wall_stone' } },
  floor:      { solid: true,  opaque: true, hp: 120, harvest: { tool: 'axe', hits: 2, drop: 'floor' } },
  ladder:     { solid: false, opaque: false, hp: 40, climbable: true, harvest: { tool: 'axe', hits: 1, drop: 'ladder' } },
  // Two tiles tall (DESIGN §5.1/§6.1): a body this height needs a door taller than one tile to
  // fit through anything with a solid wall above it. `footprint` names the extra cell(s) a
  // placed instance occupies, relative to the anchor cell it's placed at — see `stampMulti`.
  // The trapdoor stays one tall; it's floored, not walked through vertically.
  door:       { portal: true, hp: 150, name: 'door',     barFrom: 'inside', harvest: { tool: 'axe', hits: 3, drop: 'door' }, footprint: [[0, -1]] },
  shutter:    { portal: true, hp: 60,  name: 'shutter',  barFrom: 'inside', climbThrough: true, harvest: { tool: 'axe', hits: 2, drop: 'shutter' }, footprint: [[0, -1]] },
  hatch:      { portal: true, hp: 120, name: 'trapdoor', barFrom: 'above',  climbableWhenOpen: true, harvest: { tool: 'axe', hits: 3, drop: 'hatch' } },

  // Proves the `contact` hook (DESIGN §5.3/§8): a rule-ful block that's still just a row plus
  // one predicate, checked once in the player's body step (see entities/player.js). Not placed
  // by the generator yet — a future dungeon/trap tile.
  spikes:     { solid: false, opaque: false, hp: Infinity, color: '#8a3b3b', edge: 'rgba(0,0,0,0.3)', contact: { dmg: 15, cooldown: 0.6 } },
};

export const TOOL_NAMES = { shovel: 'a shovel', axe: 'an axe', pick: 'a pickaxe', any: 'anything' };

export function makeTile(kind, extra = {}) {
  const def = TILE_DEFS[kind];
  if (!def) throw new Error(`unknown tile kind: ${kind}`);
  return { kind, hp: def.hp ?? 0, dig: 0, bars: 0, barHp: PORTAL.BAR_HP, open: false, broken: false, insideDir: 0, back: null, ...extra };
}

// Called once, right after a placeable item builds its tile (placement.js). Overrides hp for
// kinds with a `placedHp` (currently just dirt) so a placed instance is attackable even though
// the natural version of the same kind is not. A no-op for every other tile.
export function applyPlacedHp(tile) {
  const placedHp = TILE_DEFS[tile.kind].placedHp;
  if (placedHp != null) { tile.hp = placedHp; tile.maxHp = placedHp; }
  return tile;
}

// A multi-cell tile (DESIGN §5.8) is one real tile object — the anchor, built by `makeTile`
// like any other — plus a lightweight `{ kind: 'part', anchor }` wrapper written into every
// other cell its def's `footprint` names. Every predicate below resolves a part straight to
// its anchor (one level of recursion, no world lookup needed, since `anchor` is a direct object
// reference) so callers never need to know or care whether the cell they're looking at is the
// anchor or a part. Only a mutation done *inline* by a caller (not through one of these
// functions) has to resolve first — see interactions.js.
export function stampMulti(world, c, r, anchor) {
  anchor.footAt = { c, r };
  world.set(c, r, anchor);
  for (const [dc, dr] of TILE_DEFS[anchor.kind].footprint || []) world.set(c + dc, r + dr, { kind: 'part', anchor });
  return anchor;
}

// Every cell a multi-cell tile occupies, anchor first, as [c, r] pairs — what a removal has to
// clear, or a placement ghost has to preview, in full.
export function footprintCells(anchor) {
  const { c, r } = anchor.footAt;
  return [[c, r], ...(TILE_DEFS[anchor.kind].footprint || []).map(([dc, dr]) => [c + dc, r + dr])];
}

export const defOf = t => t.kind === 'part' ? defOf(t.anchor) : TILE_DEFS[t.kind];
export const isPortal = t => !!t && (t.kind === 'part' ? isPortal(t.anchor) : !!TILE_DEFS[t.kind].portal);
export const isAir = t => !t || t.kind === 'air';

export function isSolid(t) {
  if (!t) return false;
  if (t.kind === 'part') return isSolid(t.anchor);
  const d = TILE_DEFS[t.kind];
  if (d.portal) return t.bars > 0 || (!t.open && !t.broken);
  return d.solid;
}

// In the current world every solid blocks sight and every passable thing lets it through.
// Kept as its own function because fences, bars and glass will split the two.
export const isOpaque = isSolid;

export function isClimbable(t) {
  if (!t) return false;
  if (t.kind === 'part') return isClimbable(t.anchor);
  const d = TILE_DEFS[t.kind];
  return !!d.climbable || (!!d.climbableWhenOpen && !isSolid(t));
}

export const portalName = t => t.kind === 'part' ? portalName(t.anchor) : (TILE_DEFS[t.kind].name || t.kind);
// The `contact` def for a tile, if any (e.g. spikes' { dmg, cooldown }) — a generic hazard hook
// any body's update step can check without knowing which tile kinds use it.
export const contactDamage = t => !t ? null : t.kind === 'part' ? contactDamage(t.anchor) : (TILE_DEFS[t.kind].contact ?? null);

// A tile a zombie can chew through: a portal, or anything with finite *current* hp. Checking
// the instance (t.hp), not the def, is what lets a placed dirt block (finite, via placedHp)
// differ from the natural dirt around it (still Infinity) while sharing one tile kind.
export function canZombieDamage(t) {
  if (!t) return false;
  if (t.kind === 'part') return canZombieDamage(t.anchor);
  return !!TILE_DEFS[t.kind].portal || Number.isFinite(t.hp);
}
export const maxHp = t => t.kind === 'part' ? maxHp(t.anchor) : (TILE_DEFS[t.kind].hp ?? 0);

// Combined "how broken does this look" for painters: zombie damage or player digging, whichever
// is further along. Uses the instance's own starting hp (t.maxHp, set at placement time for a
// tile whose hp doesn't match its def — see placedHp above) when present, else the def's.
export function integrity(t) {
  if (t.kind === 'part') return integrity(t.anchor);
  const d = TILE_DEFS[t.kind];
  const startHp = t.maxHp ?? d.hp;
  const byHp = Number.isFinite(t.hp) && startHp > 0 ? t.hp / startHp : 1;
  const byDig = d.harvest ? 1 - t.dig / d.harvest.hits : 1;
  return Math.min(byHp, byDig);
}

// Zombie damage. Bars first, then the tile. A portal at 0 HP is broken (stuck open).
// Returns 'bar' | 'barBroke' | 'hit' | 'broke' | null. Redirecting to the anchor here (rather
// than at the call site) is what makes a 2-tall door one door regardless of which half a
// zombie is punching: the mutation lands on the shared object either way.
export function damageTile(t, dmg) {
  if (t.kind === 'part') return damageTile(t.anchor, dmg);
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
// { wrongTool: needs } if the tool doesn't match, else { removed, drop }. Redirects to the
// anchor exactly like damageTile — chip away at either half, the progress is shared.
export function harvestTile(t, tool) {
  if (t.kind === 'part') return harvestTile(t.anchor, tool);
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
