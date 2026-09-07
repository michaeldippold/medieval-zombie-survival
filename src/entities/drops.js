// Items lying in the world. They fall, settle, and are picked up by walking over them.
import { PHYSICS, DROPS } from '../config.js';
import { moveBody, overlap } from '../physics.js';
import { give } from '../inventory.js';
import { showHint } from '../ui/hints.js';

export function spawnDrop(state, x, y, id, n = 1, vx = (Math.random() - 0.5) * 2 * DROPS.POP_VX) {
  state.drops.push({
    x: x - DROPS.SIZE / 2, y: y - DROPS.SIZE / 2, w: DROPS.SIZE, h: DROPS.SIZE,
    vx, vy: DROPS.POP_VY, onGround: false, hitX: false,
    id, n, age: 0, retry: 0,
  });
}

export function updateDrops(state, dt) {
  const { world, player: p, drops } = state;
  const pad = DROPS.PICKUP_PAD;
  const reach = { x: p.x - pad, y: p.y - pad, w: p.w + pad * 2, h: p.h + pad * 2 };
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    d.age += dt; d.retry = Math.max(0, d.retry - dt);
    d.vy = Math.min(PHYSICS.MAX_FALL, d.vy + PHYSICS.GRAV * dt);
    d.vx *= Math.max(0, 1 - DROPS.FRICTION * dt);
    moveBody(d, world.solidsNear(d), dt);
    if (p.dead || d.age < 0.25 || d.retry > 0 || !overlap(d, reach)) continue;
    const left = give(state.inventory, d.id, d.n);
    if (left === 0) drops.splice(i, 1);
    else { d.n = left; d.retry = 1.0; showHint(state, 'inventory full'); }   // no free slot: leave it lying there
  }
}
