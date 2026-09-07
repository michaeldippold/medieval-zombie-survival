// Zombie AI and collision rules. See DESIGN §8.
import { TILE, PHYSICS, ZOMBIE, ATTENTION, COLORS } from '../config.js';
import { moveBody, overlap, onClimbable, tryClimb } from '../physics.js';
import { isPortal, isSolid, damageTile } from '../world/tiles.js';
import { hurtPlayer } from './player.js';

let paletteIdx = 0;
export function createZombie(x, y) {
  return {
    x, y, w: ZOMBIE.W, h: ZOMBIE.H, vx: 0, vy: 0, onGround: false, hitX: false,
    dir: Math.random() < 0.5 ? -1 : 1, speed: ZOMBIE.SPEED_MIN + Math.random() * ZOMBIE.SPEED_VAR,
    timer: 1 + Math.random() * 2, color: COLORS.zombies[paletteIdx++ % COLORS.zombies.length],
    hp: ZOMBIE.HP, stunned: false, flash: 0, death: 0, dead: 0,
    chasing: false, lastSeen: null, sees: false, attackT: 0, lunge: 0, hitCd: 0,
    climbing: false, stagger: 0, kbDir: 0,
  };
}

export function hurtZombie(state, e, dmg, fromX) {
  if (e.stunned) return;
  e.hp -= dmg; e.flash = 0.1;
  e.stagger = ZOMBIE.STAGGER; e.kbDir = Math.sign((e.x + e.w / 2) - fromX) || 1;
  if (e.hp <= 0) { e.stunned = true; e.vx = 0; e.death = ZOMBIE.DEATH_DUR; state.kills++; }
}

// The solid door/shutter/trapdoor directly in front of a blocked zombie, if any. Zombies reach one tile up.
function portalInFront(world, e) {
  const c = world.colOf(e.vx > 0 ? e.x + e.w + 2 : e.x - 2);
  for (let r = world.rowOf(e.y) - 1; r <= world.rowOf(e.y + e.h - 1); r++) {
    const t = world.get(c, r);
    if (isPortal(t) && isSolid(t)) return t;
  }
  return null;
}

function nearestClimbColumn(world, x) {
  let best = null, bestD = Infinity;
  for (const c of world.climbableColumns()) { const d = Math.abs(c * TILE + TILE / 2 - x); if (d < bestD) { bestD = d; best = c; } }
  return best;
}

