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
      No station = craftable anywhere (arrows). Workbench is the first station (Phase 8).
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

---

# Road to 1.0 (decided 2026-09-08 — DESIGN §1.1, §16.1)

Phases 3–15 below replace the old Phases 3–8. They are ordered by *dependency*, not by how
exciting they are: the architecture pieces first (scale, background layer, stateful tiles, the
entity split already listed in 2c), each proved by one small feature, then content on top.
Each phase ends with a play session and a commit; nothing in a later phase may need plumbing
an earlier one didn't build. Rule from Phase 9 on: **the save stays green** — every phase
that adds state adds it to `save.js` in the same commit.

The **editor** (Phase 4) is a parallel track: it lets art and prefabs get made while systems
are built, and it's in this repo so nothing has to be copied by hand.

## Quick items (any time, no phase)

- [x] **Hold-to-use** (2026-09-08): `input.mouse.down` tracks the left button (released on the
      window, so dragging off the canvas lets go); tools repeat on their cooldown while held,
      placement paints a line (the "why not" hint fires only on the click, not every frame of
      a stroke). Weapons still read only the per-click edge. Verified by Michael in play.

## Phase 3 — Scale: two-tall bodies (DESIGN §5.1, §6.1) ✅ 2026-09-08 (core landed; see open items)

Reverses the one-tall ruling. Done first, before any prefab or art exists, while the house was
still one function.

- [x] `TILE` 40 → 32; `VIEW` 960×560 → 1280×720; page column and canvas aspect-ratio widened
      to match. Scaling stayed CSS `width:100%`/`aspect-ratio` (fluid), not integer-only —
      that was already how the 40px canvas scaled, unchanged here, just bigger
- [x] Player 24×60, zombie 26×60; every px-based tunable (speeds, reach, sight, jump velocity,
      gravity) ×0.8, which — verified algebraically, not just by feel — keeps jump height and
      run speed identical in *tile* terms to before. Placeholder box art's helmet/visor/brow/
      eye positions now scale as fractions of body size instead of fixed pixels, so the face
      doesn't end up stranded near the top of a much taller box
- [x] `tryClimb` (`physics.js`) generalised: computes how many rows the body's own height
      needs above a one-tile step and requires all of them clear, not just one fixed row
