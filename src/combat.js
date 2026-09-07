// Sword (sector hitbox with wind-up/recovery) and bow (hitscan with a presentation-only homing arrow).
import { SWORD, BOW, UI } from './config.js';
import { sectorHits, rayBox } from './physics.js';
import { hurtZombie } from './entities/zombie.js';
import { HOTBAR } from './items.js';
import { count, take } from './inventory.js';
import { spawnDrop } from './entities/drops.js';
import { showHint } from './ui/hints.js';

export function updateHotbar(state) {
  const slot = state.input.actions.slot;
  if (slot && HOTBAR[slot - 1] && HOTBAR[slot - 1] !== state.held) { state.held = HOTBAR[slot - 1]; state.hotbarAnim = UI.HOTBAR_POP; }
}

export function updateCombat(state, dt) {
  const { player: p, input, world, zombies, vision } = state;
  const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
  state.hotbarAnim = Math.max(0, state.hotbarAnim - dt);
  const use = input.actions.use && !p.dead;

  // ---- sword
  if (use && state.held === 'sword' && !state.swing) state.swing = { angle: state.aim, t: 0, hit: new Set() };
  const s = state.swing;
  if (s) {
    s.t += dt;
    if (s.t >= SWORD.WINDUP && s.t < SWORD.WINDUP + SWORD.ACTIVE) {
      for (const e of zombies) {
        if (e.stunned || s.hit.has(e) || !vision.visible.has(world.idxAtPx(e.x + e.w / 2, e.y + e.h / 2))) continue;
        if (sectorHits(pcx, pcy, s.angle, SWORD.REACH, SWORD.HALF_ARC, e)) { s.hit.add(e); hurtZombie(state, e, SWORD.DMG, pcx); }
      }
    }
    if (s.t >= SWORD.TOTAL) state.swing = null;
  }

  // ---- bow: resolve the hit now; the arrow is only a picture of it
  state.bowCool = Math.max(0, state.bowCool - dt);
  if (use && state.held === 'bow' && state.bowCool === 0) {
    if (count(state.inventory, 'arrow') <= 0) { showHint(state, 'no arrows'); state.bowCool = 0.2; }
    else {
      take(state.inventory, { arrow: 1 });
      state.bowCool = BOW.COOLDOWN;
      const dx = Math.cos(state.aim), dy = Math.sin(state.aim);
      let best = BOW.RANGE, target = null;
      for (const r of world.allSolidRects()) { const t = rayBox(pcx, pcy, dx, dy, r); if (t < best) { best = t; target = null; } }
      for (const e of zombies) { if (e.stunned) continue; const t = rayBox(pcx, pcy, dx, dy, e); if (t < best) { best = t; target = e; } }
      state.arrows.push({ ox: pcx, oy: pcy, x: pcx, y: pcy, target, ex: pcx + dx * best, ey: pcy + dy * best, t: 0, dur: Math.max(BOW.MIN_FLIGHT, best / BOW.ARROW_SPEED), angle: state.aim, arrived: false, stick: 0 });
    }
  }
  for (let i = state.arrows.length - 1; i >= 0; i--) {
    const a = state.arrows[i];
    if (!a.arrived) {
      if (a.target) { a.ex = a.target.x + a.target.w / 2; a.ey = a.target.y + a.target.h / 2; }
      a.t += dt;
      const k = Math.min(1, a.t / a.dur);
      const nx = a.ox + (a.ex - a.ox) * k, ny = a.oy + (a.ey - a.oy) * k;
      if (nx !== a.x || ny !== a.y) a.angle = Math.atan2(ny - a.y, nx - a.x);
      a.x = nx; a.y = ny;
      if (k >= 1) {
        a.arrived = true;
        if (a.target) {
          hurtZombie(state, a.target, BOW.DMG, a.ox);
          if (Math.random() < BOW.RECOVER_CHANCE) spawnDrop(state, a.ex, a.ey, 'arrow');
          state.arrows.splice(i, 1);
        }
      }
    } else {
      a.stick += dt;
      if (a.stick > BOW.ARROW_STICK) { spawnDrop(state, a.x - Math.cos(a.angle) * 8, a.y - Math.sin(a.angle) * 8, 'arrow'); state.arrows.splice(i, 1); }
    }
  }
}
