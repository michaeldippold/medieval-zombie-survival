// Items are the whole vocabulary of things the player can hold: weapons, tools, materials,
// and placeables. All data; behaviour lives in combat.js / tools.js / placement.js, which
// dispatch on `kind`. See DESIGN §5.5 / §7.3 — everything is an item.
//
//   kind: 'weapon'    — sword/bow; never consumed by use. `ammo` names a material item.
//   kind: 'tool'      — shovel/axe/pick; never consumed by use. `tool` matches a tile's harvest.tool.
//   kind: 'material'  — raw stuff (wood, stone, arrows); has no world presence of its own.
//   kind: 'placeable' — a material that IS a tile: `make(insideDir)` builds it, and it is what
//                        harvesting the built tile gives back (see world/tiles.js TILE_DEFS
//                        `harvest.drop`). Raw earth (dirt/leaves) is placeable straight off the
//                        ground; built structures (walls, doors, ...) are placeable only after
//                        a recipe turns wood/stone into them.
import { makeTile } from './world/tiles.js';

export const ITEMS = {
  sword:  { name: 'Sword',   kind: 'weapon' },
  bow:    { name: 'Bow',     kind: 'weapon', ammo: 'arrow' },
  shovel: { name: 'Shovel',  kind: 'tool', tool: 'shovel' },
  axe:    { name: 'Axe',     kind: 'tool', tool: 'axe' },
  pick:   { name: 'Pickaxe', kind: 'tool', tool: 'pick' },

  wood:   { name: 'Wood',   kind: 'material' },
  stone:  { name: 'Stone',  kind: 'material' },
  arrow:  { name: 'Arrows', kind: 'material' },

  dirt:       { name: 'Dirt',        kind: 'placeable', make: () => makeTile('dirt') },
  leaf:       { name: 'Leaves',      kind: 'placeable', make: () => makeTile('leaf') },
  wall:       { name: 'Timber Wall', kind: 'placeable', make: () => makeTile('wall') },
  floor:      { name: 'Plank Floor', kind: 'placeable', make: () => makeTile('floor') },
  wall_stone: { name: 'Stone Wall',  kind: 'placeable', make: () => makeTile('wall_stone') },
  ladder:     { name: 'Ladder',      kind: 'placeable', make: () => makeTile('ladder') },
  door:       { name: 'Door',        kind: 'placeable', make: dir => makeTile('door', { insideDir: dir }) },
  shutter:    { name: 'Shutter',     kind: 'placeable', make: dir => makeTile('shutter', { insideDir: dir }) },
  hatch:      { name: 'Trapdoor',    kind: 'placeable', make: () => makeTile('hatch') },
};

// Slots 0..HOTBAR_SIZE-1 of a fresh inventory. Dirt/leaves aren't here — they're dug up, not started with.
export const STARTER_LOADOUT = ['sword', 'bow', 'shovel', 'axe', 'pick'];
export const STARTER_EXTRA = { slot: 5, id: 'arrow', n: 10 };

// Recipes: pay `cost` in materials, receive `gives`. One click crafts one batch. Every
// structure a player can place goes through here — raw earth does not (see ITEMS above).
export const CRAFTS = [
  { id: 'wall',       label: 'Timber wall',  cost: { wood: 1 },  gives: { wall: 1 } },
  { id: 'floor',      label: 'Plank floor',  cost: { wood: 1 },  gives: { floor: 1 } },
  { id: 'wall_stone', label: 'Stone wall',   cost: { stone: 1 }, gives: { wall_stone: 1 } },
  { id: 'ladder',     label: 'Ladder',       cost: { wood: 1 },  gives: { ladder: 1 } },
  { id: 'door',       label: 'Door',         cost: { wood: 2 },  gives: { door: 1 } },
  { id: 'shutter',    label: 'Shutter',      cost: { wood: 1 },  gives: { shutter: 1 } },
  { id: 'hatch',      label: 'Trapdoor',     cost: { wood: 2 },  gives: { hatch: 1 } },
  { id: 'arrows',     label: 'Arrows ×4',    cost: { wood: 1 },  gives: { arrow: 4 } },
];