- [x] Anchor/part multi-cell mechanism — landed as functions in `world/tiles.js`
      (`stampMulti`, `footprintCells`) rather than a separate `world/multi.js`; every
      predicate (`isSolid`, `isPortal`, `damageTile`, `harvestTile`, ...) redirects a `part`
      to its anchor by one level of recursion, no world lookup needed. `placement.js`
      (footprint-aware `canPlaceAt`/ghost) and `tools.js` (footprint-clearing removal) both
      use it; `interactions.js` resolves a part to its anchor once, up front, before any
      direct field mutation (a redirect-on-read wasn't enough there — see its comment)
- [x] Doors and shutters are 2 tall via anchor/part. *(Shutters were then removed outright —
      see Phase 3b. The 2-tall mechanism stays for doors.)*
- [x] House rebuilt: interior 9 rows (was 7) — 4 ground floor, 1 loft floor, 4 loft — door on
      the front wall, a matching ground window opposite it, a window per wall in the loft
- [x] Wall/floor recipes give 2 per plank instead of 1
- [x] Verified in Node (deterministic, no DOM): 22 checks covering the full anchor/part
      lifecycle — worldgen and player placement, `isSolid`/`isPortal`/`portalName` redirects,
      shared-state mutation through either cell, a two-tall body correctly admitted by an
      open 2-tall door and blocked by a closed one, and full dismantle clearing both cells.
      Confirmed live in-browser too: sampled rendered pixels at both the door's anchor and
      part cells (frame/leaf colours present, not a flat fill) and at both cells on open
      (both flip to the same "opening" colour), then walked the real input/update loop
      through the open door and up the loft ladder with no console errors
- [x] **Real playtesting** (2026-09-08, Michael, extended session). Confirmed: the 28×60
      two-tall proportions read right and no longer "cigarette"-shaped; a one-wide vertical
      shaft (a dug shaft, the hatch column) feels correct to drop down, not cramped; the game
      is fun as built. Verdict: proceed with more features, not more scale changes
- [-] ~~The 1-tall window variant (sight, not entry)~~ — superseded: it falls out of glass
      blocks for free (a broken 1-tall pane is a hole nothing fits through). Phase 3b
- [ ] **Not done — cave tunnel height.** Existing `WORLDGEN.CAVES` radii (`ry` 1–2, so 3–5
      rows) weren't changed or specifically re-checked against the new body height; likely
      fine (§ analysis says so) but not played
- [ ] `docs/ADDING.md` still doesn't exist (carried over from 2c, not new here)

## Phase 3b — Body width, glass, curtains (DESIGN §6.1, §5.4b, §11)

Two follow-ups from playing the scale change: bodies looked like cigarettes, and a shutter
turned out to be a door with different art.

- [ ] Bodies 24/26 → **28** wide (both). One-wide shafts stay, so 28 is the ceiling. Verify
      by dropping through the house hatch and a dug 1-wide shaft; re-run the Phase 3 checks
- [ ] **Delete the shutter**: tile def, item, recipe, painter, `climbThrough` flag, the house's
      three shutters, the under-canvas help text, the editor's seed asset
- [ ] `isOpaque` stops aliasing `isSolid`: reads `def.opaque ?? def.solid`, then per-tile
      state (`t.curtain === 'closed'`). Vision is otherwise untouched
- [ ] `glass` tile: `solid: true, opaque: false`, hp 40, `harvest: pick ×1`, drops `glass` —
      or `glass_curtained` if it carries a curtain. Placeable item `glass`; painter (pale,
      see-through-looking, with a visible pane edge). Not craftable until the furnace (Phase 8):
      found in the house prefab only, for now
- [ ] `curtain` item (2 plank): right-click glass with it held → consumed, `t.curtain =
      'closed'`. Right-click curtained glass → Open/Close, toggling every curtained glass
      block touching it vertically. `glass_curtained` placeable item (places glass with
      `curtain: 'open'`). Painter draws the curtain over the pane when closed
- [ ] Bars cost a plank and are spent on dismantle (DESIGN §5.4)
- [ ] House prefab: the ground-floor window opposite the door becomes 2-tall glass; one loft
      window 2-tall glass, the other **1-tall at head height** so height-is-risk is visible
      on day one; curtains on the ground-floor one so the house can still be sealed
- [ ] Node checks: sight passes through glass and stops at a closed curtain; a body is blocked
      by glass; a broken 1-tall pane doesn't admit a body, a broken 2-tall one does; curtained
      glass drops one `glass_curtained`
- [ ] Editor seeds: remove `shutter`; add `glass`, `glass_curtained`, `curtain`
- [ ] Played: seal the house by closing curtains; watch a zombie come through the window

## Phase 4 — Editor and asset pipeline (DESIGN §16) — parallel track ✅ 2026-09-08

- [x] `tools/editor/` built fresh (standalone-runnable: `index.html` works via `file://` for
      drawing; only **Save to game** needs the server). The old `zombie-tile-editor` had no
      commits and no drawn art to carry over, so there was nothing to migrate automatically —
      instead, an **Import legacy tileset** button reads that tool's project-JSON export
      format for the one-time case Michael has actual work there
- [x] Assets of any `w×h` tiles at 16 px: `{ id, label, category, w, h, pixels }`; canvas is
      `w*16 × h*16`; fine gridlines per pixel, heavier lines at 16px cell boundaries
- [x] Categories: block / background / furniture / character; create (any w/h up to 6×6),
      rename, duplicate, delete; sidebar filterable by category
- [x] Proportion preview: the asset at 2× beside a 1×2 mannequin over a sample background
      wall, redrawn live while you draw
- [x] `devserver.mjs` gains `POST /assets`, simpler than first sketched: the whole library is
      written as one `assets/manifest.json` (`{ id: { label, category, w, h, pixels } }`),
      overwritten wholesale on every save — one editor tab, no partial-merge bugs, and no PNG
      encoder needed since the game builds its sprite from the same pixel array (see below).
      PNG stays a client-side download for reference/backup, not the game's source of truth
- [x] Game: `src/render/assets.js` fetches the manifest once at boot and builds an offscreen
      canvas per asset; `paintTile` (`src/render/tiles.js`) draws that sprite when one exists
      for a kind and falls through to the flat painter otherwise. Multi-cell anchors will draw
      their `w×h` sprite the same way once anchor/part exists (Phase 3) — not wired yet since
      there's nothing multi-cell in the world grid to attach it to
- [x] Played: drew on a 2×1 bed canvas in the editor (confirmed the wide-canvas layout, fixed
      a grid blowout bug where a multi-tile canvas pushed the side panel off-screen), saved to
      the game, reloaded, confirmed `assets/manifest.json` loads with no console errors and
      the untouched dirt tile still renders identically via its flat-painter fallback — the
      pipeline is proven; the removed test scribble was not committed. Real art is Michael's
      to draw next
- Later in the same tool: character animation frames (idle / walk / jump / death)

## Phase 5 — The background layer (DESIGN §5.7)

The Terraria loop: seal → wall → mount → light. Foundation for torches, decor, house styling.
Two grids, one thing of each per cell — no mount grid.

- [ ] `world.back[r][c]` as a real grid; `back` field on foreground tiles removed. Pure
      migration commit — maps.js, airAfter, renderer, isUnderground — **zero behaviour
      change**, verified by playing the same seed before/after
- [ ] Background wall defs: `bg_earth`, `bg_plaster`, `bg_plank`, `bg_stone` as tile rows with
      their own painter slot (`bg_window` dropped — glass is the window, Phase 3b)
- [ ] Items `layer: 'back'`; placement.js routes them; `canPlaceAt` for back walls
      (foreground air/decoration). Same ghost + stamp
- [ ] Foreground placement rules `needsWall` (torch, painting) and `needsFloor` (furniture)
- [ ] Harvest on a cell: foreground thing first, then the wall; each drops itself
- [ ] Recipes: plank → 2 `bg_plank`, stone → 2 `bg_stone`, (clay later) → `bg_plaster`
- [ ] First wall-hung decoration: `torch` (light def only; not lit until Phase 7),
      `painting` (2 variants, one of them 2×2 via anchor/part)
- [ ] Validation: every `layer:'back'` item makes a back-layer kind; `needsWall` kinds are
      non-solid decoration
- [ ] Played: re-wall the house interior in plank, hang a painting, take it all down again

## Phase 6 — Creative mode and prefabs (DESIGN §11.1, §5.6)

Early on purpose: testing without dying, and buildings get made while systems are built.

- [ ] `state.creative`: no zombies, infinite stock, instant harvest, needs off, noclip key;
      entered by URL flag for now (title menu later); world labelled, no day score
- [ ] Creative-only placeables: `ground` (hatched solid; "this biome's terrain goes here"),
      zombie-spawn marker, player-start marker — ghost tiles, never exist in survival
- [ ] **Export prefab…**: drag a rectangle; walks both grids; auto-legend; keeps state that
      matters (insideDir, open, chest contents), drops damage; multi-cell as anchor only;
      `ground` cells → per-column `ground` line; markers → `markers`; downloads JSON
- [ ] **Stamp…**: drop a saved prefab at the cursor (ground line filled with the current
      terrain, building verbatim, dug air preserved) — the same function worldgen will use
- [ ] The current hand-coded house rebuilt in creative and exported as `prefabs/house.json`;
      `maps.js` stamps it instead of drawing it
- [ ] Played: build a hut with a cellar, export it, stamp it on the other side of the map

## Phase 7 — Time and light (DESIGN §12, §12.1)

The day counter is the score. Torches get their reason to exist.

- [ ] `systems/time.js`: `state.time = { t, day }`, 10-minute day, dawn start; HUD day
      counter + sun/moon arc
- [ ] Sky colour ramp + ambient overlay alpha ramp through dawn/day/dusk/night
- [ ] `world.lights` set (maintained by `world.set` from `def.light`) and `systems/light.js`:
      bounded flood from each emitter through non-opaque cells, radius ~6, recomputed on
      world version change only; composited against the ambient overlay. Underground = night
- [ ] Torch crafts and emits; fireplace/furnace emit while burning (once Phase 8 exists)
- [ ] Night zombie modifiers (speed ×1.2, sight +50%) — read `time`, in `ZOMBIE.NIGHT`
- [ ] Death screen v1: leads with days survived (DESIGN §14)
- [ ] Played: survive three nights; the house at night with and without torches

## Phase 8 — Stateful tiles and furniture (DESIGN §5.8)

Tiles that own things and tick. Furniture is decoration-tier: walk-through, never a wall.

- [ ] `world.tickers` set + `systems/tiles.js` `updateTiles`; a def with `tick(state,t,dt)`
      joins on set
- [ ] `chest`: `t.inv`; `ui/containerPanel.js` — the inventory window with a second grid,
      drag between grids (reuse the existing drag/swap; two sources); break → spill drops
- [ ] Context-menu verbs on furniture: Open / Sleep / Cook… / Drink — data on the def
      (`actions: ['open']`), not new code paths
- [ ] `bed`: Sleep to dawn when sealed and night; interrupted by breach; restores fatigue
      (fatigue itself lands in Phase 10 — sleeping just skips time until then)
- [ ] `workbench`: recipe `station` gating (finish the 2c item); Craft palette lists
      stations in reach
- [ ] `fireplace` and `furnace`: `{input, fuel, output}` inv + `progress` tick + their own
      process tables (raw meat → cooked; iron ore → ingot). Furnace UI = container panel
      with three fixed slots
- [ ] `well`: Drink (infinite); `table`, `chair`, `bookshelf`, `barrel` as plain decor rows
- [ ] `bed` 2×1 and `fireplace` 2×3 via anchor/part (built in Phase 3; furniture just uses it)
- [ ] Played: furnish the house; store the loot; sleep through a night

## Phase 9 — Save/load, minimal (DESIGN §15)

Built here, early, so every later phase keeps it green instead of retrofitting.

- [ ] `World.toJSON/fromJSON`: RLE rows of kind ids + sparse non-default tiles (both grids);
      `inv` on tiles deep-copied
- [ ] `save.js`: one slot in localStorage, F5-safe; F6 save / F7 load as the only UI for now;
      version stamp; refuse older versions clearly
- [ ] Entities save by registry `kind` + listed fields; transient AI dropped
- [ ] Autosave on sleep
- [ ] Played: save mid-siege, reload, the siege continues

## Phase 10 — Entities, needs and food (DESIGN §7.4, 2c-entities)

- [ ] **2c-entities first** (body split, registry, collision table, spawn table, chicken) —
      this is the third architecture piece; it lives under 2c above and is a prerequisite here
- [ ] Animals: chicken (meat), pig (more meat, slower), deer (flees fast, meadow only).
      Respawn off-screen per biome so the long game isn't starvation
- [ ] `food`/`drink` item kind: left click consumes; scavenged food in loot tables (bread,
      dried meat); raw/cooked meat from animals + fireplace
- [ ] `systems/needs.js`: hunger / thirst / fatigue meters, drain, penalties, HP drain at zero
- [ ] `ui/moodles.js`: status icon column — hungry / thirsty / tired / hurt / feverish, with
      severity steps; fever tint migrates here. No numeric meters on the HUD
- [ ] Played: survive five days without the loot chests

## Phase 11 — Tiers, durability and the shield (DESIGN §13, §7.6, §11)

- [ ] Start with nothing; `harvest.hand` on trunk/dirt/leaf; the starter kit becomes a loot
      entry in the first prefab's chest (`STARTER_LOADOUT` → debug flag)
- [ ] `tier` on tools/weapons; `harvest.tier` minimums (stone: any pick; iron ore: stone
      pick); `speed` multiplier; "needs a stone pickaxe" hint
- [ ] Wood → stone → iron tool and weapon rows + recipes + stations; iron ore below the stone
      line; smelt at the furnace
- [ ] **Spear** and **crossbow**: a second melee and a second ranged line, not reskins of the
      sword/bow (DESIGN §13) — promoted from backlog 2026-09-08 so "sword and bow" was never
      the entire weapon roster, only the starting one. Spear: longer `REACH`, narrower arc,
      different wind-up/recovery than the sword. Crossbow: slower `COOLDOWN` than the bow,
      more `DMG`, a load animation instead of instant-ready. Each tiers the same way (wood →
      stone → iron) once they exist, rather than being an iron-only unlock
- [ ] Durability: non-stacking tool/weapon/shield slots `{id, n:1, dur}`; `give()` never
      merges them; wear per use; break with a hint; wear bar under the icon. **Own commit**
- [ ] Offhand slot beside the hotbar; `shield` item: passive front block, no infection roll,
      zombie stagger, durability; wood and iron shields
- [ ] Hammer repair at the workbench
- [ ] Wall/floor/door tiers: stone already; iron-banded door/wall (2000 hp)
- [ ] Played: from nothing to an iron sword and a stone house

## Phase 12 — Pressure (DESIGN §8.6)

- [ ] `systems/pressure.js`: target population, spawn rate and night multipliers as
      functions of `time.day`; off-screen spawns never inside the player's enclosure
- [ ] More zombies on the map at start (biome spawn tables) — the current count is a
      tutorial density
- [ ] Horde events at night from day 3
- [ ] Hearing (optional for 1.0): radius flood from combat/breaking; sealed ≠ silent
- [ ] Played: a base that held on day 2 fails on day 5 without upgrades

## Phase 13 — World (DESIGN §5.6)

**Pause and talk before this phase**: biome selection, mountain heights, non-repetition
(layered noise vs hand-tuned features), world width, and what happens off-screen (tick
radius, spawn margin). Then:

- [ ] Seed → hash → RNG; `WORLDGEN.VERSION`; seed shown in HUD/pause/death
- [ ] Per-column surface line: hills; mountains 10–14 tall with ≤2-step faces; `ROWS`
      grows upward; camera Y range; fall damage (DESIGN §6)
- [ ] Vision cache keyed on (player tile, world version) — required now, not optional
- [ ] Entity tick radius + spawn margin; the far map frozen until you arrive
- [ ] Biomes as table rows — **meadow** and **mountain** first (neither has water); terrain-
      by-depth, tree density, mounds, height range, prefab pool, spawn table, palette.
      Biome = climate, no seasons; snow (cold moodle, fireplace answers it) and a water biome
      later. **Every biome fills all three columns — cost / how you pay it there / what you
      only get there — or it waits** (DESIGN §5.6 table). No day-trip biomes
- [ ] `prefab.js` worldgen stamping: edge-matched placement on the ground line (±1, two
      columns of smoothing outside), interior carved to the line, refusal when no site fits
- [ ] Ruin pass: knock out wall tiles, break doors, spill chests — same prefab, aged
- [ ] Prefab set built in creative: peasant hut, lumber mill, inn, well, a cellar or two
- [ ] Loot tables layered on literal chest contents
- [ ] Played: three seeds feel different; a friend's seed matches

## Phase 14 — Menus and the wrapper (DESIGN §14, §15)

- [ ] Title: Continue / New game (seed field, random) / Settings
- [ ] Pause: Resume / Save & quit to title; three save slots
- [ ] Death screen v2: days, cause, kills, placed, seed, New game / Title
- [ ] First-time hints (a dozen, one-shot per save, data)
- [ ] Autosave interval
- [ ] Played: a full session from title to death without touching the console

## Phase 15 — Polish

### Art direction (revised 2026-09-08): 16 px tiles at 2×, two-tall 16×32 characters
The MiniFolks plan (16×16 characters) is superseded by the two-tall ruling (DESIGN §6.1);
characters are 16×32, drawn in the editor or found in a pack that size. Free aim survives:
unarmed body + the existing aim-at-mouse weapon overlay.

- [-] ~~Tile size 40 → 32 first~~ — moved to Phase 3 (scale), which also changes the viewport
- [ ] 16 px block tileset — **draw it ourselves** in `tools/editor/` (Phase 4). Searched
      2026-09-07: no off-the-shelf side-view *block* tilesets exist. Replace painters one at a
      time via the manifest; the flat painter stays as the fallback, so art lands whenever it's
      ready rather than in one pass
- [ ] Character sprites 16×32 + animation state per entity (idle / walk / jump / death), flip
      by facing; sheet loader in `render/assets.js`
- [ ] Sprite pass (swap painters only)
- [ ] Audio pass
- [ ] Settings (keybinds, volume)
- [ ] Performance: vision cache, tile culling audit, entity tick radius

---

## Post-1.0 (explicitly out of 1.0 — DESIGN §1.1)

- Armour slots (head/body) — copies of the offhand pattern (DESIGN §7.6)
- NPCs and trade — needs right-click on *entities*, which nothing does yet
- Farming (seeds, growth over days) — the real long-game food answer
- Flowing water — Terraria-sized; the well covers thirst until then
- Skills by use; stamina
- Zombie variants (runner, brute); zombies smashing furniture in a breached room
- Saplings / tree regrowth (wood's long-game answer)
- Held torch in the offhand (a moving light)
- Cure
- Audio

## Backlog (unscheduled, keep or kill later)

- Rope ladder you can pull up
- Zombies stacking to reach high windows (see DESIGN §17)
- ~~Crossbow, spear~~ — promoted to Phase 11, 2026-09-08 (not a reskin of sword/bow — see there)
- ~~Two-tile-tall player~~ — decided 2026-09-08: **two tall**, Phase 3 (DESIGN §6.1, §17)
- Fences (solid, not opaque) — glass (§5.4b) beat this to being the first tile where the two
  predicates differ; fences would be the second
- Zombie-side spikes contact (reuse `contactDamage` in `updateZombies`)
- Waterskin (carried water)
- Found/improvised weapons in ruins (a pitchfork, a fire poker, a scythe) — medieval-flavored
  loot texture, raised 2026-09-08 weighing modern's "saucepan or crowbar" appeal; doesn't need
  a new system, just loot-table entries once loot tables exist (§5.6)
- Low-fantasy creatures/items (a goblin, a magic staff) — explicitly not ruled out by the
  setting (DESIGN §3), not scheduled

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
- 2026-09-08 — Game-breaking playtest bug: every player jump briefly sent nearby zombies toward the single nearest ladder in the *entire world*, then back once they landed — sometimes looping forever (climb, re-see the grounded player, drop, re-climb). Cause: the "is my target above me" check compared against the player's live y, which a jump moves by more than a tile. Fix: zombies now track `lastGroundedY`, updated only on a sighting where the player was actually `onGround`, and use that (not the raw live y) for the above/below decision — see DESIGN §8.3. Verified in node: distance-to-player never regresses across a simulated jump sequence and the zombie never enters climb mode, while a genuine stationary target on a loft is still correctly climbed to.
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
- 2026-09-08 — **Lighting is cosmetic only** (DESIGN §12.1). Day/night is an overlay ramp; torches subtract from it via a bounded flood; nothing about light ever feeds zombie senses. The enclosure model stays the one sight rule. Chosen because stealth-lighting would blur that rule, make torches a liability, and cost a flood per zombie. The reason to make torches is that a lit room reads as home — that's enough.
- 2026-09-08 — **1.0 defined** (DESIGN §1.1): a shareable seed, day/night with the day counter as the score, a furnished home, needs, start-with-nothing tiers, climbing pressure, save/load, vertical range. Out: armour, NPCs, farming, flowing water, skills, stamina, variants, cure, audio.
- 2026-09-08 — **Three architecture pieces before content** (DESIGN §16.1): the background layer (§5.7), stateful/ticking tiles (§5.8), and the entity registry (2c). Each is one focused commit proved by one feature (torch on plaster, an openable chest, a chicken). Everything else in 1.0 is rows in tables and `(state, dt)` functions.
- 2026-09-08 — **Furniture is decoration-tier**: non-solid, non-opaque, walk-through, never a barricade. A chest in a one-tile corridor must not be a wall. Zombies ignore it for 1.0.
- 2026-09-08 — **Save/load moves early** (Phase 9, right after stateful tiles) and is mandatory for 1.0. Cheaper to keep the state tree serializable as chests/furnaces/back layer arrive than to retrofit. Sets/Maps in state are caches, rebuilt on load.
- 2026-09-08 — ~~One-tile-tall player is final.~~ *Superseded the same day — see the two-tall entry below. The constraint (prefabs bake in heights) was right; it's why the decision had to be made now, not why it had to be "one".*
- 2026-09-08 — ~~Prefab JSON format is the contract with the painting tool~~ *Superseded: there is no painting tool. Prefabs are built in creative and exported; the JSON is the contract between the exporter and worldgen (DESIGN §5.6).*
- 2026-09-08 — **Durability makes tools non-stacking** (`{id, n:1, dur}`, `give()` never merges them). The one 1.0 change that touches the inventory model itself; lands in its own commit in Phase 11.
- 2026-09-08 — **Bodies are two tiles tall** (DESIGN §5.1, §6.1). "What is a tile relative to a person" and "can furniture be bigger than a block" are one question: a one-tall person makes the tile a person-unit and every object person-sized; a two-tall person makes a chest a chest, a bed 2×1, a fireplace 2×3, rooms with headroom, sprites with silhouettes. Costs accepted: 2-tall doors/shutters (anchor/part), 2-tall tunnels, generalised step-climb, the house rebuilt, tile 32 px and a 1280×720 viewport so the screen isn't seven player-heights tall, the MiniFolks 16×16 pack dropped. Reverses the earlier ruling, made before any prefab or art exists.
- 2026-09-08 — **Two grids, one thing of each per cell** (DESIGN §5.7). Background walls (incl. a fake `bg_window`) in `world.back`; everything else — furniture, torches, paintings — in the foreground with `needsWall` / `needsFloor` placement rules. The "mount" grid from the first draft is dropped. Transparent sprite pixels show the wall behind.
- 2026-09-08 — **Furniture is foreground decoration** (non-solid, walk-through, per-kind `solid` flag if something should be stood on) and stays fully interactive via `actions` on the def. Multi-cell things (door, bed, fireplace, big painting) are anchor + parts; built in Phase 3 because doors need it first.
- 2026-09-08 — **Prefabs are built in the game, in creative mode, and exported** (DESIGN §11.1, §5.6). No painting tool: build with real tiles, walk around in it, drag a rectangle, export. The `ground` creative block sculpts a per-column **ground line**; empty below the line becomes the *biome's* terrain, empty above becomes air, dug air is preserved, so a prefab never carries a material and a bare cellar is made of whatever ground it lands in. Placement matches the line only at the two edge columns, so hillside buildings only appear on matching slopes. **Stamp…** closes the loop. Triggered by: "creative kills zombies and makes stock infinite; build it, play in it, box it, drop it anywhere."
- 2026-09-08 — **The editor moves into this repo** (`tools/editor/`, served by `devserver.mjs`, `POST /assets` writes PNGs + manifest straight into `assets/`), becomes an asset library of any `w×h` tiles, and the game grows `render/assets.js` with flat-painter fallback so art lands one tile at a time. It is the only external tool.
- 2026-09-08 — **No seasons; biome is climate** (DESIGN §5.6). Meadow is always summer, snow always winter. The day counter is the only clock and pressure is what changes with it; seasons would multiply biome art by four. Gives a cold moodle the fireplace answers, and a real reason to defer water: meadow and mountain, the first two biomes, have none.
- 2026-09-08 — **A biome earns its place or it isn't added**: cost of being there / how you pay it *there* / what you can only get there. A biome that's a one-minute day trip before going home to the plains isn't worth its art. Snow's answer: snow blocks and igloos, furs → a cloak, and zombies sluggish in the cold. (DESIGN §5.6 table)
- 2026-09-08 — **World size**: hundreds of columns, walkable in a few in-game days, not Terraria-scale. Flat array, no chunking; simulation (tick radius, spawn margin) is what scales with width. Worldgen v2 gets a design conversation before code (TODO Phase 13).
- 2026-09-08 — **Shutters deleted; windows are glass blocks** (DESIGN §3, §5.4b). A shutter was a door with different art — same portal state machine, same bars, same 2-tall footprint — and two mechanically identical things is what "systems over content" forbids. Glass is `solid: true, opaque: false`, the first tile where the two predicates split: sight through, bodies not, weak, attackable, gone when broken. **Window height is risk**: a broken 2-tall pane is an entry, a broken 1-tall pane isn't — and nothing in the code knows the word "window". Not medieval; "more fun" wins the one place they conflict. Sand → glass is what a desert is for. Triggered by looking up how Terraria actually does it.
- 2026-09-08 — **A curtain is state on a glass block, not a tile** (DESIGN §5.4b, §11). A curtain *tile* has to be as tall as the window it covers, which made "how tall is a window" a rule. State on the glass needs no size: hold a curtain, right-click glass, it's curtained; toggle opens/closes the whole vertical run; closed = opaque = the house seals. **Attachments** (the general rule): an item consumed onto a block that *changes what the block is*, and the tell is the drop — **one item for the block as it now is** (`glass_curtained`), never the block plus the attachment, which would say "stacked" when the truth is "changed". Bars are spent, not attached: a plank each, gone when the door comes down.
- 2026-09-08 — **Bodies 28 wide, one-wide shafts stay** (DESIGN §6.1). The width question is really "do one-wide vertical shafts exist"; yes, so 28 is the ceiling (2px a side). 0.47 is Terraria's own collision-box ratio; their chunkiness is a few px of arm overdraw on real sprites. A 1.5× visual-only overdraw was tried and reverted uncommitted: it clips into every wall you stand against and makes visible hits miss. A flat box looks like a pole at any width; the ratio is for the art to be drawn into.
- 2026-09-08 — **Medieval setting reconfirmed** after weighing modern (fridges, cars, backpacks, improvised weapons). The game's differentiator (enclosure zombies exploit, compounding threat, no win condition) lives in the mechanic, not the setting, so this was safe to reconsider on its own merits. It came back to medieval because dig-anywhere/mine-tiers/climbable-mountains doesn't sit under a modern suburb (the honest modern version needed rural/small-town), most of the promised texture has a free medieval equivalent (wagon for car, root cellar for fridge, sack for backpack), and "no guns" stops being free the moment it's modern. See DESIGN §3.
- 2026-09-08 — **"Low fantasy" means real headroom, not a decorative label.** A goblin, a magic staff, a cursed blade are not ruled out by the setting later — the label already said this, it was just never spelled out. Not scheduling any of it now.
- 2026-09-08 — **Spear and crossbow promoted from backlog to Phase 11**, so sword+bow was never meant to be the entire weapon roster forever, only the starting one. Distinct lines (reach/arc for the spear, rate-of-fire/damage/load for the crossbow), not reskins, each tiering the same wood→stone→iron way.
- 2026-09-08 — **28×60 bodies and one-wide vertical shafts confirmed correct by an actual extended play session** (Michael) — closes Phase 3's playtest gap. Verdict: proceed with features, not more scale changes.
