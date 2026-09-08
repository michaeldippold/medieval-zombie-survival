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
2. **Backwall** — what is behind an air tile. `null` = sky. Dug-out earth shows dark dirt;
   house interiors show plaster. Stored per tile as `back` on the air tile (air tiles with a
   backwall are real objects with `kind: 'air'`).
3. **Tiles** — the solid world.
4. **Entities** — zombies, player, arrows, dropped items.
5. **Vision overlay** — every tile not in the visible set is darkened.
6. **HUD** — screen-space.

### 5.3 Tile catalogue

Two numbers per tile: **hp** is what zombies chew through (∞ = they can't); **harvest** is what
the player's tool does (`tool`, `hits`, `drop`, and `perHit` for ore-like yield).

| kind | solid | opaque | hp | harvest | notes |
|---|---|---|---|---|---|
| `air` | no | no | — | — | may carry a `back` |
| `dirt` | yes | yes | ∞ | shovel ×2 → dirt | |
| `grass` | yes | yes | ∞ | shovel ×2 → dirt | dirt with a cap |
| `stone` | yes | yes | ∞ | pick ×6 → stone **per hit** | mounds on the surface, a layer below |
| `bedrock` | yes | yes | ∞ | — | bottom row |
| `trunk` | **no** | **no** | ∞ | axe ×1 → wood | trees don't block; no tree physics |
| `leaf` | **no** | **no** | ∞ | anything ×1 → leaves | placeable, 1 leaves — bushes, hedges, clutter |
| `wall` (timber) | yes | yes | 300 | axe ×4 → wood | placeable, 1 wood |
| `wall_stone` | yes | yes | 900 | pick ×6 → stone | placeable, 1 stone |
| `floor` (planks) | yes | yes | 120 | axe ×2 → wood | placeable, 1 wood |
| `ladder` | no | no | 40 | axe ×1 → wood | climbable; placeable, 1 wood |
| `door` | state | state | 150 | axe ×3 → wood | portal, bars from inside; 2 wood |
| `shutter` | state | state | 60 | axe ×2 → wood | portal, climb-through when open; 1 wood |
| `hatch` | state | state | 120 | axe ×3 → wood | portal in a floor, bars from above; 2 wood |

Collision decisions: trees and leaves never block movement or sight (a tree you can't walk
past is not fun; a forest you can't see through is a different game). Stone does both — a
stone mountain is a thing worth building.

Future: `chest`, `workbench`, `bed`, `well`, `torch` (decorative until lighting exists),
`fence` (solid, not opaque — the first split), `spikes`.

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
- **Placing** (target model, TODO Phase 2b; the current Build… palette is the interim): a
  placeable is an *item*. Hold it on the hotbar and it follows the cursor as a half-opaque
  ghost, outlined green where it can go and red where it can't (not empty, blocked by a
  body, too far, none left). Each left click stamps one and takes one from the stack.
  Selecting another slot is the exit; there is no build mode. Raw blocks (dirt, stone,
  leaves) are placeable straight from the ground; structures (walls, floors, ladders, doors,
  shutters, trapdoors) are crafted from wood or stone first. Doors and shutters take their
  "inside" from the side the player stood on. Placed tiles inherit the air tile's `back`.
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
stone to row 38, bedrock at 39. On the surface: stone mounds (3×2 plus a cap, solid),
trees (placed after mounds so they route around them), one timber house. Underground: stone
veins in the dirt layer (another way to find stone), and a few natural caves — air pockets
with an earth backwall.

**What belongs underground.** Digging in is allowed, so there must be reasons to go down
and reasons not to stay. Reasons to go: stone veins now; later iron ore (the tier-3 material
only exists below the stone line), clay, a water table, buried cellars and ruins with loot.
Reasons not to stay: nothing grows down there — no wood, no food, no water without a well —
and needs (§7.4) will force the trip up. Caves are the seam between the two: a found room is
faster than a dug one, but you didn't choose its exits.

Later: varied terrain, more structure types (barn, ruin, well), spawn points by distance.
Nothing in the runtime may assume a particular layout.

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

### 7.3 Inventory and hotbar
- Hotbar: `1` sword · `2` bow · `3` shovel · `4` axe · `5` pickaxe. Left click = use the
  selected item on the world or on enemies. Right click = context menu for the tile under
  the cursor: interact with portals, build into air, craft (never an attack).
- **Inventory**: 20 slots (5×4), one stack per item id, stacks are unlimited — so the slot
  count is the only limit and it bites when you carry many *different* things. A DOM window
  on `I`/`Tab`; click-and-hold a stack and release on another slot to swap. When every slot
  is taken, drops stay on the ground ("inventory full"). Build and craft pull from it.
- **Crafting**: right-click → Craft… opens the same palette widget as Build, titled Craft.
  Each entry is a recipe (`cost` → `gives`); affordable ones are lit; a click crafts one
  batch and the palette stays open with refreshed counts. Recipes are data in `items.js`.
  Nothing crafted ever goes straight into a context menu.
- Items are `{ id, n }`; item definitions in `items.js` hold kind (weapon / tool / material),
  tool type, and ammo.

### 7.4 Needs (not built yet — the next major system after digging)
- **Hunger**, **thirst**, **fatigue**. Each is a 0–100 meter that drains with time (faster
  when running/fighting). Low meters slow you and weaken swings; empty hunger/thirst drains
  HP. Fatigue is restored by sleeping in a bed, which passes time and is only safe if sealed.
- These exist to force the player *out* of a sealed basement. Without them, digging in wins.

### 7.5 Stamina (later)
Zomboid's real difficulty dial. Swinging and running cost stamina; low stamina slows
swings. Deferred until needs are in and tuned.

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

### 8.4 Breaking in
A blocked zombie looks at the column in front of it — its own row and one row above — for a
solid portal, and attacks it. Shutters (60) go in three hits; doors (150) in eight; each bar
(100) in five. A broken shutter is an entry: the zombie steps up through it (§6). Walls and
floors are attackable in the same way with much higher HP; this is what makes material tiers
matter.

### 8.4b Obstacles by height
What a blocked, chasing zombie does depends on how tall the obstacle is:
1 tile — steps up instantly (`tryClimb`). 2 tiles — **scrambles** over in `SCRAMBLE_TIME`
(5s), with a visible clawing shake; horizontal motion freezes for the climb, so landing must
snap both axes onto the obstacle's own column — landing only in Y leaves it floating over
open air one column short, which falls straight back down and restarts the climb forever.
3+ — cannot; attacks the tile if `canZombieDamage` (anything with finite hp, or a portal),
otherwise just holds. This check runs *before* height is even considered, so a player-built
wall of any height is always attacked rather than climbed. So a 2-deep
pit is a delay, a 2-high fence is a bad wall, and 3-high is where fortification starts.
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
  stuck; a hit returns it 60% of the time at the target. 1 wood fletches 4 (right-click
  menu). This is what stops the bow being the best weapon.

### 10.3 Damage model
Zombie HP is small integers (3). Sword 1, arrow 2, future crossbow 3, spear 1 with reach.
Wounds are drawn as notches so remaining HP is readable without a bar.

## 11. Building and crafting (mostly not built)

- **Materials**: dirt, timber (from trees), stone, iron (from ore + a forge). Each is a
  wall/floor/door tier with rising HP: timber 300 / stone 900 / iron-banded 2000.
- **Bars** are the universal reinforcement (+100 HP each, max 2, inside only).
- **Repair**: hammer on a damaged tile restores HP at a material cost.
- **Stations**: workbench (timber goods), stonemason's bench, forge. Recipes are data.
- **The loop**: gather outside (exposed) → craft inside (sealed) → build (changes enclosure).

## 12. Time

- A day is ~10 real minutes. The sky and ambient overlay ramp through dawn/day/dusk/night.
  No dynamic lighting; a lit sky *reads* lit.
- Night: zombies ×1.2 speed, +50% sight range, more spawns. Being outside at night should
  feel like a mistake.
- Sleep (bed) passes time to dawn; only allowed when sealed; interrupted by a breach.

## 13. Progression

There is no story, so progress must be *visible in the world*:

1. **Shelter tier**: a found house → barred → repaired → stone → a compound.
2. **Tool tier**: bare hands → timber tools → stone → iron. Each unlocks tiles to dig and
   things to build.
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
- **Inventory** (DOM, later). **Crafting** (DOM, later).
- **Death screen**: cause of death, R to restart.

## 15. Saving

Serialize `{ world.grid, player, zombies, time, inventory }` to JSON in `localStorage`
(IndexedDB if worlds grow past a few MB). Autosave on sleep and every N minutes. One world
per slot. Not built; the state object is designed to be serializable (no class instances
with methods in the state tree, no closures).

## 16. Architecture

```
index.html                 page shell, CSS tokens, canvas + DOM UI mounts
src/main.js                bootstrap + RAF loop
src/config.js              every tunable constant, grouped, exported
src/game.js                creates the state object; runs systems in order
src/input.js               keyboard/mouse → per-frame action flags + mouse world coords
src/physics.js             overlap, moveBody, sectorHits, rayBox, onClimbable, tryClimb
src/world/tiles.js         tile definitions, makeTile, isSolid/isOpaque/isClimbable/isPortal, damageTile
src/world/world.js         World: grid, get/set, tileAtPx, solidsNear, allSolidRects, version
src/world/maps.js          hand-built starter map(s)
src/world/vision.js        computeVision → { visible, exposed }
src/entities/player.js     createPlayer, updatePlayer
src/entities/zombie.js     createZombie, updateZombies, hurtZombie
src/combat.js              swing + arrows
src/interactions.js        portal/tile context-menu items and their effects
src/ui/menu.js             ContextMenu (DOM widget, knows nothing about the game)
src/ui/hud.js              canvas HUD + hotbar
src/render/renderer.js     camera, layer order, culling, calls painters
src/render/tiles.js        paintTile and friends
src/render/sprites.js      drawWeapon, zombie/player boxes, arrows
```

**State** is one plain object owned by `game.js`: `{ world, player, zombies, arrows, swing,
camera, vision, attention, time, kills, flags }`. Systems are functions `(state, dt)`.
Nothing holds a reference to another system. Rendering reads state and never mutates it.

**Update order** (per frame): input → player → vision → zombies → attention → camera/aim →
combat → cleanup → UI text. Vision runs after the player moves and before zombies think,
because zombies decide using this frame's visibility.

**Tunables** live in `config.js` only. A number in a system file is a bug.

**Growth vectors.** New content arrives along three data-driven paths — a block is a row in
`TILE_DEFS` (plus a painter only if it has a distinctive look), a craft is a row in `CRAFTS`,
an entity is a `create` + `decide` + `paint` registered by kind — and one design path: a
system, which is a `(state, dt)` function in the update order. TODO Phase 2c is the work that
makes the first three genuinely one-row. `docs/ADDING.md` (planned) is the checklist.

## 17. Open questions

- Should zombies stack (stand on each other) to reach upstairs shutters? Fun, horrifying,
  but it makes every second storey reachable. Leaning no until walls have tiers.
- Two-tile-tall player? Would allow two-tile tunnels and taller doors. Costs every hand-built
  structure. Decide before world generation, not after.
- Rope (a ladder you can pull up) vs trapdoor as the loft defence. Both, probably.
- Cure or no cure.

## 18. Glossary

- **Exposed / sealed** — the enclosure boolean (§9).
- **Portal** — a door, shutter, or trapdoor: a tile with open/closed/broken + bars.
- **Attention** — the shared "someone saw the player here" point (§8.2).
- **Step climb** — the one-tile mount rule (§6).
