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

## Phase 2 — Depth: digging and placing (DESIGN §5.5)

- [ ] World 200×48: surface ~row 12, stone below ~row 30, bedrock row 47
- [ ] Vertical camera actually scrolling; clouds/sky parallax fixed to camera
- [ ] `air` tiles with `back` (backwall) — dark earth when dug, plaster inside structures
- [ ] Items: `items.js` with tool/placeable definitions; inventory counts (no UI yet)
- [ ] Hotbar slot 3 = shovel: left-click digs dirt/grass in reach (HP + cracks); drop to inventory
- [ ] Hotbar slot 4 = placeable dirt; right-click places if in reach, air, and no body overlaps
- [ ] Ladder placement (slot 5)
- [ ] Bedrock indestructible; world edge walls
- [ ] Zombies fall into pits and cannot climb out of 2+ deep holes (verify, tune)
- [ ] Menu items for tiles you can dig/place (so right-click stays the discoverable path)
- [ ] Played: dig a basement under the house, cap it with a hatch, confirm sealed

## Phase 3 — Needs and time (DESIGN §7.4, §12)

- [ ] Day/night: 10-minute day, sky colour ramp, ambient overlay ramp, day counter in HUD
- [ ] Hunger / thirst / fatigue meters; drain rates; low-meter penalties; HP drain at zero
- [ ] Food items and a water source (well tile); eat/drink via hotbar or context menu
- [ ] Bed tile: sleep to dawn, only when sealed, interrupted by breach
- [ ] Night zombie modifiers (speed, sight)
- [ ] Played: survive three nights

## Phase 4 — Building tiers and crafting (DESIGN §11)

- [ ] Materials: timber (trees, axe), stone (pick), iron (ore + forge)
- [ ] Wall/floor/door tiers with HP per DESIGN §5.3; zombies attack walls (slowly)
- [ ] Hammer repair
- [ ] Workbench + recipes as data; DOM crafting panel
- [ ] Inventory panel (DOM), drag to hotbar
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