export function updateZombies(state, dt) {
  const { world, player, zombies, vision } = state;
  const living = zombies.filter(z => !z.stunned);
  const pcx = player.x + player.w / 2, pcy = player.y + player.h / 2;
  let anySees = false;

  for (const e of zombies) {
    e.hitCd = Math.max(0, e.hitCd - dt); e.lunge = Math.max(0, e.lunge - dt);
    e.flash = Math.max(0, e.flash - dt); e.death = Math.max(0, e.death - dt);
    e.stagger = Math.max(0, e.stagger - dt);
    e.climbing = false;
    const ec = e.x + e.w / 2, ecy = e.y + e.h / 2;

    if (e.stunned) { e.dead += dt; }
    else {
      // ---- senses
      const dxp = pcx - ec;
      const canSee = !player.dead && vision.visible.has(world.idxAtPx(ec, ecy)) && Math.abs(dxp) < ZOMBIE.SIGHT_X && Math.abs(pcy - ecy) < ZOMBIE.SIGHT_Y;
      e.sees = canSee; if (canSee) anySees = true;
      if (canSee) e.lastSeen = { x: pcx, y: pcy, t: 0 };
      else if (e.lastSeen) {
        e.lastSeen.t += dt;
        const arrived = Math.abs(e.lastSeen.x - ec) < 12 && Math.abs(e.lastSeen.y - ecy) < TILE;
        if (e.lastSeen.t > ZOMBIE.MEMORY || arrived) e.lastSeen = null;
      }
      if (!e.lastSeen && state.attention && Math.abs(state.attention.x - ec) < ATTENTION.RANGE) {
        e.lastSeen = { x: state.attention.x, y: state.attention.y, t: ZOMBIE.MEMORY - 2 };
      }

      // ---- decide
      if (e.stagger > 0) { e.vx = e.kbDir * ZOMBIE.STAGGER_SPEED; e.chasing = !!e.lastSeen; }
      else if (e.lastSeen) {
        e.chasing = true;
        const targetAbove = e.lastSeen.y < e.y + e.h - TILE;      // climb until our feet are level with the target
        let goalX = e.lastSeen.x;
        if (targetAbove) { const col = nearestClimbColumn(world, ec); if (col !== null) goalX = col * TILE + TILE / 2; }
        const d = goalX - ec;
        if (targetAbove && Math.abs(d) < 10 && onClimbable(world, e)) {
          e.climbing = true; e.dir = 0;
          e.vx = Math.max(-ZOMBIE.CLIMB_DRIFT, Math.min(ZOMBIE.CLIMB_DRIFT, d * 8));
          const above = world.tileAtPx(ec, e.y - 2);
          if (isPortal(above) && isSolid(above)) {                  // a trapdoor overhead: pound on it
            e.vy = 0; e.attackT += dt;
            if (e.attackT >= ZOMBIE.ATTACK_PERIOD) { e.attackT = 0; e.lunge = ZOMBIE.LUNGE; damageTile(above, ZOMBIE.ATTACK_DMG); world.touch(); }
          } else if (isSolid(above)) e.vy = 0;
          else e.vy = -ZOMBIE.CLIMB_SPEED;
        } else {
          e.dir = Math.abs(d) < 6 ? 0 : Math.sign(d);
          e.vx = e.dir * e.speed * (canSee ? ZOMBIE.CHASE_MULT : 1);
        }
      } else {
        e.chasing = false;
        e.timer -= dt;
        if (e.timer <= 0) { e.timer = ZOMBIE.WANDER_MIN + Math.random() * ZOMBIE.WANDER_VAR; const r = Math.random(); e.dir = r < 0.35 ? -1 : r < 0.7 ? 1 : 0; }
        e.vx = e.dir * e.speed;
      }
    }

    // ---- move. A climber is on the rungs: nothing blocks it and nothing stands on it except tiles and the player.
    if (!e.climbing) e.vy = Math.min(PHYSICS.MAX_FALL, e.vy + PHYSICS.GRAV * dt);
    const others = e.climbing ? [] : living.filter(o => o !== e && !o.climbing);
    moveBody(e, world.solidsNear(e).concat(e.stunned ? [] : [player, ...others]), dt);

    if (e.stunned) continue;

    // ---- blocked: attack the portal in front, climb a step, or turn around
    if (!e.climbing && e.hitX && e.vx !== 0 && e.stagger === 0) {
      const t = e.chasing ? portalInFront(world, e) : null;
      if (t) {
        e.attackT += dt;
        if (e.attackT >= ZOMBIE.ATTACK_PERIOD) { e.attackT = 0; e.lunge = ZOMBIE.LUNGE; damageTile(t, ZOMBIE.ATTACK_DMG); world.touch(); }
      } else if (e.chasing) { e.attackT = 0; if (e.onGround || onClimbable(world, e)) tryClimb(world, e); }
      else { e.attackT = 0; e.dir *= -1; e.timer = 0.5 + Math.random(); }
    } else if (!e.climbing) e.attackT = 0;

    // ---- contact
    if (!player.dead && e.hitCd === 0 && overlap({ x: e.x - 3, y: e.y - 3, w: e.w + 6, h: e.h + 6 }, player)) {
      e.hitCd = ZOMBIE.CONTACT_CD;
      hurtPlayer(state, ZOMBIE.CONTACT_DMG, ec);
    }
  }

  for (let i = zombies.length - 1; i >= 0; i--) if (zombies[i].dead > ZOMBIE.CORPSE_LINGER + ZOMBIE.CORPSE_FADE) zombies.splice(i, 1);

  if (anySees) state.attention = { x: pcx, y: pcy, t: 0 };
  else if (state.attention) { state.attention.t += dt; if (state.attention.t > ATTENTION.LINGER) state.attention = null; }
}
