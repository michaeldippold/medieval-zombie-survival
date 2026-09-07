# TODO

Phases are ordered. Within a phase, items are roughly ordered. A phase is done when every
box is ticked and the game has been *played* at the end of it. Check `DESIGN.md` section
numbers for the spec.

Conventions: `[ ]` open · `[x]` done · `[-]` dropped (say why in a note).

---

## Phase 0 — Foundation

- [x] Design doc (`docs/DESIGN.md`)
- [x] This plan
- [x] Repo initialised, `.gitignore`, `README.md`
- [x] GitHub Pages deploy (static, from `main`, via Actions)
- [x] Module skeleton per DESIGN §16
- [x] `config.js` holds every constant from the prototype

## Phase 1 — Port the prototype into modules (feature parity)

The last single-file prototype is the reference. Nothing new in this phase; the goal is a
codebase that can *take* the later phases. Parity checklist:

- [x] World: 60×14 grid, grass/dirt, timber house with roof, walls, floor, ladder
- [x] Tiles: definitions table; `isSolid` / `isOpaque` / `isClimbable` / `isPortal`; `damageTile`
- [x] Portals: door / shutter / hatch with open/closed/broken + bars; inside/above rules
- [x] Physics: `moveBody` X-then-Y, ladders with slide, jump-off grace, `tryClimb`
- [x] Vision: flood fill, exposed/sealed, lit borders, overlay, entity culling
- [x] Player: movement, HP, hurt flash, infection clock + fever cue, death causes
- [x] Zombies: wander / investigate / chase / attack-portal / climb / stagger / corpse
- [x] Attention: shared sighting point pulls wanderers
- [x] Zombie collision rules (climbers ignore the pile)
- [x] Combat: sword timing + sector; bow hitscan + homing arrow; HP 3; wound notches
- [x] Context menu with reasons on disabled items; hover outline
- [x] HUD: HP bar, enclosure label, hotbar with cooldown sweeps, death screen
- [x] Camera in both axes (Y is a no-op on the 14-row map, but wired)
- [x] Restart (R) rebuilds everything from `maps.js`
- [ ] Played once end to end in the modular build; behaviour matches the prototype *(runs clean; needs a human playtest)*

## Phase 2 — Resources, building, depth (DESIGN §5.5, §11)

The first full loop: get resources → build a house → don't die.

- [x] World 120×40, seeded: surface row 24, dirt to 31, stone to 38, bedrock 39
- [x] Vertical camera with upward bias; clouds parallax against the camera
- [x] `air` tiles with `back` — dark earth when dug, plaster inside structures
- [x] Trees: trunk 3–5 + leaf blob; **no collision, no sight blocking**. Axe fells a trunk tile in one hit → 1 wood. Leaves fall to anything, give nothing.
- [x] Stone: solid; surface mounds and an underground layer. Pickaxe yields 1 stone **per hit**, tile gone after 6.
- [x] Dirt/grass: shovel, 2 hits → 1 dirt
- [x] Harvest model on every tile def (`tool`, `hits`, `drop`, `perHit`); progress shown as cracks
- [x] Tools on the hotbar: 3 shovel, 4 axe, 5 pickaxe; left-click harvests the tile under the cursor in reach; wrong tool → hint
- [x] Mined blocks become drops that fall and are picked up by walking over them
- [x] Inventory counts (wood / stone / dirt / arrows) in the HUD
- [x] Building on right-click of an empty tile, with costs: dirt 1, timber wall 1 wood, plank floor 1 wood, stone wall 1 stone, ladder 1 wood, door 2 wood, shutter 1 wood, trapdoor 2 wood. Doors/shutters take "inside" from the side you stand on.
- [x] Dismantling: axe on walls/floors/doors/ladders, pickaxe on stone walls — refunds the material
- [x] Arrows finite: 10 to start; misses drop where they land; 60% recovered off a hit; fletch 4 from 1 wood
- [x] Bedrock indestructible; world edge walls
- [x] Build palette (tile thumbnails, have/need, lit if affordable) → build mode with a ghost preview; click to stamp; Esc or hotbar key to leave; weapons/tools off while building
- [x] Craft palette (same widget): recipes as data; click crafts one batch; arrows ×4 for 1 wood is the only recipe so far
- [x] Inventory: 20 slots, one unlimited stack per item, `I`/`Tab` window, drag-to-swap, full → drops stay on the ground
- [x] Leaves drop and can be placed back
- [x] Surface stone actually spawns (mounds were being excluded by tree spacing); underground stone veins; natural caves
- [x] Underground base confirmed: dig in, cap with floor + trapdoor, sealed
- [x] Pits: zombies fall in and stack; a 2-deep 1-wide pit holds one before the next walks over it. Emergent from body collision — keep.
- [ ] Scrambling: a chasing zombie blocked by a 2-tile obstacle climbs it slowly (~5 s, visible state); 3+ is impossible. `MAX_SCRAMBLE` in config. Makes pits a delay, low fences a bad wall, 3-high a real one.
- [ ] Zombies attack timber/stone walls when they're what's in the way (slowly) — otherwise a wall is a cheat
- [ ] Played: fell trees, build a hut with a door, seal it, survive; dig a basement, cap it, confirm sealed

