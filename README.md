# Medieval Zombie Survival

A side-scrolling survival sandbox in a medieval world overrun by the dead. Browser-native:
vanilla JS ES modules, Canvas 2D, no engine, no bundler.

- **Design**: [docs/DESIGN.md](docs/DESIGN.md)
- **Plan**: [docs/TODO.md](docs/TODO.md)

## Run locally

Any static file server works (ES modules won't load from `file://`):

```bash
python -m http.server 8080
```

then open <http://localhost:8080>.

## Controls

| key | action |
|---|---|
| A / D | move |
| Space | jump (release early for a short hop) |
| W / S | climb a ladder / drop; let go to slide |
| 1 / 2 | hotbar: sword / bow |
| Left click | use the selected item |
| Right click | context menu for the tile under the cursor |
| R | restart |
| Esc | close menu |

## Deploy

Pushes to `main` deploy to GitHub Pages via `.github/workflows/pages.yml`. In the repo
settings, set **Pages → Source → GitHub Actions** once.
