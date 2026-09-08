# Medieval Zombie Survival — Design Document

*Working title. Browser side-scroller. Vanilla HTML/CSS/JS, no engine, no bundler.*

This document describes what the game is and how its systems work. It is the source of truth
for design decisions; `TODO.md` is the source of truth for what to build next. When code and this
document disagree, one of them is wrong — fix whichever is, and say which.

---

## 1. The pitch

A side-scrolling survival sandbox in a medieval world overrun by the walking dead. You scavenge,
build, and fortify; the dead notice, gather, and break in. There is no story to write and none
to read — the story is whatever happened to you on day four.

**The core loop**: go out → find things → get noticed → get back inside → hold → run out of
something → go out again.

**The one mechanic everything hangs on**: *enclosure*. You are either sealed or exposed. Sealed
means nothing can see you and you can see nothing. Exposed means you can see out and they can
see in. Every wall, door, shutter, bar and trapdoor exists to move that boolean, and every
zombie behaviour is a consequence of it.

### 1.1 What 1.0 is (decided 2026-09-08)

*Minecraft's world, Terraria's camera, Zomboid's stakes.* You get a seeded world you can share
by number, and you survive in it for as many days as you can. There is no win condition. **The
day counter is the score**, and the death screen leads with it — "You survived 11 days." Every
system below either makes a day harder to reach or gives you something to do with one.

1.0 means all of the following are true:

- **A world is a seed.** Type a number, get the same world as anyone else who typed it:
  terrain with real height, biomes, trees, caves, and prebuilt buildings stamped into it (§5.6).
- **Time passes and it shows.** Day/night with a day counter; night is dangerous; torches are
  something you make and place because the dark is real — cosmetically only; light never
  gates zombie senses (§12.1).
- **A home is furnished, not just walled.** Background walls you choose, torches and paintings
  on them, a chest that holds things, a bed you sleep in, a fireplace that cooks and a furnace
  that smelts (§5.7, §5.8).
- **You have needs.** Hunger, thirst, fatigue. Food from animals and scavenging, water from a
  well, sleep from a bed. Moodles say how you're doing (§7.4, §14).
- **You start with nothing.** Hands → wood → stone → iron tools and weapons; a shield;
  everything wears out (§7.6, §13).
- **Pressure climbs.** Zombies respawn and thicken with the day count; a base that held on
  day 2 fails on day 5 without upgrades (§8.6).
- **You can leave and come back.** Save/load, a title screen, continue (§15).
- **The world has vertical range.** Mountains you climb, sky the camera follows you into, a
  little fall damage (§5.6, §6).

Explicitly **not** in 1.0 (post-1.0 backlog): armour, NPCs and trade, farming, flowing water,
skills-by-use, stamina, zombie variants, a cure. Sound stays last.

## 2. Pillars

Decisions get checked against these. If a feature doesn't serve at least one, it doesn't go in.

1. **Enclosure is the game.** Inside/outside is a real, spatial, mutable state, not a scene
   transition. Buildings are made of the same tiles as the world. You can look out a window.
   They can look in.
2. **Threat compounds.** Being seen has a cost that grows: sightings call others, others break
   things, broken things let more in. Safety is something you *made* and can lose.
3. **Fights are decisions, not clicks.** Attacking has wind-up, recovery, and finite resources.
   Two zombies with spacing is a fight; three is a retreat.
4. **Every hit might be the one.** Damage is survivable; infection is not. The player is never
   told which hits infected them.
5. **Progress without prose.** Progression is tiers of material, tools, and territory — legible
   from Minecraft/Terraria/Valheim without a word of dialogue. No quests, no NPC text.
6. **Systems over content.** One well-built mechanic (a tile with HP and two booleans) generates
   more play than ten hand-authored setpieces.

## 3. Setting

**Medieval, low fantasy, no guns.** The dead have risen; nobody knows why; it does not matter.

Why medieval (decided, not up for relitigation without new information):

- Windows are **shutters** (open / closed / barred), not glass. Three states, all legible, no
  "broken glass" ambiguity.
- Doors are **barred from inside**. A spatial rule with tactical consequences.
- **No firearms** means no audio dependency for the core feel, no ammo economy to balance
  early, no noise mechanic required for combat to make sense.
- Melee + bow + crossbow + spear gives all the combat variety needed.
- Material tiers (timber → stone → iron) are intuitive and map onto building strength.
- Loot is not canned goods on shelves; it's grain stores, salted meat, wells, game to hunt,
  fields to plant. This forces the player outside, which pillar 2 needs.
- Medieval art assets are the most abundant category on every store.
- Distance from *Project Zomboid*, which a modern-setting version would be compared to in
  every sentence.

**Tone**: grim but not gory; flat colours now, pixel art later. Deaths are stated plainly
("The bite took you.").

## 4. Platform and technology

- **Vanilla JS ES modules**, loaded directly by the browser. No bundler, no framework, no
  build step. `index.html` + `src/**/*.js`. This is deliberate: the whole game runs from a
  static file server, including GitHub Pages, and iteration is save-and-refresh.
- **Canvas 2D** for the world. **DOM** for UI (menus, inventory, HUD text). The DOM is the best
  UI toolkit in games; use it.
- **No physics engine.** AABB, resolve X then Y, hand-rolled. Everything "physical" in this
  game is HP + collision + timers.
- **Fixed logical resolution** 960×560 (24×14 tiles), scaled by CSS. Camera scrolls in both axes.
- **Frame loop**: `requestAnimationFrame`, `dt` clamped to 1/30 s. Simulation is dt-based, not
  fixed-step; if determinism is ever needed (replays, multiplayer) switch to a fixed
  accumulator — the systems are written to allow it.
- **Libraries**: none required. Permitted only when they carry real weight (a future
  WebGL renderer via PixiJS if canvas 2D hits its ceiling; nothing else is anticipated).
- **Deployment**: GitHub Pages from `main`. Local dev: any static server
  (`python -m http.server`, `npx serve`).
- **Audio**: deferred entirely. Nothing in the design may *require* audio to be understood.
- **Art**: flat-colour placeholders until the systems are proven. Sprites are a swap of the
  paint functions, not a rewrite; keep all drawing behind `render/`.

## 5. The world

### 5.1 Tile grid

The world is a 2D array `grid[row][col]` of tile objects or `null` (air). Tile size is
**40 px**. The starter world is 60×14; the first real world will be ~200×48 with the
surface around row 12 and bedrock at the bottom.

Two independent questions are asked of every tile, and the answers depend on the tile's
*state*, not just its kind:

- `isSolid(tile)` — does it block movement?
- `isOpaque(tile)` — does it block vision?

In the current world these are equal (everything solid blocks sight; everything passable
lets sight through). They are kept as separate functions because glass, bars, grates and
fences will eventually split them, and because the separation is what makes the vision
model cheap to reason about.

