// Boot-time content validation. Catches a bad row in TILE_DEFS or CRAFTS immediately, with a
// clear message pointing at the row — instead of a silent rendering glitch or a menu entry that
// crafts nonsense discovered mid-playthrough. Call once, before the game starts. This is the
// "make the three vectors cheap" promise made real: adding a block/craft wrong fails loudly.
import { TILE_DEFS } from './world/tiles.js';
import { hasPainter } from './render/tiles.js';
import { ITEMS, CRAFTS } from './items.js';

export function validateContent() {
  const problems = [];

  for (const [kind, def] of Object.entries(TILE_DEFS)) {
    if (kind !== 'air' && !def.color && !hasPainter(kind)) {
      problems.push(`TILE_DEFS.${kind}: no color and no painter in render/tiles.js — it can't be drawn`);
    }
    if (def.harvest?.drop && !(def.harvest.drop in ITEMS)) {
      problems.push(`TILE_DEFS.${kind}.harvest.drop = '${def.harvest.drop}' is not a known item`);
    }
    if (def.portal && (!def.name || !def.barFrom)) {
      problems.push(`TILE_DEFS.${kind}: a portal needs both 'name' and 'barFrom'`);
    }
  }

  for (const item of Object.values(ITEMS)) {
    if (item.kind === 'placeable' && typeof item.make !== 'function') {
      problems.push(`ITEMS has a placeable with no make(): ${JSON.stringify(item)}`);
    }
  }

  for (const recipe of CRAFTS) {
    for (const id of Object.keys(recipe.cost)) if (!(id in ITEMS)) problems.push(`CRAFTS.${recipe.id}.cost references unknown item '${id}'`);
    for (const id of Object.keys(recipe.gives)) if (!(id in ITEMS)) problems.push(`CRAFTS.${recipe.id}.gives references unknown item '${id}'`);
  }

  if (problems.length) throw new Error(`Content validation failed:\n  ${problems.join('\n  ')}`);
}
