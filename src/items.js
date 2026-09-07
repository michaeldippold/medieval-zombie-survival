// Items, the hotbar, and what can be built or crafted. All data; no behaviour.
import { makeTile } from './world/tiles.js';

export const ITEMS = {
  sword:  { name: 'Sword',   kind: 'weapon' },
  bow:    { name: 'Bow',     kind: 'weapon', ammo: 'arrow' },
  shovel: { name: 'Shovel',  kind: 'tool', tool: 'shovel' },
  axe:    { name: 'Axe',     kind: 'tool', tool: 'axe' },
  pick:   { name: 'Pickaxe', kind: 'tool', tool: 'pick' },
  dirt:   { name: 'Dirt',    kind: 'material' },
  wood:   { name: 'Wood',    kind: 'material' },
  stone:  { name: 'Stone',   kind: 'material' },
  leaf:   { name: 'Leaves',  kind: 'material' },
  arrow:  { name: 'Arrows',  kind: 'material' },
};

export const HOTBAR = ['sword', 'bow', 'shovel', 'axe', 'pick'];

// Things you can place into an empty tile. `make(insideDir)` builds the tile; insideDir is the
// side the player stood on when placing, which becomes "inside" for doors and shutters.
export const BUILDS = [
  { id: 'dirt',       label: 'Dirt block',   cost: { dirt: 1 },  make: () => makeTile('dirt') },
  { id: 'leaf',       label: 'Leaves',       cost: { leaf: 1 },  make: () => makeTile('leaf') },
  { id: 'wall',       label: 'Timber wall',  cost: { wood: 1 },  make: () => makeTile('wall') },
  { id: 'floor',      label: 'Plank floor',  cost: { wood: 1 },  make: () => makeTile('floor') },
  { id: 'wall_stone', label: 'Stone wall',   cost: { stone: 1 }, make: () => makeTile('wall_stone') },
  { id: 'ladder',     label: 'Ladder',       cost: { wood: 1 },  make: () => makeTile('ladder') },
  { id: 'door',       label: 'Door',         cost: { wood: 2 },  make: dir => makeTile('door', { insideDir: dir }) },
  { id: 'shutter',    label: 'Shutter',      cost: { wood: 1 },  make: dir => makeTile('shutter', { insideDir: dir }) },
  { id: 'hatch',      label: 'Trapdoor',     cost: { wood: 2 },  make: () => makeTile('hatch') },
];

// Recipes: pay `cost`, receive `gives`. One click crafts one batch.
export const CRAFTS = [
  { id: 'arrows', label: 'Arrows ×4', cost: { wood: 1 }, gives: { arrow: 4 }, icon: 'arrow' },
];
