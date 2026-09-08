// Starter world: flat surface, dirt then stone then bedrock, stone mounds, trees, stone veins,
// a few natural caves, one timber house. Seeded so the same world comes back on restart.
// Nothing at runtime may assume this layout.
import { TILE, PLAYER, ZOMBIE, WORLDGEN as G } from '../config.js';
import { World } from './world.js';
import { makeTile } from './tiles.js';

function mulberry32(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

export function buildStarterMap() {
  const rnd = mulberry32(G.SEED);
  const ri = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
  const world = new World(G.COLS, G.ROWS);
  const S = G.SURFACE;

  // ---- terrain
  world.surface.fill(S);
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
  const surfaceClear = (c, w, h) => { for (let dc = 0; dc < w; dc++) for (let dr = 1; dr <= h; dr++) if (!world.inBounds(c + dc, S - dr) || world.get(c + dc, S - dr)) return false; return true; };

  // ---- stone mounds on the surface: 3 wide, a uniform 2 tall, solid. Placed before trees so
  // trees route around them. Deliberately never 3 tall: a natural mound is meant to be a hill a
  // zombie can scramble over (ZOMBIE.SCRAMBLE_MAX = 2), not an unearned wall the player never
  // built — a 3-tall peak here would jam anything chasing straight into it, for free.
  for (let tries = 0, made = 0; tries < 300 && made < G.STONE_MOUNDS; tries++) {
    const c = ri(3, G.COLS - 6);
    if (reserved(c) || reserved(c + 2) || !surfaceClear(c - 1, 5, 2)) continue;
    for (let dc = 0; dc < 3; dc++) { world.set(c + dc, S - 1, makeTile('stone')); world.set(c + dc, S - 2, makeTile('stone')); }
    made++;
  }

  // ---- trees: a trunk of 3–5 (some 2-wide) with a leaf blob on top. No collision, no sight
  // blocking. Each trunk tile fells to one log; a 2-wide tree is a bigger, blockier silhouette
  // and roughly double the wood for the same footprint of exploring.
  const treeCols = [];
  for (let tries = 0; tries < 400 && treeCols.length < G.TREES; tries++) {
    const wide = rnd() < G.WIDE_TREE_CHANCE;
    const tw = wide ? 2 : 1;                     // trunk width in columns
    const c = ri(4, G.COLS - 6 - tw);
    if (reserved(c) || (tw > 1 && reserved(c + 1)) || treeCols.some(x => Math.abs(x - c) < 4 + tw) || !surfaceClear(c - 2, tw + 4, 8)) continue;
    treeCols.push(c);
    const h = ri(3, 5);
    for (let dc = 0; dc < tw; dc++) for (let r = S - 1; r >= S - h; r--) world.set(c + dc, r, makeTile('trunk'));
    const top = S - h, leafR = tw + 1;           // leaf blob spans 2 past the trunk on either side
    for (let dr = -2; dr <= 0; dr++) for (let dc = -2; dc <= leafR; dc++) {
      if ((dc === -2 || dc === leafR) && dr !== -1) continue;    // knock the corners off
      const cc = c + dc, rr = top + dr;
      if (world.inBounds(cc, rr) && !world.get(cc, rr)) world.set(cc, rr, makeTile('leaf'));
    }
  }

  // ---- stone veins in the dirt layer: small blobs, another way to find stone without a mound
  for (let i = 0; i < G.STONE_VEINS; i++) {
    const c = ri(1, G.COLS - 5), r = ri(S + 2, G.STONE_FROM - 3), w = ri(2, 4), h = ri(1, 2);
    for (let dc = 0; dc < w; dc++) for (let dr = 0; dr < h; dr++) {
      const t = world.get(c + dc, r + dr);
      if (t && t.kind === 'dirt') world.set(c + dc, r + dr, makeTile('stone'));
    }
  }

  // ---- natural caves: air pockets with an earth backwall. Something to find; later, something to find things in.
  for (let i = 0; i < G.CAVES; i++) {
    const cc = ri(6, G.COLS - 7), cr = ri(S + 4, G.STONE_FROM + 2), rx = ri(2, 4), ry = ri(1, 2);
    if (cc >= c0 - 4 && cc <= c1 + 4) continue;
    for (let dc = -rx; dc <= rx; dc++) for (let dr = -ry; dr <= ry; dr++) {
      if ((dc * dc) / (rx * rx) + (dr * dr) / (ry * ry) > 1) continue;
      const t = world.get(cc + dc, cr + dr);
      if (t && (t.kind === 'dirt' || t.kind === 'stone')) world.set(cc + dc, cr + dr, makeTile('air', { back: 'earth' }));
    }
  }

  // ---- zombies: spread along the surface, never near the player spawn or inside the house
  const zombieSpawns = [];
  for (let c = 24; c < G.COLS - 4; c += 7) {
    if (reserved(c)) continue;
    zombieSpawns.push({ x: c * TILE + (rnd() - 0.5) * TILE * 3, y: S * TILE - ZOMBIE.H });
  }

  return { world, playerSpawn: { x: spawnCol * TILE, y: S * TILE - PLAYER.H }, zombieSpawns };
}
