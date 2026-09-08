# Asset Editor

The hand-drawn art tool for medieval-zombie-survival (DESIGN §16). Lives inside this repo so
it can save straight into `assets/` instead of being copied over by hand.

## Run it

Served by the game's own dev server, which also handles the save endpoint:

```
node devserver.mjs 8080
```

then open `http://127.0.0.1:8080/tools/editor/`. Opening `index.html` directly (`file://`)
also works for drawing, but **Save to game** needs the server — that's the one button that
writes into the repo rather than just downloading a file.

## What it's for

An **asset** is a piece of pixel art `w × h` tiles at 16px each — a 1×1 block, a 2×1 bed, a
2×3 fireplace, a 1×2 character (bodies are two tiles tall, DESIGN §6.1). Draw it, save it, and
the game picks it up: `render/assets.js` loads `assets/manifest.json` at boot and draws a
sprite for any tile/item `kind` that has one, falling back to today's flat colour painter for
everything else. Art can land one tile at a time.

- Pick an asset from the sidebar (filter by category), or **+ New asset** to make one at any
  size.
- Pencil / eraser / bucket fill / eyedropper, undo/redo, optional horizontal mirroring.
- Rename / duplicate / delete from the toolbar above the canvas.
- **Proportion preview**: the asset next to a two-tall mannequin over a sample background
  wall, at the game's planned display scale (16px art at 2×) — so a bed looks like a bed
  before it's anywhere near the game.
- **Save to game** posts the whole library to the dev server, which writes
  `assets/manifest.json`. Reload the game to see it.
- Work autosaves to the browser's `localStorage` as you draw (this tool's own project, not
  the game's — the manifest is a separate, explicit save).
- Export a single asset as a PNG, or save/load the whole project as JSON for backup.
- **Import legacy tileset** reads a project exported by the old standalone `zombie-tile-editor`
  (16×16-only, no server save) and folds its tiles in as 1×1 block/background assets.

## Naming convention

An asset's id should match the game's `kind` (for a tile in `TILE_DEFS`) or item id (for
something drawn via an item's `make()`) so it's picked up automatically — see `paintTile` in
`src/render/tiles.js`. There's no enforcement of this yet; a mismatched id just draws nothing
in-game.

## Notes

- Starts seeded with the current 15 game tiles (flat colours, matching `src/config.js`
  `COLORS`) plus blank canvases for things DESIGN has specced but no code touches yet:
  background walls (`bg_plaster`, `bg_earth`, `bg_plank`, `bg_stone`, `bg_window`), the first
  furniture (`chest`, `bed`, `fireplace`, `well`, `workbench`), and two-tall character
  sprites (`player`, `zombie`). Rename, delete, or add to this freely — it's a starting point,
  not a fixed list.
- 16px art at 2× display matches the game's planned tile size (32px, DESIGN §6.1).