## Phase 2b — Everything is an item (DESIGN §7.3, §5.5)

Replace "Build… palette crafts-and-places in one step" with the Minecraft model: placeables are
items, the hotbar holds items, placing is using the selected item. The ghost preview stays; it
is the placement UI regardless of where the item came from. Mostly deletion. Do in this order —
each step leaves the game playable.

1. [ ] **Hotbar = inventory slots 0–4.** `HOTBAR` stops being a fixed list; the bar renders
       `inventory.slots[0..4]` (icons + counts). Number keys select a slot. `state.held` becomes
       a slot index; "what am I holding" is `slots[held]?.id`. Start inventory puts sword, bow,
       shovel, axe, pickaxe in slots 0–4 and 10 arrows in slot 5.
2. [ ] **Drag between inventory and hotbar.** The inventory window shows all 20 slots with the
       first row marked as the bar; dragging already swaps any two slots, so this is styling.
3. [ ] **Placeable items.** `ITEMS` gains `places: <tile kind>` (and a `make(insideDir)`) for
       dirt, stone, leaf, wall, floor, wall_stone, ladder, door, shutter, hatch. Holding one
       shows the ghost; left click stamps one and takes 1 from the stack. Empty stack → ghost
       goes red, hint "none left". Selecting another slot is the only way out; no build mode
       flag, no Esc needed.
4. [ ] **Craft, not Build.** Remove `BUILDS` and the Build… entry. `CRAFTS` grows: timber wall
       (1 wood → 1), plank floor (1 wood → 1), ladder (1 wood → 1), door (2 wood → 1), shutter
       (1 wood → 1), trapdoor (2 wood → 1), stone wall (1 stone → 1), arrows (1 wood → 4).
       Crafted output prefers a free hotbar slot, then inventory, then drops at your feet.
5. [ ] **Dismantle drops the thing.** Player harvesting a placed tile drops its item
       (`door` → 1 door, `wall` → 1 timber wall), not its ingredients. Zombie destruction
       (`broken`) drops nothing but splinters — losing it and taking it down are different.
       Raw earth keeps dropping raw earth.
6. [ ] **Tools are items too.** Sword/bow/shovel/axe/pick live in slots like anything else; they
       can be dropped, moved, and later crafted, looted and worn out. Bow reads ammo from
       inventory as now.
7. [ ] Remove `build.js`'s mode machinery (`enterBuild`/`exitBuild`), keep `canPlaceAt` and the
       ghost. Remove `buildEntries`. Update legend, DESIGN §5.5 / §7.3, and this file.
8. [ ] Played: dig, craft a door, drag it to the bar, place it, take it down with the axe, pick
       the door back up, place it again.

### 2b-trees — trunks are blocks, logs → planks
- [ ] Trunk tile fills the whole 40px block (bark texture edge to edge) so it reads as a block
      you could place, and looks right beside planks in a wall
