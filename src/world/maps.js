// Starter world: flat surface, dirt then stone then bedrock, trees, stone mounds, one timber house.
// Seeded so the same world comes back on restart. Nothing at runtime may assume this layout.
import { TILE, PLAYER, ZOMBIE, WORLDGEN as G } from '../config.js';
import { World } from './world.js';
import { makeTile } from './tiles.js';

function mulberry32(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

export function buildStarterMap() {
  const rnd = mulberry32(G.SEED);
  const world = new World(G.COLS, G.ROWS);
  const S = G.SURFACE;

  for (let c = 0; c < G.COLS; c++) {
    world.set(c, S, makeTile('grass'));
    for (let r = S + 1; r < G.STONE_FROM; r++) world.set(c, r, makeTile('dirt'));
    for (let r = G.STONE_FROM; r < G.ROWS - 1; r++) world.set(c, r, makeTile('stone'));
    world.set(c, G.ROWS - 1, makeTile('bedrock'));
  }

  // ---- the house: outer walls c0..c1, roof r0, ground floor on the surface
  const c0 = 60, c1 = 72, r1 = S - 1, r0 = r1 - 7;
  const LADDER_COL = c1 - 2, LOFT_ROW = r0 + 4;
  for (let r = r0 + 1; r <= r1; r++) for (let c = c0 + 1; c < c1; c++) world.set(c, r, makeTile('air', { back: 'plaster' }));
  for (let c = c0; c <= c1; c++) world.set(c, r0, makeTile('wall'));
  for (let r = r0; r <= r1; r++) { world.set(c0, r, makeTile('wall')); world.set(c1, r, makeTile('wall')); }
  for (let c = c0 + 1; c < c1; c++) if (c !== LADDER_COL) world.set(c, LOFT_ROW, makeTile('floor', { back: 'plaster' }));
  for (let r = LOFT_ROW - 2; r <= r1; r++) world.set(LADDER_COL, r, makeTile('ladder', { back: 'plaster' }));
  world.set(LADDER_COL, LOFT_ROW, makeTile('hatch', { open: true, back: 'plaster' }));
  world.set(c0, r1, makeTile('door', { insideDir: 1 }));
  world.set(c0, r1 - 1, makeTile('shutter', { insideDir: 1 }));
  world.set(c1, r1 - 1, makeTile('shutter', { insideDir: -1 }));
  world.set(c0, r0 + 2, makeTile('shutter', { insideDir: 1 }));
  world.set(c1, r0 + 2, makeTile('shutter', { insideDir: -1 }));

  const spawnCol = 10;
  const reserved = c => (c >= c0 - 3 && c <= c1 + 3) || Math.abs(c - spawnCol) < 4;

  // ---- trees: a trunk of 3–5 with a leaf blob on top. No collision, no sight blocking.
  const treeCols = [];
  for (let tries = 0; tries < 400 && treeCols.length < G.TREES; tries++) {
    const c = 4 + Math.floor(rnd() * (G.COLS - 8));
    if (reserved(c) || treeCols.some(x => Math.abs(x - c) < 4)) continue;
    treeCols.push(c);
    const h = 3 + Math.floor(rnd() * 3);
    for (let r = S - 1; r >= S - h; r--) world.set(c, r, makeTile('trunk'));
    const top = S - h;
    for (let dr = -2; dr <= 0; dr++) for (let dc = -2; dc <= 2; dc++) {
      if (Math.abs(dc) === 2 && dr !== -1) continue;             // knock the corners off
      const cc = c + dc, rr = top + dr;
      if (world.inBounds(cc, rr) && !world.get(cc, rr)) world.set(cc, rr, makeTile('leaf'));
    }
  }

  // ---- stone mounds on the surface: 3 wide, 2 tall. Solid.
  for (let tries = 0, made = 0; tries < 200 && made < G.STONE_MOUNDS; tries++) {
    const c = 4 + Math.floor(rnd() * (G.COLS - 8));
    if (reserved(c) || treeCols.some(x => Math.abs(x - c) < 5)) continue;
    let clear = true;
    for (let dc = -1; dc <= 1; dc++) for (let dr = -2; dr <= -1; dr++) if (world.get(c + dc, S + dr)) clear = false;
    if (!clear) continue;
    for (let dc = -1; dc <= 1; dc++) { world.set(c + dc, S - 1, makeTile('stone')); if (dc === 0) world.set(c, S - 2, makeTile('stone')); }
    made++;
  }

  // ---- zombies: spread along the surface, none near the spawn
  const zombieSpawns = [];
  for (let c = 24; c < G.COLS - 4; c += 7) zombieSpawns.push({ x: c * TILE + (rnd() - 0.5) * TILE * 3, y: S * TILE - ZOMBIE.H });

  return { world, playerSpawn: { x: spawnCol * TILE, y: S * TILE - PLAYER.H }, zombieSpawns };
}
