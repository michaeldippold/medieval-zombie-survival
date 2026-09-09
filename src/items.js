// Items are the whole vocabulary of things the player can hold: weapons, tools, materials,
// and placeables. All data; behaviour lives in combat.js / tools.js / placement.js, which
// dispatch on `kind`. See DESIGN §5.5 / §7.3 — everything is an item.
//
//   kind: 'weapon'    — sword/bow; never consumed by use. `ammo` names a material item.
//   kind: 'tool'      — shovel/axe/pick; never consumed by use. `tool` matches a tile's harvest.tool.
//   kind: 'material'  — raw stuff (planks, stone, arrows); has no world presence of its own.
//   kind: 'placeable' — a material that IS a tile: `make(insideDir)` builds it, and it is what
//                        harvesting the built tile gives back (see world/tiles.js TILE_DEFS
//                        `harvest.drop`). Raw earth (dirt/leaves/logs) is placeable straight off
//                        the ground/tree; built structures (walls, doors, ...) are placeable
//                        only after a recipe turns planks or stone into them.
import { makeTile } from './world/tiles.js';

export const ITEMS = {
  sword:  { name: 'Sword',   kind: 'weapon' },
  bow:    { name: 'Bow',     kind: 'weapon', ammo: 'arrow' },
  shovel: { name: 'Shovel',  kind: 'tool', tool: 'shovel' },
  axe:    { name: 'Axe',     kind: 'tool', tool: 'axe' },
  pick:   { name: 'Pickaxe', kind: 'tool', tool: 'pick' },

  plank:  { name: 'Planks', kind: 'material' },   // sawn from a log; what every structure recipe costs
  stone:  { name: 'Stone',  kind: 'material' },
  arrow:  { name: 'Arrows', kind: 'material' },
  // Never placed directly (no make()) — applied to glass via the right-click menu, the same
  // way a plank is spent to bar a door, not held-and-used like a tool (DESIGN §11.1).
  curtain: { name: 'Curtain', kind: 'material' },

  dirt:       { name: 'Dirt',        kind: 'placeable', make: () => makeTile('dirt') },
  leaf:       { name: 'Leaves',      kind: 'placeable', make: () => makeTile('leaf') },
  log:        { name: 'Log',         kind: 'placeable', make: () => makeTile('trunk') },  // decoration, same rules whether grown or placed — never a wall (DESIGN §5.3)
  wall:       { name: 'Timber Wall', kind: 'placeable', make: () => makeTile('wall') },
  floor:      { name: 'Plank Floor', kind: 'placeable', make: () => makeTile('floor') },
  wall_stone: { name: 'Stone Wall',  kind: 'placeable', make: () => makeTile('wall_stone') },
  ladder:     { name: 'Ladder',      kind: 'placeable', make: () => makeTile('ladder') },
  door:       { name: 'Door',        kind: 'placeable', make: dir => makeTile('door', { insideDir: dir }) },
  hatch:      { name: 'Trapdoor',    kind: 'placeable', make: () => makeTile('hatch') },
  // No recipe yet — sand + furnace is Phase 8; until then glass is only found (DESIGN §5.4b).
  glass:      { name: 'Glass',       kind: 'placeable', make: () => makeTile('glass') },
};

// Slots 0..HOTBAR_SIZE-1 of a fresh inventory. Dirt/leaves/logs aren't here — they're dug or felled, not started with.
export const STARTER_LOADOUT = ['sword', 'bow', 'shovel', 'axe', 'pick'];
export const STARTER_EXTRA = { slot: 5, id: 'arrow', n: 10 };

// Recipes: pay `cost` in materials, receive `gives`. One click crafts one batch. Every
// structure a player can place goes through here — raw earth, and the log itself, does not
// (see ITEMS above). A tree's yield is amplified here, not by piling up more/taller trees:
// each trunk tile gives one log 1:1, and one log saws into four planks — four times the
// building material per tree, no farming required, one block still equals one item.
// wall/floor give 2 per plank, not 1 (2026-09-08, DESIGN §6.1): rooms are taller now that
// bodies are two tiles tall, so building one costs more tiles for the same floor plan — this
// keeps it from also costing proportionally more trees.
export const CRAFTS = [
  { id: 'planks',     label: 'Planks ×4',    cost: { log: 1 },   gives: { plank: 4 } },
  { id: 'wall',       label: 'Timber wall ×2', cost: { plank: 1 }, gives: { wall: 2 } },
  { id: 'floor',      label: 'Plank floor ×2', cost: { plank: 1 }, gives: { floor: 2 } },
  { id: 'wall_stone', label: 'Stone wall',   cost: { stone: 1 }, gives: { wall_stone: 1 } },
  { id: 'ladder',     label: 'Ladder',       cost: { plank: 1 }, gives: { ladder: 1 } },
  { id: 'door',       label: 'Door',         cost: { plank: 2 }, gives: { door: 1 } },
  { id: 'curtain',    label: 'Curtain',      cost: { plank: 2 }, gives: { curtain: 1 } },
  { id: 'hatch',      label: 'Trapdoor',     cost: { plank: 2 }, gives: { hatch: 1 } },
  { id: 'arrows',     label: 'Arrows ×4',    cost: { plank: 1 }, gives: { arrow: 4 } },
];