- [ ] Trunk drops a **log** item; logs are placeable (a bark block for builds — visual variety,
      costs a whole log)
- [ ] Craft: 1 log → 4 **planks**. Walls, floors, ladders, doors, shutters, trapdoors cost planks
      (same numbers as today's wood costs). Arrows: 1 plank → 4. This is the 2D wood-yield fix:
      4× per tree, no farming needed, one block still equals one item.
- [ ] Some trees spawn with 2-wide trunks (both columns are trunk tiles; leaf blob spans both);
      more logs per tree and a different silhouette
- [ ] Tree counts/heights retuned after the above so a starter house is ~2 trees of work
- Backlog: saplings / regrowth, if wood ever runs dry on a long run

## Phase 2c — Extensibility: make the three vectors cheap

The game grows along three vectors — blocks, crafts, entities — plus systems. This phase makes
the first three data-driven enough that a rule-free addition is one row, and a rule-ful one is
one row plus one predicate. Do after 2b (crafting redo) so the item model is settled.

### Blocks (one row for a plain block, row + painter for a distinctive one)
- [x] Default painter from the def (`color`, `cap`, `edge`); dedicated painters only for looks
- [ ] Load-time validation of `TILE_DEFS`: every non-air kind has `color` or a painter; every
      `harvest.drop` is a known item; portals have `name` and `barFrom`. Throw on boot, not in play.
- [ ] `contact` hook on defs (e.g. `spikes: { contact: { dmg: 10 } }`) checked once in the
      player/zombie body step — the first rule-ful block type, added as data
- [ ] Placeables derived from items (`ITEMS[id].places`), not a separate list — done in 2b step 3
- [ ] `docs/ADDING.md`: the three checklists (block / craft / entity), each a numbered list of
      files touched, with a worked example. Keep it to one page.

### Crafts (one row per recipe)
- [ ] Recipe validation at boot: every `cost` and `gives` id exists in `ITEMS`
- [ ] Optional `station` on a recipe; the Craft palette filters by stations within reach.
      No station = craftable anywhere (arrows). Workbench is the first station (Phase 4).
- [ ] Recipe `icon` defaults to the `gives` item's icon

### Entities (create + decide + painter per kind)
- [ ] Split `zombie.js`: `entities/body.js` owns gravity, ladder overlap, `moveBody`, stagger
      and death/corpse timers for any mover; `zombie.js` keeps senses + decide only
- [ ] `state.entities` as one list with `kind`; per-kind `update(state, e, dt)` and
      `paint(ctx, e)` looked up from a registry (`entities/index.js`)
- [ ] Collision rules as a table: who is solid to whom (`player`, `zombie`, `climber`, `corpse`,
      `animal`) instead of inline filters in the zombie loop
- [ ] Zombie-specific senses (`sees`, `lastSeen`, attention) stay in `zombie.js`; a shared
      `canSee(state, e)` helper for anything that uses the enclosure model
- [ ] Spawn table in worldgen: `{ kind, count, where }` instead of a hardcoded zombie loop
- [ ] Prove it with the first animal: **chicken** — wanders, flees when it can see you, dies in
      one hit, drops `meat`. Meat is the seed for Phase 3 hunger. If adding it touches anything
      outside `entities/chicken.js`, the registry, and the spawn table, the split isn't done.

### Systems (not data — noted so it's not forgotten)
- Needs, day/night, noise, spawning pressure are `(state, dt)` functions added to the update
  order in `game.js`. Each gets a config block. No changes needed to make these "easy";
  they're design work, not plumbing.

## Phase 3 — Needs and time (DESIGN §7.4, §12)

- [ ] Day/night: 10-minute day, sky colour ramp, ambient overlay ramp, day counter in HUD
- [ ] Hunger / thirst / fatigue meters; drain rates; low-meter penalties; HP drain at zero
- [ ] Food items and a water source (well tile); eat/drink via hotbar or context menu
- [ ] Bed tile: sleep to dawn, only when sealed, interrupted by breach
- [ ] Night zombie modifiers (speed, sight)
- [ ] Played: survive three nights

## Phase 4 — Building tiers and crafting (DESIGN §11)

- [ ] Materials: timber (trees, axe), stone (pick), iron (ore + forge). Iron ore only below the stone line — the first real reason to dig deep (DESIGN §5.6)
- [ ] Underground finds: buried cellars/ruins with loot, clay, a water table
- [ ] Wall/floor/door tiers with HP per DESIGN §5.3; zombies attack walls (slowly)
- [ ] Hammer repair
- [ ] Workbench: recipes gated by a nearby station (the palette already exists)
- [ ] Arrows as items: finite, dropped on miss, recovered from corpses
- [ ] Played: rebuild the house in stone

## Phase 5 — Pressure (DESIGN §8.6, §8.2 hearing)

- [ ] Zombie population + off-screen respawn toward the player over days
- [ ] Hearing: radius flood from combat/breaking; sealed ≠ silent
- [ ] Horde events at night
- [ ] Played: a base that held on day 2 fails on day 5 without upgrades

## Phase 6 — World generation (DESIGN §5.6)

- [ ] Terrain line + stone depth + structure placement (house, barn, ruin, well)
- [ ] Loot in structures
- [ ] Spawn points away from the player start
- [ ] Played: three fresh worlds feel different enough

## Phase 7 — Persistence (DESIGN §15)

- [ ] Serialize state; autosave on sleep and interval; world slots
- [ ] Title screen: new / continue

## Phase 8 — Polish

- [ ] Sprite pass (swap painters only)
- [ ] Audio pass
- [ ] Settings (keybinds, volume)
- [ ] Performance: vision cache, tile culling audit, entity tick radius

---

## Backlog (unscheduled, keep or kill later)

- Rope ladder you can pull up
- Zombies stacking to reach high shutters (see DESIGN §17)
- Crossbow, spear
- Skills by use
- Two-tile-tall player (decide before Phase 6)
- Fences (solid, not opaque) — first tile where the two predicates differ
- Cure

## Decisions log

- 2026-09-07 — Medieval setting, no guns. (DESIGN §3)
- 2026-09-07 — In-world buildings, no scene transitions. Enclosure flood fill for vision.
- 2026-09-07 — Hitscan ranged with presentation-only projectiles.
- 2026-09-07 — Vanilla ES modules, no bundler, GitHub Pages.
- 2026-09-07 — One-tile-tall tunnels; player stays 36 px tall.
- 2026-09-07 — Trees have no collision and don't block sight; stone does both. "Building a stone mountain sounds fun; a tree that blocks you does not."
- 2026-09-07 — Left click = use what you hold (weapon or tool). Right click = interact / build / craft menu. Never an attack.
- 2026-09-07 — Stone yields per hit until the block is gone; trees are 1:1 per trunk tile.
- 2026-09-07 — Building is a mode, not a list: palette → ghost → stamp. Esc leaves it. Nothing else works while it's on.
- 2026-09-07 — Underground bases are legitimate; the counterweight is that nothing renewable exists down there, plus needs.
- 2026-09-07 — Everything is an item (Phase 2b). The Build… palette was a shortcut that fused crafting and placing; that fusion means placeables can't be loot, can't take inventory space, and can't be picked back up. Minecraft model instead: craft → inventory → hotbar → place. Ghost preview stays as the placement UI.
- 2026-09-07 — Taking a thing down (harvest) returns the thing; losing it (zombie breaks it) returns nothing.
- 2026-09-07 — Wood yield in 2D: log → 4 planks at the crafting step, not per-hit trunks. Trunks stay 1 block = 1 log so bark blocks are real, placeable, and cost a full log.
- 2026-09-07 — Combat numbers are **tuned**, not placeholders: two zombies in a room cost half your HP while playing carefully. `SWORD.*`, `ZOMBIE.HP`, `ZOMBIE.CONTACT_DMG` change only with a reason. Pressure systems (night, hordes, needs) stack on top of this baseline; don't re-tune the baseline to compensate for them.