A tile is a plain object: `{ kind, hp, bars, barHp, open, broken, insideDir, back }`.
`kind` indexes a definition table (`tiles.js`) holding defaults: max HP, solidity rules,
whether it is a portal, whether it is diggable, its drop.

### 5.2 Layers

Drawn back to front:

1. **Sky** — flat colour; day/night is a colour ramp on this and on the ambient overlay.
2. **Background layer** — what is behind the play plane. *Today*: a `back` paint tag on air
   tiles (`'plaster'`, `'earth'`; `null` = sky). *Planned*: a real second grid holding
   placeable background walls and wall-mounted objects (torches, paintings) — see §5.7.
3. **Tiles** — the solid world (the foreground grid).
4. **Entities** — zombies, player, arrows, dropped items.
5. **Light** (planned, §12.1) — the ambient day/night overlay minus torch light.
6. **Vision overlay** — every tile not in the visible set is darkened.
7. **HUD** — screen-space.

### 5.3 Tile catalogue

Two numbers per tile: **hp** is what zombies chew through (∞ = they can't); **harvest** is what
the player's tool does (`tool`, `hits`, `drop`, and `perHit` for ore-like yield). `drop` on a
natural tile is a raw material; on a built tile it is the tile's own item id (§7.3).

| kind | solid | opaque | hp | harvest | notes |
|---|---|---|---|---|---|
| `air` | no | no | — | — | may carry a `back` |
| `dirt` | yes | yes | ∞ | shovel ×2 → dirt | terrain |
| `grass` | yes | yes | ∞ | shovel ×2 → dirt | terrain, dirt with a cap |
| `stone` | yes | yes | ∞ | pick ×6 → stone **per hit** | terrain; mounds on the surface, a layer below |
| `bedrock` | yes | yes | ∞ | — | terrain, bottom row |
| `trunk` | **no** | **no** | ∞ | axe ×1 → log | decoration; also what a placed `log` item becomes |
| `leaf` | **no** | **no** | ∞ | anything ×1 → leaves | decoration, placeable, 1 leaves — bushes, hedges |
| `wall` (timber) | yes | yes | 300 | axe ×4 → wall | structure, placeable, 1 plank |
| `wall_stone` | yes | yes | 900 | pick ×6 → wall_stone | structure, placeable, 1 stone |
| `floor` (planks) | yes | yes | 120 | axe ×2 → floor | structure, placeable, 1 plank |
| `ladder` | no | no | 40 | axe ×1 → ladder | structure, climbable; placeable, 1 plank |
| `door` | state | state | 150 | axe ×3 → door | structure/portal, bars from inside; 2 plank |
| `shutter` | state | state | 60 | axe ×2 → shutter | structure/portal, climb-through when open; 1 plank |
| `hatch` | state | state | 120 | axe ×3 → hatch | structure/portal in a floor, bars from above; 2 plank |

**Solidity is fixed per kind by what the kind is *for*, in three tiers — never toggled by
natural-vs-placed origin** (settled 2026-09-08, after placed log blocks accidentally turned
felled trees into free walls):

- **Terrain** (dirt, stone, bedrock) — always solid. It's the ground; a placed dirt or stone
  block is filling a hole or propping up a floor exactly like the ground it matches, so it
  keeps the ground's rule.
- **Decoration** (trunk, leaf) — always non-solid, always non-opaque, forever, *including once
  placed*. This was always specifically "trees don't block the run," not a general "natural
  material" rule — a felled log put back down is still a tree, not a wall. `ITEMS.log.make()`
  literally builds a `trunk` tile: no separate "log block" tile kind, no separate rule to keep
  in sync.
- **Structure** (wall, floor, wall_stone, ladder, door, shutter, hatch) — always solid (ladders
  climb-through by design). The one tier whose entire purpose is to be a barrier; the only way
  into it is a recipe (§7.3), never digging something up.

Stone was never in the decoration tier — "climbing a stone mountain" (§16 growth-vector intent)
requires it to collide, above ground and below, whether natural or mined-and-placed. There is
no inconsistency to resolve there; the earlier "natural vs. built" framing was solving the
wrong axis. A future block picks its tier and the two booleans follow — see §16's growth-vector
note.

**Terrain's solidity is fixed, but its *attackability* is not — and that's a second, narrower
axis, not a reopening of the first.** A stack of dirt has always been solid and un-scrambleable
at 3+ tall — correct for terrain, since the whole point of "zombies cannot dig; earth is the
strongest wall" (§7.4) is that a tunnel or sealed basement is surrounded by continuous,
un-worked earth with no path through it. But dirt is also the one terrain material directly
placeable with no crafting step, and a freshly *placed* dirt block is not that — it's a single
block someone carried over and set down, sitting on open ground with nothing else backing it.
Left un-attackable, three stacked dirt blocks are a permanent, zero-cost, un-scrambleable
fortress wall — strictly better than any crafted structure, for free, day one. So: a tile's
`kind` fixes its `solid`/`opaque` tier forever (§5.3 above), but a tile *instance* placed from
an item with a `placedHp` (dirt only, so far — raw stone isn't directly placeable; you must
craft it into `wall_stone`, already a proper attackable structure) gets finite hp right then,
checked via the instance (`t.hp`), not the kind's default. Natural dirt — including the walls
of a pit you dug, or the earth around an underground base — is never touched by this and stays
permanently un-attackable; only a block that came from the hotbar is flimsy. `placedHp: 40` is
deliberately weaker than even a shutter (60), so a raw-dirt barricade reads as "a stopgap," not
"a wall" — real fortification still means crafting one.

**Wood yield**: a trunk tile fells 1:1 into a `log` (placeable straight back as decoration — a
bark block for background variety, never a wall). Crafting turns 1 log into 4 **planks**, and
every structure recipe costs planks, not logs directly. That multiplier — not more or taller
trees — is what makes one tree's wood worth building with; see §7.3.

**`contact` hook**: a tile can define `contact: { dmg, cooldown }` (`spikes` is the one
example so far — non-solid, so a body sinks onto whatever's beneath it and keeps taking hits).
`contactDamage(tile)` reads it; `updatePlayer` samples the tile at the player's feet once a
frame against the player's own cooldown timer — no infection roll, this isn't a bite. This is
the block vector's "row + one predicate" case from §16: adding a new hazard tile needs no new
system, just a def and a value in an existing check.

Future: `chest`, `workbench`, `bed`, `well`, `torch` (decorative until lighting exists),
`fence` (solid, not opaque — the first split).

### 5.4 Portals: doors, shutters, trapdoors

One state machine for all three:

```
state ∈ { closed(hp), open, broken }     bars ∈ 0..2, each with its own barHp
solid  = bars > 0 || (closed && !broken)
opaque = solid
```

- **Open/close** from either side, if nothing is standing in the tile.
- **Bar** only from the "inside" side (`insideDir` for doors/shutters; above for hatches),
  only when closed (or broken — barring a broken door is the repair).
- **Damage** goes to bars first, then the portal's own HP. At 0 the portal becomes `broken`,
  which behaves as permanently open.
- **Climb through** an open or broken shutter: the player is placed into the tile and walks
  out the far side. Zombies do the same automatically.

### 5.5 Harvesting, digging and placing

- **Left click uses what you hold.** Tools (shovel / axe / pickaxe) act on the tile under
  the cursor if it is in reach. Each swing advances the tile's `dig` counter; the crack
  overlay shows progress; at `hits` the tile is removed. The wrong tool does nothing and says
  so ("needs a pickaxe").
- Removed tiles **drop items** into the world — small squares that fall, settle, and are
  picked up by walking over them. Stone yields every hit; everything else on removal.
- What's left behind: earth tiles become air with a dark-earth `back`; structure tiles keep
  whatever `back` they had (plaster inside, sky outside).
- **Placing**: a placeable is an *item* (`src/placement.js`). Hold it on the hotbar and it
  follows the cursor as a half-opaque ghost, outlined green where it can go and red where it
  can't (not empty, blocked by a body, too far, none left). Each left click stamps one and
  takes one from the stack. Selecting another slot is the exit; there is no build mode — the
  held item *is* the mode. Raw blocks (dirt, leaves, logs) are placeable straight off the
  ground or a felled tree; structures (walls, floors, ladders, doors, shutters, trapdoors) are
  crafted from planks or stone first (§7.3). Doors and shutters take their "inside" from the
  side the player stood
  on. Placed tiles inherit the air tile's `back`.
- **Dismantling** is harvesting a built tile with the matching tool. It drops the *item*
  (a door drops a door), so anything you built can be moved. A tile a zombie breaks drops
  nothing — losing it and taking it down are different.
- **Reach**: 110 px from the player's centre to the tile's centre, for everything.
- Bedrock cannot be dug. The world edges are invisible solid walls.
- **Tunnels are one tile tall.** The player is 36 px in a 40 px tile. This is a deliberate
  constraint: tunnels are tight and you cannot fight in one.
- Zombies cannot dig. Earth is the strongest wall in the game. Its counterweight is need
  (§7.4): you have to come up.

### 5.6 World generation

The starter world is seeded-random (`maps.js`): a flat surface at row 24, dirt to row 31,
stone to row 38, bedrock at 39. On the surface: stone mounds (3 wide, a uniform 2 tall — never
taller, so one is always a hill a zombie can scramble over, not an accidental wall the player
never built; see §8.4b), trees (placed after mounds so they route around them), one timber
house. Underground: stone veins in the dirt layer (another way to find stone), and a few
natural caves — air pockets with an earth backwall.

**What belongs underground.** Digging in is allowed, so there must be reasons to go down
and reasons not to stay. Reasons to go: stone veins now; later iron ore (the tier-3 material
only exists below the stone line), clay, a water table, buried cellars and ruins with loot.
Reasons not to stay: nothing grows down there — no wood, no food, no water without a well —
and needs (§7.4) will force the trip up. Caves are the seam between the two: a found room is
faster than a dug one, but you didn't choose its exits.

Nothing in the runtime may assume a particular layout.

**Planned for 1.0 (§1.1):**

- **A seed is the world's name.** The new-game screen takes a seed (number or string, hashed);
  "random" fills one in. Only worldgen draws from the seeded RNG — runtime randomness (zombie
  wander, drops) uses `Math.random()` and needn't be reproducible. Two players with the same
  seed *and the same game version* get the same world; a worldgen change bumps a
  `WORLDGEN.VERSION` shown beside the seed so nobody expects an old seed to match.
- **Height.** The surface becomes a per-column line: rolling hills, and a few **mountains**
  10–14 tiles tall with climbable faces (never a sheer 3+ face on a chase route — every step up
  is ≤2, per §8.4b's rule that natural terrain never gives free protection). The world grows
  upward to leave sky over the peaks (`ROWS` ~64, surface ~row 36); the camera already follows
  Y. Vision's flood over open sky gets bigger, which is when the vision cache stops being
  optional (§9, §16).
- **Biomes** are per-column stretches selected from the seed: *meadow* (trees, animals),
  *forest* (dense wide trees, less light), *rocky* (mounds, exposed stone, mountains), *ruins*
  (more prefabs, more zombies). A biome is a table row: tree density, mound chance, prefab
  pool, spawn table. Not a new system — a set of knobs worldgen already has.
- **Prefabs** are painted, not coded. A prefab is a JSON file worldgen stamps onto the surface:

  ```json
  {
    "name": "peasant_hut", "w": 9, "h": 6, "anchor": 5,
    "tiles": [ ".........", "wwwwwwwww", "w.......w", "w.......w", "w.......w", "dwwwwwwww" ],
    "back":  [ ".........", ".ppppppp.", ".ppppppp.", ".ppppppp.", ".ppppppp.", "........." ],
    "legend": { "w": "wall", "d": { "kind": "door", "insideDir": 1 }, "p": "bg_plaster", "T": "torch" },
    "markers": [ { "c": 4, "r": 4, "type": "loot", "table": "hut" }, { "c": 2, "r": 4, "type": "spawn", "kind": "zombie" } ]
  }
  ```

  `tiles` is the foreground grid, `back` the background grid (§5.7), both as rows of legend
  characters (`.` = nothing). `anchor` is the row that sits on the surface; worldgen flattens
  the ground under the footprint and refuses the spot if it can't. A legend entry is either a
  tile kind or a full `makeTile` extra. Markers are things the stamp can't express as a tile:
  loot (a container filled from a named table), spawns, the player start. **This format is the
  contract with the building-painting tool** — the tool emits exactly this; worldgen reads
  exactly this; nothing else needs to know a prefab exists. First set: peasant hut, lumber
  mill (logs, an axe), inn (beds, food, the biggest building), well, ruin (broken walls, loot,
  zombies inside). The current hand-coded house becomes the first prefab file.
- **Loot tables** are data too: `{ hut: [ { id: 'bread', n: [1,3], chance: 0.8 }, … ] }`.

### 5.7 The background layer (planned — the first 1.0 architecture piece)

Today `back` is a paint tag on an air tile (`'plaster'`, `'earth'`). It becomes a second grid,
`world.back[r][c]`, holding real tile objects *behind* the play plane:

- **Background walls** — `bg_plaster`, `bg_stone`, `bg_plank`, `bg_earth`. Placeable items;
  what a room *looks like* from inside — "the background style of your house". Worldgen writes
  `bg_earth` behind anything dug or caved underground and `bg_plaster` inside prefabs.
- **Wall-mounted objects** — `torch`, `painting`, `banner`, `shelf`. They need a background
  wall behind them (Terraria's rule). That rule is the whole reason to place background walls
  in a room you already sealed, and the whole reason torches (§12.1) are something you *work
  toward*: enclose, wall, mount, light.

Rules:

- The background layer **never** affects solidity, vision, zombies, or physics. It is only what
  you see behind the play plane. `isSolid`/`isOpaque` never look at it.
- A placeable item declares `layer: 'back'`; `placement.js` routes it into `world.back` instead
  of `world.grid`. `canPlaceAt` for a back item needs the foreground cell to be air or
  decoration (trunk/leaf), and for a *mounted* item, a background wall already there. The ghost
  and stamp flow is otherwise identical — the held item is still the mode.
- Two things can occupy one background cell: a wall and a thing mounted on it. Store the wall
  in `world.back` and the mounted object in `world.mount` (a third sparse grid), or store the
  mount as a field on the wall tile — decide at build time; the sparse grid is cleaner for the
  renderer and for `lights`.
- Harvesting on an air cell hits the mount first, then the wall, each with its own `harvest`
  and each dropping its own item. Removing a wall drops whatever was mounted on it.
- `airAfter` writes into `world.back`, not onto the air tile; the `back` field on foreground
  tiles goes away. `isUnderground` keeps its meaning (natural earth backwall = `bg_earth`).
- Rendering: `world.back` draws between sky and foreground; mounts draw on top of walls;
  both are culled and cached the same way as the foreground.
- Light (§12.1) collects emitters from mounts (torch) and the foreground (fireplace).

The migration is mechanical (every `back:` in maps.js, tiles.js, renderer, vision) and should
be one commit that changes no behaviour, followed by the commit that adds the first placeable
background wall and the torch.

### 5.8 Stateful tiles: containers, stations, beds (planned — the second architecture piece)

Furniture is a **foreground tile**, in the decoration tier (§5.3): non-solid, non-opaque,
walk-through — a chest in a one-tile corridor must not be a wall, and a bed you can't stand in
front of is useless. It occupies the cell (you can't build a wall through it), has modest hp,
is harvested with an axe and drops itself. It's opened with the existing right-click context
menu — "Open", "Sleep", "Cook…", "Drink" — so the interaction system gains nothing new. What
is new is that some tiles carry **state beyond `{hp, dig, bars…}`** and some **tick**:

- **Containers** — `chest`, `barrel`, `crate`: `t.inv = createInventory(n)`. Opening one
  shows the inventory window with two grids (yours, theirs) and drag between them — the
  window already does drag-to-swap within one grid, so this is the same code over two
  sources. Breaking a container spills its contents as drops. Prefab loot goes in these.
- **Stations** — `workbench`, `furnace`, `fireplace`, `anvil`(later): a recipe's `station`
  field (2c) gates it to the Craft palette when that station is within reach. Furnace and
  fireplace also *process*: `t.inv` of `{ input, fuel, output }`, a `t.progress` timer that
  advances every frame while there's fuel, a recipe table of its own (`ore → ingot`, `raw
  meat → cooked`). Minecraft's furnace, exactly. Both emit light while burning (§12.1).
- **Bed** — "Sleep": only when sealed and it's night; time skips to dawn; fatigue restores;
  interrupted by a breach (any tile bordering the player's enclosure taking damage). The
  bed is also where "survived another day" is most often *felt*.
- **Well** — "Drink": infinite thirst source (§7.4). No state; listed here because it's the
  first "furniture you find, not make".
- **Decor** — `table`, `chair`, `bookshelf`, `rug`: no state, no action, just tiles in the
  decoration tier. One row each. They exist so a home looks like one.

**Ticking.** `world.tickers: Set<idx>` holds every tile whose def has `tick(state, t, dt)`;
`world.set` adds/removes membership by def. A new system `updateTiles(state, dt)` runs them
in the update order — never a grid scan. `world.lights` (§12.1) is the same mechanism.

**Multi-tile furniture** (bed 2×1, table 2×1, a big painting 2×2): one *anchor* cell carries
the state; the other cells are `part` tiles `{ kind: 'part', of: idx }`. Interacting with or
breaking a part resolves to its anchor. Every grid question (solid/opaque/hp) stays
answerable per cell. Don't build this until the second multi-tile thing exists — a bed can
start as one tile.

**Serialization** (§15): `inv` is plain data, `progress` a number; nothing here breaks the
save rule, but `tickers`/`lights` are caches rebuilt on load, not saved.

## 6. Physics

- Bodies are AABBs `{x, y, w, h, vx, vy}`.
- `moveBody(body, solids, dt)`: integrate X, resolve against every solid, then Y, resolve.
  Resolving Y downward sets `onGround`. This ordering is what prevents corner snags.
- Solids for a body = solid tiles in the body's neighbourhood + other bodies as the rules
  allow (see zombies §8.5 for who collides with whom).
- Gravity 1800 px/s², terminal 1000. Player run 260, jump −640 with an early-release cut to
  −220. These numbers are *tuned*; do not change them without playing.
- **Ladders**: a body whose centre column overlaps a climbable tile is "on a ladder".
  Player: W climbs at 180, S drops at 180, neither slides at 70 (Minecraft rule), Space
  jumps off (with a 0.3 s grace so the ladder rule doesn't cancel the jump).
- **Step climbing** (`tryClimb`): a body blocked horizontally whose obstacle is one tile with
  a passable tile above it is lifted into that tile and continues. This single rule is how
  zombies mount sills, climb through open shutters, and step off ladders onto floors.
- **Fall damage** (planned with mountains, §5.6): landing with `vy` above a threshold (~ a
  4-tile drop) costs HP scaling with the excess, capped well short of lethal from any height
  you can actually reach; never infects (it's not a bite). Ladders and water (if ever) reset
  it. Mild on purpose: a reason to build stairs, not a way to die.

## 7. The player

### 7.1 Movement
See §6. Facing follows the mouse. The held item is drawn pointed at the mouse.

### 7.2 Health, injury, infection
- HP 100. Zombie touch does 20 and knocks back; per-zombie cooldown 0.8 s.
- Each touch has a **25% chance to infect** if not already infected. Infection is a hidden
  90 s clock. The player is told nothing for the first 60%; after that the HP bar tints and
  "you feel feverish" appears while HP drains slowly. At 0 s: "The bite took you."
- Cure: none in the base design. A late-game rare cure is possible but must be genuinely
  rare or pillar 4 collapses.

### 7.3 Inventory and hotbar — everything is an item

There is one inventory: 20 slots (5×4), one stack per item id, stacks unlimited — the slot
*count* is the only limit, and it bites only when you carry many *different* things. **The
hotbar is not a separate structure: it is slots `0..HOTBAR_SIZE-1` (5) of that same
inventory.** `state.held` is a slot index, not an item id; `heldId(inventory, held)` resolves
it wherever a system needs to know what's selected. Number keys `1`–`5` select those slots.
A fresh game seeds sword/bow/shovel/axe/pickaxe into slots 0–4 and 10 arrows into slot 5, so
day one plays exactly as if the hotbar were fixed — it just isn't, underneath.

- **Using an item** (left click) dispatches on its `kind`: `weapon` swings/shoots (never
  consumed), `tool` harvests the tile in reach (never consumed — no durability yet),
  `placeable` shows a ghost and stamps a copy into the world, consuming one from the stack
  (`src/placement.js`). Selecting a different slot is the only way to stop placing —
  there is no separate build mode, because the held item *is* the mode. `material`
  (planks, stone, arrows) has no left-click behaviour of its own; it's consumed by recipes
  or by the bow.
- **Crafting**: right-click empty ground → Craft… opens a palette of recipes (`cost` →
  `gives`, data in `items.js`); affordable ones are lit; a click crafts one batch and the
  palette stays open with refreshed counts. Output prefers a free hotbar slot, then the rest
  of the inventory, then drops at your feet if nothing fits. Placeable items (all the
  structures) only ever enter play through a recipe or as loot — never straight from a
  menu — so a wall in your hand is always something you made or found.
- **Dismantling and looting therefore compose for free**: a structure's `harvest.drop` names
  its own item id, so taking one down with the matching tool hands you back the exact
  placeable, ready to carry and place again elsewhere. A `door` in a ruin, a `wall` pried off
  a failing base — same item, same slot, same ghost-and-place flow as one you crafted.
- **Inventory window** (`I`/`Tab`): all 20 slots, the hotbar row marked with an accent
  border; click-and-hold a stack and release on another slot to swap (works between the bar
  and the rest of the pack identically — swapping *is* how you equip something). When every
  slot is full, drops stay on the ground ("inventory full").
- Item definitions in `items.js`: `kind` (`weapon` / `tool` / `material` / `placeable`),
  `tool` (which harvest.tool it matches), `ammo` (material it consumes), `make(insideDir)`
  (the tile a placeable becomes).
- **Durability (planned, §7.6).** Tools, weapons and the shield stop stacking: such a slot
  holds `{ id, n: 1, dur }` and `give()` never merges two of them (materials keep stacking
  exactly as now). The def carries `maxDur`; a swing, a harvest hit or a blocked attack costs
  1; at 0 the item breaks — removed with a hint, and the shield's break is a beat you feel.
  A small bar under the icon shows wear. Repair at a workbench costs material. This is the
  one change here that touches the inventory model itself; do it in its own commit.
- **Consumables (planned, §7.4).** A `food`/`drink` kind: left click eats one from the stack
  and restores a need. Same dispatch as everything else.

### 7.4 Needs (not built yet)
- **Hunger**, **thirst**, **fatigue**. Each is a 0–100 meter that drains with time (faster
  when running/fighting). Low meters slow you and weaken swings; empty hunger/thirst drains
  HP. Fatigue is restored by sleeping in a bed, which passes time and is only safe if sealed.
- These exist to force the player *out* of a sealed basement. Without them, digging in wins.
- **Sources.** Hunger: scavenged food in prefabs (bread, dried meat — finite), raw meat from
  animals (chicken, pig, deer via the entity registry), cooked at a fireplace (§5.8) for more.
  Thirst: a **well** tile (found in prefabs, craftable from stone) — infinite, but you have to
  *go to it*; carried water (a waterskin) is a later nicety. Fatigue: a bed.
- **The long game.** Scavenged food runs out by design; animals **respawn** off-screen in
  their biome so day 30 isn't starvation. Farming is the better answer and is post-1.0.
- **Moodles** (§14) are how the player reads all of this. No numbers on the HUD by default.

### 7.5 Stamina (post-1.0)
Zomboid's real difficulty dial. Swinging and running cost stamina; low stamina slows
swings. Deferred until needs are in and tuned.

### 7.6 Equipment: the offhand and the shield (planned)

One slot beside the hotbar, the **offhand**, holds a shield (later a held torch, or nothing).
A shield blocks a zombie attack arriving from the facing side (`player.facing` vs the
attacker's centre): no damage, **no infection roll**, one point of shield durability, and a
short stagger on the zombie so a block is also a beat. Attacks from behind land normally.
Blocking is passive — no button; the decisions are *which way you're facing* and *whether the
shield is still intact*. You can swing with a shield up; the price is that the shield wears out
and you make another. Shield tiers follow materials: wood (cheap, ~15 blocks) → iron-banded.

Armour (post-1.0) is more slots of this shape — head, body — each a damage reducer with
durability. The offhand is the pattern; armour is copies of it.

## 8. Zombies

### 8.1 Stats
30×30 body. Speed 55–125 (individual), ×1.3 when it can see you. HP 3. Touch damage 20.
Cannot dig, cannot open portals, cannot jump except the one-tile step climb.

### 8.2 Senses
- **Sight** is the enclosure model (§9): a zombie sees the player iff the zombie's tile is in
  the player's visible set *and* it is within 380 px horizontally and 260 px vertically.
  Symmetric by construction — no separate zombie-side computation.
- **Attention**: while any zombie sees the player, a shared attention point is set to the
  player's position and lingers 5 s after the last sighting. Wanderers within 900 px of it
  adopt it as a "last seen" and move to investigate. This is the mechanism by which being
  seen builds a siege.
- **Hearing**: not built. When it comes, it is the same flood fill with a radius instead of
  an opacity test, triggered by combat and breaking. Sealed rooms are then safe only if quiet.

### 8.3 States
```
wander      — pick a direction (or pause) every 1–3 s; turn around on obstacles
investigate — walk to lastSeen (from sight, or from attention); drop it on arrival or after 6 s
chase       — investigate with the ×1.3 speed bonus; refreshed every frame while seeing
attack      — blocked by a solid portal while investigating/chasing: hit it every 0.9 s for 20
climb       — target is above: path to the nearest ladder column, climb at 55 px/s;
              pound a solid trapdoor overhead; step off when feet are level with the target
stagger     — 0.22 s knockback after taking a hit; no AI
dead        — corpse lingers 2.5 s, fades 1 s, despawns
```
Memory: `lastSeen {x, y, t}`. Cleared on arrival (within 12 px, same row) or after 6 s.

**"Target is above" only trusts a *grounded* sighting.** `lastSeen.y` updates to the player's
live y every visible frame — including mid-air — and a full jump clears well over a tile at
these physics constants (apex ≈114 px against `TILE` = 40). Using it directly for the
above/below check meant any jump near any zombie briefly read as "they're on a different
floor," which sent the zombie to `nearestClimbColumn` — the closest climbable tile *anywhere in
the world*, often a single distant ladder — and back again the instant the player landed; a
zombie that reached that ladder while still mid-decision could climb, lose the (grounded again)
target, drop, and repeat forever. Fixed by tracking a second field, `lastGroundedY`, updated
only when `canSee && player.onGround`; the climb decision (`targetAbove`) reads this instead of
`lastSeen.y`, so a jump on flat ground is invisible to it and a genuine change of floor (player
standing still up on a loft) is still detected correctly. Cleared alongside `lastSeen`, and
also cleared (not inherited) when a wanderer picks up a sighting from `attention`, since that
shared point's y isn't known to have been grounded.

### 8.4 Breaking in
A blocked zombie looks at the column in front of it — its own row and one row above — for a
solid portal, and attacks it. Shutters (60) go in three hits; doors (150) in eight; each bar
(100) in five. A broken shutter is an entry: the zombie steps up through it (§6). Walls and
floors are attackable in the same way with much higher HP; this is what makes material tiers
matter.

### 8.4b Obstacles by height
What a blocked, chasing zombie does depends on how tall the obstacle is:
1 tile — steps up instantly (`tryClimb`). 2 tiles — **scrambles** over in `SCRAMBLE_TIME`
(5s): `y` eases from where it grabbed on to the top of the stack every frame (not a wait-then-
teleport — that read as stuck, not climbing), while `x` stays pressed against the face until
the very last instant, when it snaps onto the ledge alongside the final `y`. Landing has to
resolve both axes together — landing only in Y leaves it floating over open air one column
short, which falls straight back down and restarts the climb forever (a real bug during
development, not a hypothetical). 3+ — cannot; attacks the tile if `canZombieDamage` (anything
with finite hp, or a portal), otherwise just holds. This check runs *before* height is even
considered, so a player-built wall of any height is always attacked rather than climbed.
So a 2-deep pit is a delay, a 2-high fence is a bad wall, and 3-high is where fortification
starts — **for the player's own builds**. Natural terrain is a different case: a 3-tall
feature the player never built (the old stone-mound centre peak) creates the exact same
un-scrambleable, un-attackable wall, but as unearned protection from map geometry rather than
something the player made — worldgen keeps natural mounds a uniform 2 tall specifically so
they're always the "hill" case, never the "wall" case (§5.6).
Pits also fill: zombies are solid to each other and stack, so a pit holds `depth − 1` per
column before the next one walks across. That is emergent and intended.

### 8.5 Collision rules
- Zombies are solid to the player and to each other (they crowd, they block doors, you can
  stand on them).
- A **climbing** zombie is solid to nothing but tiles and the player; nothing stands on it.
  This turns a pile at a ladder into a queue.
- Corpses are solid to nothing and collide only with the ground.

### 8.6 Spawning and pressure (not built)
- A world has a zombie population that drifts toward the player over days. Night raises
  activity (speed, sight range). Noise and sightings raise local density.
- Killed zombies are replaced from off-screen over time, so clearing an area is temporary.
- The intended curve: day one is survivable in the open; by day five the open is death and
  the base's outer layer is failing.
- **The curve is a function of the day counter** (§1.1) — target population, spawn rate and
  night multipliers all read `state.time.day`. That's what makes "survive longer" an arc
  instead of a plateau: the world you're in on day 12 is not the world of day 2. One config
  block (`PRESSURE`), tuned by playing, never by formula alone.
- Spawns happen off-screen (beyond the camera + a margin), on the surface or in caves, never
  inside the player's current enclosure. A sealed base is never spawned into; it is only ever
  broken into.

## 9. Vision: the enclosure model

**Rule**: flood-fill from the player's tile through non-opaque tiles, 4-connected. The set
of reached tiles is *visible*. Opaque tiles touching visible air in any of the **8**
directions are also marked visible (you see the wall, its corners, and the ground it stands
on; you don't see through it). Sight spreads 4-way, lighting spreads 8-way — the asymmetry
is deliberate: no peeking through diagonal gaps, no dark corners in your own house. If the
fill reaches the top row, the player is **exposed**; otherwise **sealed**.

Consequences, all of which are intentional and none of which required extra code:
- A shuttered house is dark outside and lit inside. Open one shutter and the whole outside
  appears at once. This is binary on purpose: side-view line-of-sight produces no useful
  shapes, enclosure does.
- Multi-room buildings seal per room. A closed trapdoor makes the loft its own world.
- A basement with a shaft is exposed until the shaft is capped.
- Entities outside the visible set are not drawn. You cannot see a zombie the model says you
  can't see. Zombies obey the identical rule.
- Cost: the fill touches every tile in the connected region — up to the whole sky. On a
  200×48 world that is ~10k cells per frame. Acceptable; cache on (player tile, world
  version) if it ever shows up in a profile.

Rendering: tiles not in the set get an 84% dark overlay. With day/night this overlay's
colour and strength will follow the sky.

## 10. Combat

### 10.1 Melee (sword)
- Sector hitbox: 78 px reach, ±0.95 rad, from the player's centre along the aim.
- Timing: **0.15 s wind-up → 0.10 s active → 0.35 s recovery**. No cancelling. One hit per
  target per swing. Staggers the target away from the player.
- Cannot hit what you cannot see (target tile must be in the visible set).
- Drawn as an arc: outline during wind-up, filled and fading through active/recovery. The
  hotbar slot sweeps dark for the full duration so the rhythm is readable.

### 10.2 Ranged (bow)
- **Hit is decided at click** by a ray from the player along the aim against solid tiles and
  living zombies; nearest wins; range 800.
- The arrow is **presentation only**: a homing projectile that re-targets the entity's live
  position each frame and always lands. A miss flies to the impact point and sticks for
  0.5 s. Delay = distance / 1100 px/s.
- Damage 2. Cooldown 0.6 s.
- **Ammo**: arrows are an inventory item. 10 to start. A miss drops the arrow where it
  stuck; a hit returns it 60% of the time at the target. 1 plank fletches 4 (right-click
  menu). This is what stops the bow being the best weapon.

### 10.3 Damage model
Zombie HP is small integers (3). Sword 1, arrow 2, future crossbow 3, spear 1 with reach.
Wounds are drawn as notches so remaining HP is readable without a bar.

## 11. Building and crafting (mostly not built)

- **Materials**: dirt, timber (from trees), stone, iron (from ore + a furnace). Each is a
  wall/floor/door tier with rising HP: timber 300 / stone 900 / iron-banded 2000.
- **Bars** are the universal reinforcement (+100 HP each, max 2, inside only).
- **Repair**: hammer on a damaged tile restores HP at a material cost.
- **Stations** (§5.8): workbench (wood and stone goods), furnace (smelting), fireplace
  (cooking). Recipes are data; `station` on a recipe gates it.
- **Furnishing** is building's second half (§5.7, §5.8): background walls, mounted torches
  and paintings, chests, a bed, a table. None of it changes enclosure; all of it changes
  whether the place feels like yours. Terraria's insight: the *room* is the reward.
- **The loop**: gather outside (exposed) → craft inside (sealed) → build (changes enclosure)
  → furnish (changes nothing but you).

## 12. Time

- A day is ~10 real minutes. The sky and ambient overlay ramp through dawn/day/dusk/night.
  `state.time = { t, day }`; the HUD shows the day and a sun/moon arc. Day 1 starts at dawn.
- Night: zombies ×1.2 speed, +50% sight range, more spawns. Being outside at night should
  feel like a mistake.
- Sleep (bed) passes time to dawn; only allowed when sealed; interrupted by a breach.

### 12.1 Lighting (decided 2026-09-08: cosmetic only)

Night is an ambient overlay whose alpha follows the clock. A **torch** — a background-layer
object (§5.7), so it needs a wall behind it — emits light: a bounded flood from the torch
through non-opaque tiles (radius ~6, falling off per step) that subtracts from the overlay.
Lit tiles near a torch look like day; a room with no torch at night is dim enough to be
unpleasant. Underground is always "night" without a torch.

**Light never changes what zombies can see.** The enclosure model (§9) is the only sight rule
and it stays binary. Torches exist because the dark is unpleasant to look at and a lit room
reads as *home* — the reason to make and place them is aesthetic and it is enough. If a stealth
layer is ever wanted, it goes on top as its own decision, not by making the light flood do
double duty. Chosen over stealth-lighting because stealth would (a) blur the one clean rule the
game has, (b) turn torches into a tactical liability, and (c) cost a second flood per zombie.

Lights are gathered from `world.lights: Set<idx>`, maintained like tickers (§5.8) — a def with
`light: { radius, color }` joins on `set`, leaves on removal. The light map is recomputed only
when the world version changes; the per-frame cost is compositing, not flooding. Planned
emitters: torch (back layer), fireplace and furnace while burning (foreground, §5.8), and later
a held torch in the offhand (a moving light, recomputed per frame for that one source only).

## 13. Progression

There is no story, so progress must be *visible in the world*:

1. **Shelter tier**: a found house → barred → repaired → stone → a compound.
2. **Tool tier**: bare hands → wood → stone → iron. Each unlocks tiles to dig and things
   to build. *Planned detail (§1.1 "you start with nothing"):*
   - You spawn with **nothing**. Bare hands can fell a trunk slowly and dig dirt slowly —
     `harvest.hand: hits` on a def is the optional "hands can do it, badly" number; absent
     means impossible by hand (stone, built walls). Punching a tree is the first thing you do.
   - Tools and weapons carry `tier` (wood 1, stone 2, iron 3) and a `speed` multiplier on
     harvest hits. A def's `harvest.tier` is the minimum: stone needs any pick, **iron ore**
     (below the stone line, §5.6) needs a stone pick, iron-banded structures need iron to
     dismantle. Wrong tier reads the same as wrong tool: "needs a stone pickaxe".
   - Weapons per tier: wooden club → stone axe-blade → iron sword; the bow stays wood but
     arrowheads tier (stone, iron) for damage. Each tier is a `CRAFTS` row and a station
     (§5.8): wood at hand, stone at a workbench, iron at a furnace (smelt ore → ingot) then
     the workbench.
   - The starter loadout becomes a **loot table entry** in the first prefab, not a gift: the
     house you find has an axe in a chest, if you look. `STARTER_LOADOUT` survives as a debug
     option only.
3. **Territory**: the map is bigger than what you can hold. Outposts, tunnels between them.
4. **Skills by use** (optional, later): swing faster after many swings, dig faster after
   much digging. Zomboid-style; no skill trees to read.

Failure is permanent (permadeath per world). Worlds are cheap to start.

## 14. UI

- **HUD** (canvas): HP bar (tints when feverish), the enclosure label
  (`SEALED · nothing can see you` / `EXPOSED · 3 see you` / `they remember`), hotbar with
  cooldown sweeps, needs meters later.
- **Context menu** (DOM): right-click on a tile lists what you can do to it. Always ends in
  Cancel. Disabled items say *why* ("only from inside", "walk closer", "blocked").
- **Hover hint**: interactable tiles get an outline under the cursor.
- **Inventory** (DOM): the window; **Crafting** (DOM): the palette. Planned: the same window
  with a second grid for an open container (§5.8), and the offhand slot beside the hotbar (§7.6).
- **Moodles** (planned, §7.4): a column of small status icons at the screen edge, Zomboid's
  idea exactly — hungry / thirsty / tired / hurt / feverish / cold(later) — each with a severity
  step shown as a colour and a one-word hover. The HP bar stays; the needs meters do **not**
  get bars — a moodle appearing *is* the meter. Fever's existing tint becomes a moodle too.
- **Death screen** (planned, §1.1): leads with **days survived**, then cause of death, kills,
  tiles placed, and the seed (so you or a friend can try it again). R / New game / Title.
- **Title and new game** (planned, §15): Title → *Continue* (if a save exists) / *New game*
  (seed field, "random") / *Settings*. Pause menu gets *Save & quit to title*.
- **First-time hints**: the paragraph under the canvas is not a tutorial. A dozen one-shot
  hints ("press I for your pack", "right-click the ground to craft", "you're exposed — find
  walls") fire on first relevance and never again per save. Data, not a system.

## 15. Saving

Serialize `{ seed, world.grid, world.back, entities, player, inventory, time, hintsSeen,
stats }` to JSON in `localStorage` (IndexedDB if worlds grow past a few MB). Autosave on
sleep and every N minutes, plus *Save & quit*. One world per slot; three slots. Not built;
the state object is designed to be serializable (no class instances with methods in the state
tree, no closures).

**Promoted to mandatory for 1.0 and moved early (decided 2026-09-08).** A shareable seed plus
multi-day survival means players must be able to leave and come back — and it is far cheaper
to keep the state tree serializable *as* chests, furnaces and the background layer are added
than to retrofit it after. So: the minimal save/load (one slot, no UI beyond a key) is built
right after stateful tiles (§5.8) and every later phase keeps it green. Rules from now on:

- Anything new in `state` is plain data. A `Set` or `Map` (tickers, lights, vision) is a
  *cache* rebuilt on load, never saved.
- `World` grows `toJSON()` / `World.fromJSON()`; tiles are already plain objects. Compress the
  grid as run-length rows of kind ids plus a sparse list of tiles with non-default state (a
  120×64 grid of full objects is too big for `localStorage` otherwise).
- Entities save by `kind` + the fields their registry entry lists; transient AI (`lastSeen`,
  `scramble`) is dropped and starts fresh on load — a zombie forgetting you across a reload is
  fine.
- Game version in the save; an older version refuses to load with a clear message rather than
  half-loading. No migrations before 1.0.

## 16. Architecture

```
index.html                 page shell, CSS tokens, canvas + DOM UI mounts
devserver.mjs               local dev server (sends Cache-Control: no-store — see §17 note)
src/main.js                 bootstrap + RAF loop; calls validateContent() before anything else
src/validate.js              boot-time checks over TILE_DEFS/ITEMS/CRAFTS; throws with every
                              problem found, not just the first
src/config.js                every tunable constant, grouped, exported
src/game.js                  creates the state object; runs systems in order
src/input.js                 keyboard/mouse → per-frame action flags + mouse world coords
src/physics.js                overlap, moveBody, sectorHits, rayBox, onClimbable, tryClimb
src/items.js                  ITEMS, STARTER_LOADOUT, CRAFTS — the whole item vocabulary, data only
src/inventory.js              slots array: createStartInventory, give/take/swap, heldId, count
src/world/tiles.js            tile definitions, makeTile, isSolid/isOpaque/isClimbable/isPortal,
                               canZombieDamage, damageTile, harvestTile, airAfter, integrity
src/world/world.js            World: grid, get/set, tileAtPx, solidsNear, allSolidRects, surface, version
src/world/maps.js             seeded starter world generator
src/world/vision.js           computeVision → { visible, exposed }
src/entities/player.js        createPlayer, updatePlayer, hurtPlayer, isFeverish
src/entities/zombie.js        createZombie, updateZombies, hurtZombie (senses, decide, scramble, attack)
src/entities/drops.js         spawnDrop, updateDrops — items lying in the world
src/combat.js                 sword swing + hitscan/homing-arrow bow; updateHotbar (slot select)
src/tools.js                  shovel/axe/pick harvesting the tile under the cursor
src/placement.js              the ghost + stamp for whatever placeable is currently held
src/interactions.js           context-menu items for a tile; the Craft palette's entries + craft()
src/ui/hints.js                the one-line transient hint ("no arrows", "too far")
src/ui/menu.js                 ContextMenu (DOM widget, knows nothing about the game)
src/ui/palette.js              generic thumbnail-grid palette (used for Craft)
src/ui/inventoryPanel.js       the inventory window; drag-to-swap
src/ui/hud.js                  canvas HUD: health, enclosure label, hotbar, ghost/hint banners
src/render/renderer.js         camera, layer order, culling, calls painters
src/render/tiles.js            paintTile + the default plain-block painter
src/render/sprites.js          drawWeapon, player/zombie boxes, swing arc, arrows
src/render/icons.js            40×40 item icons for the hotbar/inventory (placeables reuse paintTile)
```

**State** is one plain object owned by `game.js`: `{ world, player, zombies, drops, arrows,
inventory, swing, target, ghost, camera, vision, attention, time, kills, held, paused }`.
Systems are functions `(state, dt)`. Nothing holds a reference to another system. Rendering
reads state and never mutates it.

**Update order** (per frame): input → player → vision → zombies → camera/aim → tools →
combat → placement → drops → hints. Tools, combat and placement are all called
unconditionally every frame; each checks the currently held item's `kind` and no-ops if it
doesn't apply — there is no mode flag gating which one runs (see §7.3). Vision runs after
the player moves and before zombies think,
because zombies decide using this frame's visibility.

**Tunables** live in `config.js` only. A number in a system file is a bug.

**Planned files (1.0, see §16.1):** `src/world/back.js` (background/mount grids and their
queries), `src/systems/time.js` (clock, day counter), `src/systems/light.js` (light map),
`src/systems/tiles.js` (`updateTiles` over `world.tickers`), `src/systems/needs.js`,
`src/systems/pressure.js` (spawning curve), `src/entities/index.js` (registry),
`src/entities/body.js`, `src/entities/chicken.js`, `src/world/prefabs/*.json` +
`src/world/prefab.js` (stamp), `src/world/loot.js`, `src/save.js`, `src/ui/containerPanel.js`
(two-grid inventory), `src/ui/moodles.js`, `src/ui/title.js`, `src/ui/death.js`.

**Growth vectors.** New content arrives along three data-driven paths — a block is a row in
`TILE_DEFS` (plus a painter only if it has a distinctive look), a craft is a row in `CRAFTS`,
an entity is a `create` + `decide` + `paint` registered by kind — and one design path: a
system, which is a `(state, dt)` function in the update order. TODO Phase 2c is the work that
makes the first three genuinely one-row. `docs/ADDING.md` (planned) is the checklist.

### 16.1 Road to 1.0: build order (decided 2026-09-08)

The 1.0 list (§1.1) is mostly content, but three items are architecture and everything else
sits on them. Build in this order; each line depends on the ones above it.

```
entity registry (2c)  ─┬─► animals ──► food ──► needs ──► moodles
                       └─► NPCs (post-1.0), zombie variants (post-1.0)
background layer (§5.7) ──► torches ──► day/night + lighting (§12.1) ──► day counter = score
                        └─► decor, house styling
stateful tiles (§5.8)  ─┬─► chest (two-grid panel) ──► loot tables ──► prefabs (§5.6)
                       ├─► bed ──► sleep/fatigue
                       ├─► workbench/furnace stations ──► tiers (§13) ──► durability/shield (§7.6)
                       └─► save/load (§15) — built right here, kept green after
pressure (§8.6) — needs day counter; tuned last because everything above changes it
world (§5.6) — seed UI, height, biomes, prefab stamping; last because prefabs need the
               tile vocabulary (background walls, furniture, chests) to exist first
menus, death screen, first-time hints (§14) — the wrapper; last
```

The three architecture pieces are each one focused commit with a proving feature: the
registry proves itself with a chicken, the background layer with a torch on plaster, stateful
tiles with a chest you can open. Nothing else in 1.0 needs new plumbing — it is rows in
tables and `(state, dt)` functions in the update order.

## 17. Open questions

- Should zombies stack (stand on each other) to reach upstairs shutters? Fun, horrifying,
  but it makes every second storey reachable. Leaning no until walls have tiers.
- ~~Two-tile-tall player?~~ **Resolved 2026-09-08: no, and closed for good.** The prefab
  painting tool is being built now and every building it produces bakes in door height,
  ceiling height and corridor height. Changing the player's size after that costs every
  painted building. One-tile-tall stays; it's also what makes one-tile tunnels and the
  ladder/hatch/loft layouts work. Doors stay 1 tall; rooms can be any height.
- Rope (a ladder you can pull up) vs trapdoor as the loft defence. Both, probably.
- Cure or no cure. (Post-1.0 either way.)
- Furniture and zombies: furniture is decoration-tier (non-solid, §5.8) so it can never be a
  barricade — but should a zombie *smash* a chest it walks through? Leaning no for 1.0; a
  breached room losing its loot is a good later cruelty.

## 18. Glossary

- **Exposed / sealed** — the enclosure boolean (§9).
- **Portal** — a door, shutter, or trapdoor: a tile with open/closed/broken + bars.
- **Attention** — the shared "someone saw the player here" point (§8.2).
- **Step climb** — the one-tile mount rule (§6).
- **Background layer** — the grid behind the play plane: background walls and things mounted
  on them (§5.7). Never solid, never opaque.
- **Stateful tile / ticker** — a foreground tile carrying an inventory or a timer, updated
  from `world.tickers` (§5.8).
- **Prefab** — a painted building stamped by worldgen from JSON (§5.6).
- **Moodle** — a status icon standing in for a needs meter (§14).
