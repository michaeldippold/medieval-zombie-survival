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
- [x] Scrambling: a chasing zombie blocked by a 2-tile obstacle climbs it slowly (5s, visible clawing shake), landing on top aligned with the obstacle's column; 3+ is impossible and just holds. `ZOMBIE.SCRAMBLE_MAX` / `SCRAMBLE_TIME` in config.
- [x] Playtest fix: the 5s scramble wasn't visibly climbing — position never changed until it
      snapped to the landing spot at the end, reading as "stuck, then teleports." `y` now eases
      from the grab point to the landing spot every frame; `x` still snaps only at the very end
      (DESIGN §8.4b). Verified in node: `y` changes smoothly frame to frame during a climb.
- [x] Playtest fix: natural stone mounds had a 3-tall centre column, which is un-scrambleable —
      a zombie beelining into one got permanently stuck, and others queued up behind it, for
      free (the player didn't build that wall). Mounds are now a uniform 2 tall everywhere, so
      they're always the "hill" case. Verified: generated map's tallest surface stone stack is 2.
- [x] Playtest fix (real exploit): 3 stacked **placed** dirt blocks were a free, permanent,
      un-attackable, un-scrambleable fortress wall — no crafting, no recipe, better than any
      structure. Placed dirt now gets finite hp (`TILE_DEFS.dirt.placedHp`, applied by
      `applyPlacedHp()`) and is zombie-attackable via its own instance hp; natural/dug dirt is
      untouched and still permanently safe. See DESIGN §5.3's "attackability is a second axis"
      note. Verified both directions in node: natural 3-tall dirt never breaks, placed 3-tall
      dirt does.
- [x] Zombies attack timber/stone walls: `canZombieDamage(t)` is true for any tile with finite hp (or a portal) — earth/stone/trees stay Infinity, so this fell out of the existing hp field with no new flag. A broken wall/floor turns to air (no drop; that's zombie loss, not player harvest).
- [x] Fixed a landing bug where scrambling only changed Y, leaving the zombie floating one column short of the obstacle with nothing to stand on — it would fall right back down and restart the climb forever. Landing now also snaps X into the obstacle's column.
- [ ] Played: fell trees, build a hut with a door, seal it, survive; dig a basement, cap it, confirm sealed

## Phase 2b — Everything is an item (DESIGN §7.3, §5.5)

Replace "Build… palette crafts-and-places in one step" with the Minecraft model: placeables are
items, the hotbar holds items, placing is using the selected item. The ghost preview stays; it
is the placement UI regardless of where the item came from. Mostly deletion. Do in this order —
each step leaves the game playable.

1. [x] **Hotbar = inventory slots 0–4.** The bar renders `inventory.slots[0..HOTBAR_SIZE-1]`
       directly — no separate array. Number keys select a slot; `state.held` is that slot
       index, and `heldId(inventory, held)` resolves it to an item id wherever code needs one
       (combat.js, tools.js, placement.js, hud.js, renderer.js). `createStartInventory()` seeds
       sword/bow/shovel/axe/pick into slots 0–4 and 10 arrows into slot 5.
2. [x] **Drag between inventory and hotbar.** The inventory window shows all 20 slots; the
       first `HOTBAR_SIZE` get an accent border + `.inv-slot--hotbar` (styling only — `swap()`
       already worked on any two slots).
3. [x] **Placeable items.** Each placeable in `ITEMS` carries its own `make(insideDir)`
       (dirt, leaf, wall, floor, wall_stone, ladder, door, shutter, hatch). `placement.js`
       (replacing `build.js`) shows the ghost whenever the selected slot's item `kind ===
       'placeable'`; left click stamps one and takes 1 from that stack. No mode flag — picking
       another slot is simply not holding a placeable anymore, so nothing to explicitly leave.
4. [x] **Craft, not Build.** `BUILDS` and the Build… menu entry are gone. `CRAFTS` has all 8
       structures plus arrows, exactly the costs planned. Crafted output still prefers a free
       hotbar slot (an artifact of `give()` scanning low indices first, not new logic).
5. [x] **Dismantle drops the thing.** Every structure's `harvest.drop` in `TILE_DEFS` now
       names its own item id instead of a raw material (`wall` harvest → `wall`, not `wood`).
       Zombie-caused breaks still go through `airAfter` with no drop — already true before this
       phase, just now obviously correct since the two paths clearly diverge.
6. [x] **Tools are items too.** Sword/bow/shovel/axe/pick are ordinary stacks in ordinary
       slots; using one never calls `take()` on itself (only bow's ammo is consumed).
7. [x] `build.js` deleted; `placement.js` keeps `canPlaceAt` and the ghost logic. Legend,
       DESIGN §5.5/§7.3, and this file updated.
8. [x] Played (scripted, live game): crafted a wall from wood, dragged it onto the hotbar,
       placed it (ghost correct, tile appears, stack empties), dismantled it with the axe
       (4 hits, matching `harvest.hits`), picked the dropped `wall` item back up, placed it
       again. Separately confirmed a zombie-style break (`damageTile` → `airAfter`) drops
       nothing, and that sword/bow still fire correctly with slot-resolved `held`.

### 2b-trees — trunks are blocks, logs → planks
- [x] Trunk tile fills the whole 40px block (bark texture edge to edge) — a shared `paintBark`
      helper draws both the natural trunk and the placed log block identically
- [x] Trunk drops a **log** item (`ITEMS.log`, kind `placeable`). Originally given its own
      solid/attackable `log` tile kind so it could double as a wall — reverted after playtest
      (2026-09-08): a felled tree placed back down turned into a free, indestructible-looking
      wall, contradicting "trees don't block." `ITEMS.log.make()` now just builds a `trunk`
      tile — decoration, identical rules whether grown or placed, never a wall. See the
      solidity-tiers ruling in DESIGN §5.3.
- [x] Craft: 1 log → 4 **planks** (`CRAFTS.planks`). Every structure recipe now costs `plank`
      instead of a raw `wood` item (which no longer exists); arrows cost 1 plank → 4. Verified
      the whole chain — fell → log → craft planks → craft wall → place → dismantle → get the
      `wall` item back — in isolated node tests (deterministic; see workflow note below).
- [x] Some trees spawn 2-wide (`WORLDGEN.WIDE_TREE_CHANCE = 0.3`): both trunk columns filled,
      leaf blob widened to match, still routed around other trees/mounds/the house
- [x] Tree counts/heights left as-is — the 4× log→plank multiplier alone gets a starter hut
      comfortably under one tree's worth of wood; retuning tree count wasn't needed
- Backlog: saplings / regrowth, if wood ever runs dry on a long run

## Phase 2c — Extensibility: make the three vectors cheap

The game grows along three vectors — blocks, crafts, entities — plus systems. This phase makes
the first three data-driven enough that a rule-free addition is one row, and a rule-ful one is
one row plus one predicate. Do after 2b (crafting redo) so the item model is settled.

### Blocks (one row for a plain block, row + painter for a distinctive one)
- [x] Default painter from the def (`color`, `cap`, `edge`); dedicated painters only for looks
- [x] Load-time validation (`src/validate.js`, called once from `main.js`): every non-air kind
      has `color` or a painter (`render/tiles.js` exports `hasPainter` for this), every
      `harvest.drop` is a known item, portals have `name` and `barFrom`, every placeable item
      has a `make()`, every recipe's `cost`/`gives` ids exist. Collects *all* problems into one
      thrown message rather than stopping at the first. Verified it both passes clean on the
      real content and correctly reports 4/4 injected problems (bad drop id, undrawable tile,
      unknown recipe cost/gives ids) in a throwaway node run.
- [x] `contact` hook: `TILE_DEFS[kind].contact = { dmg, cooldown }`, read by
      `contactDamage(tile)` (world/tiles.js) and checked once in `updatePlayer` (sampled at the
      feet, own cooldown, no infection roll — it's not a bite). Proved with a `spikes` tile
      (non-solid, so you sink onto whatever's below and take repeat damage) — not placed by the
      generator yet, just available. Zombie-side hazard interaction (walking zombies into a
      spike trap) would reuse the same `contactDamage()` call from `updateZombies`; not wired in
      this pass, noted here rather than silently skipped.
- [x] Placeables derived directly from items: a placeable's own `make(insideDir)` on `ITEMS[id]`
      *is* the tile constructor (no separate `places` field/lookup table needed — simpler than
      planned, same effect)
- [ ] `docs/ADDING.md`: the three checklists (block / craft / entity), each a numbered list of
      files touched, with a worked example. Keep it to one page.

### Crafts (one row per recipe)
- [x] Recipe validation at boot (part of `validate.js` above)
- [ ] Optional `station` on a recipe; the Craft palette filters by stations within reach.
      No station = craftable anywhere (arrows). Workbench is the first station (Phase 4).
- [x] Recipe icon defaults to its `gives` item's icon (`paintCraftIcon` in interactions.js —
      tile via `paintTile` if the item is placeable, else `paintItemIcon`)

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

### Art direction (decided 2026-09-07): MiniFolks-style 16px characters at 2×
Candidate: the MiniFolks packs (Humans → knight, Undead → zombies, Villagers → NPCs, animals).
16×16 art on a 32×32 canvas, idle/walk/jump/death, free licence, ~$30 for the lot.

- [ ] **Tile size 40 → 32 first**, before any art: `TILE`, `VIEW` (e.g. 800×480 = 25×15 tiles),
      player 20×28, zombie 24×24, px-based speeds/reach ×0.8, `image-rendering: pixelated`,
      integer CSS scaling. Own commit; re-play once. Pixel art must scale by integers, and 16px
      tiles at 2× = 32 matches the character density exactly.
- [ ] Confirm an *unarmed* knight sprite exists (weapons are baked into most poses). Plan: unarmed
      body + the existing aim-at-mouse weapon overlay, so free aim survives the art pass.
- [ ] 16px block tileset — **draw it ourselves.** Searched 2026-09-07: no off-the-shelf side-view
      *block* tilesets exist; "side-scroller" packs are platformer scenery with front-facing
      façades that make no sense in a world you cut through. ~15 tiles (dirt, grass, stone,
      planks, bark, leaves, door, shutter, trapdoor, ladder, stone wall, bedrock, backwalls).
      Replace painters one at a time; the default painter stays as the fallback. Art is parked
      until systems are done; flat colour is a feature while bugs are still being found.
- [ ] Sprite sheet loader + animation state per entity (idle / walk / jump / death), flip by facing
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
- 2026-09-07 — Wood yield in 2D: log → 4 planks at the crafting step, not per-hit trunks. Trunks stay 1 block = 1 log so bark blocks are real, placeable, and cost a full log. *(Superseded 2026-09-08: a placed log block is decoration, not a solid wall — see the next entry and DESIGN §5.3.)*
- 2026-09-08 — Solidity is fixed per tile kind by what the kind is for (terrain / decoration / structure), never by natural-vs-placed origin. A placed log stays decoration (non-solid) exactly like a growing tree; only crafted `wall`/`wall_stone`/etc. are ever a barrier. Triggered by a playtest report: felling a tree and placing the bark blocks back turned it into a free wall.
- 2026-09-08 — Natural terrain features must never create an un-scrambleable (3+ tall), un-attackable chokepoint the player didn't build — that's free protection from map geometry. Stone mounds capped at a uniform 2 tall for this reason; scrambling itself was fixed to visibly climb (interpolated y) instead of stalling then teleporting.
- 2026-09-08 — Closed a real exploit: dirt is the one terrain material placeable with no crafting step, terrain is always solid, and 3+ tall is un-scrambleable — so 3 stacked dirt blocks were a free, permanent, un-attackable fortress, stronger than any crafted wall. Fix: a *placed* dirt tile gets finite hp (`placedHp: 40` in TILE_DEFS, applied by `applyPlacedHp()` in placement.js) and becomes zombie-attackable via the instance's own hp (`canZombieDamage` now checks `t.hp`, not the kind's default `d.hp`) — natural/dug dirt is untouched and stays permanently safe (pit walls, underground bases). This is a second axis (attackability) layered on top of the fixed solidity tiers, not a reopening of that ruling — solid/opaque still never depends on origin; only "can a zombie eventually break it" does, and only for the one terrain item with no recipe gate. Verified in node: natural 3-tall dirt holds forever, placed 3-tall dirt gets broken through.
- 2026-09-08 — Zombie wall-damage needed no new flag: `canZombieDamage(t)` is just "finite hp or a portal" — the same `hp: Infinity` that already marks earth/stone/trees as un-diggable also marks them as un-attackable by zombies.
- 2026-09-08 — Phase 2b (everything is an item) shipped. `state.held` changed meaning from an
  item id string to a hotbar slot index — every read site now resolves it via `heldId()`. Watch
  for this if old code or notes mention `state.held === 'sword'`; that pattern is stale.
- 2026-09-08 — Test-methodology notes for future live-game scripting in the browser console
  (both burned real time chasing a "bug" that was actually the test):
  1. Never call `game.update(dt)` with `dt` larger than 1/30 — the real loop clamps to that, and
     a bigger step (e.g. to "fast-forward" a cooldown) can tunnel a body through the ground,
     since it's a discrete per-frame move-then-resolve, not a continuous simulation. Advance
     many small steps instead of a few large ones.
  2. `main.js`'s own `requestAnimationFrame` loop keeps calling `game.update(realDt)` in the
     background the whole time the page is open — it does not pause just because a script is
     driving `game.update` manually too. Real time between separate tool calls (network
     round-trips, an `await import(...)`) is real elapsed time for that loop, so player
     position, zombie state, anything time-based can have drifted between one script and the
     next. Do a whole scripted interaction — position setup through the final assertion — in
     one atomic script with no unnecessary awaits in the middle, and re-establish any state
     (stun zombies, reset position) at the top of that script rather than trusting it survived
     from a previous call. When a live-game script's result looks impossible, prefer a
     deterministic pure-Node repro (construct a `World`/inventory directly, no DOM, no time) —
     it's faster to trust and immune to both of these.
- 2026-09-08 — Dev workflow gotcha: the plain `python -m http.server` sends no cache headers, so the browser can silently keep serving stale JS modules across reloads while editing — cost real debugging time chasing a "bug" that was actually stale code. Fixed with `devserver.mjs` (sends `Cache-Control: no-store`); `.claude/launch.json` now uses it. If a change still doesn't seem to take effect after that, the browser's *disk* cache can still hold entries from before the switch — bump the dev port to get a clean origin rather than chasing it further.
- 2026-09-07 — Combat numbers are **tuned**, not placeholders: two zombies in a room cost half your HP while playing carefully. `SWORD.*`, `ZOMBIE.HP`, `ZOMBIE.CONTACT_DMG` change only with a reason. Pressure systems (night, hordes, needs) stack on top of this baseline; don't re-tune the baseline to compensate for them.
