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
- [ ] Drag inventory items onto the hotbar; hotbar slots become inventory slots
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
