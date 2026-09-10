# Medieval Zombie Survival

A side-scrolling survival sandbox in a medieval, low-fantasy world overrun by the dead.
Terraria's world, Zomboid's stakes: you're either sealed or exposed, the dead notice and break
in, and the day counter is the score. Browser-native: vanilla JS ES modules, Canvas 2D, no
engine, no bundler, no dependencies.

- **Design** (source of truth for what the game is): [docs/DESIGN.md](docs/DESIGN.md)
- **Plan** (source of truth for what's next, and a decisions log): [docs/TODO.md](docs/TODO.md)
- **Art tool**: [tools/editor/](tools/editor/README.md) — draws the pixel art and saves it
  straight into `assets/`

## Run locally

Use the repo's own dev server — it sends `Cache-Control: no-store`, which matters: ES modules
are fetched by exact URL, and any server that caches them (Python's `http.server` does) will
silently keep serving stale code while you edit.

```bash
node devserver.mjs 8080
```

then open <http://localhost:8080> for the game and <http://localhost:8080/tools/editor/> for
the editor. The editor's **Save to game** button only works through this server.

## Controls

| key | action |
|---|---|
| A / D | move |
| Space | jump (release early for a short hop) |
| W / S | climb a ladder / drop; let go to slide |
| 1–5 | hotbar slots (a fresh game: sword, bow, shovel, axe, pickaxe) |
| Left click | use what you're holding — swing, shoot, dig, or place. Hold to keep digging or to paint a line of blocks |
| Right click | context menu for the tile under the cursor: open/close/bar a door, hang or draw a curtain, board a window, craft |
| I / Tab | inventory (drag to swap; the first row is the hotbar) |
| Esc | close the topmost menu, else pause |
| R | restart — only while paused or dead |

## Verifying changes

There's no test framework. Physics and world logic are verified with deterministic Node
scripts that import the modules directly (no DOM, no frame loop) — see the decisions log in
`docs/TODO.md` for why, and for the test-methodology notes about *not* driving the live game
with big time steps. Rendering and interaction are verified by hand in the browser.

## Deploy

Pushes to `main` deploy to GitHub Pages via `.github/workflows/pages.yml`. In the repo
settings, set **Pages → Source → GitHub Actions** once.
