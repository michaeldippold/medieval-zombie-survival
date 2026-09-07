// Hand-built starter world. Nothing at runtime may assume this layout; it is data.
import { TILE, PLAYER, ZOMBIE } from '../config.js';
import { World } from './world.js';
import { makeTile } from './tiles.js';

export function buildStarterMap() {
  const world = new World(60, 14);
  const GROUND = 12;
  for (let c = 0; c < world.cols; c++) { world.set(c, GROUND, makeTile('grass')); world.set(c, GROUND + 1, makeTile('dirt')); }

  // A two-storey timber house: outer walls c0..c1, roof r0, ground floor sits on GROUND.
  const c0 = 30, c1 = 42, r0 = 4, r1 = GROUND - 1;
  const LADDER_COL = 40, LOFT_ROW = 8;
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

  return {
    world,
    playerSpawn: { x: 100, y: GROUND * TILE - PLAYER.H },
    zombieSpawns: [650, 850, 1000, 1350, 1550, 1700, 1850, 2000, 2150, 2300].map(x => ({ x, y: GROUND * TILE - ZOMBIE.H })),
  };
}
