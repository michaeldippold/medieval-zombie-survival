// Zombie AI and collision rules. See DESIGN §8.
import { TILE, PHYSICS, ZOMBIE, ATTENTION, COLORS } from '../config.js';
import { moveBody, overlap, onClimbable, tryClimb } from '../physics.js';
import { isPortal, isSolid, damageTile, canZombieDamage, airAfter } from '../world/tiles.js';
import { hurtPlayer } from './player.js';

let paletteIdx = 0;
export function createZombie(x, y) {
  return {
    x, y, w: ZOMBIE.W, h: ZOMBIE.H, vx: 0, vy: 0, onGround: false, hitX: false,
    dir: Math.random() < 0.5 ? -1 : 1, speed: ZOMBIE.SPEED_MIN + Math.random() * ZOMBIE.SPEED_VAR,
    timer: 1 + Math.random() * 2, color: COLORS.zombies[paletteIdx++ % COLORS.zombies.length],
    hp: ZOMBIE.HP, stunned: false, flash: 0, death: 0, dead: 0,
    chasing: false, lastSeen: null, lastGroundedY: null, sees: false, attackT: 0, lunge: 0, hitCd: 0,
    climbing: false, scrambling: false, scramble: null, stagger: 0, kbDir: 0,
  };
}

export function hurtZombie(state, e, dmg, fromX) {
  if (e.stunned) return;
  e.hp -= dmg; e.flash = 0.1; e.scramble = null;
  e.stagger = ZOMBIE.STAGGER; e.kbDir = Math.sign((e.x + e.w / 2) - fromX) || 1;
  if (e.hp <= 0) { e.stunned = true; e.vx = 0; e.death = ZOMBIE.DEATH_DUR; state.kills++; }
}

// The nearest solid, damageable tile (a door, a window, a trapdoor, or a built wall/floor) directly in
// front of a blocked zombie, if any. Zombies reach one tile up. Earth and trees are never
// returned here (canZombieDamage is false for them) — that's what makes them un-diggable.
function attackableInFront(world, e) {
  const c = world.colOf(e.vx > 0 ? e.x + e.w + 2 : e.x - 2);
  for (let r = world.rowOf(e.y) - 1; r <= world.rowOf(e.y + e.h - 1); r++) {
    const t = world.get(c, r);
    if (t && isSolid(t) && canZombieDamage(t)) return { t, c, r };
  }
  return null;
}

// Height of the (non-attackable, e.g. dirt/stone) obstacle directly in front, in tiles, and
// where scrambling onto it would put the zombie: standing on top of the stack, in its column
// (not just elevated in place — with vx frozen during the climb there's nothing left to carry
// it sideways, so the landing spot has to already overlap solid ground beneath it).
function obstacleProfile(world, e) {
  const dir = e.vx > 0 ? 1 : -1;
  const c = world.colOf(dir > 0 ? e.x + e.w + 2 : e.x - 2);
  const baseR = world.rowOf(e.y + e.h - 1);
  if (!isSolid(world.get(c, baseR))) return { height: 0 };
  let h = 1;
  while (isSolid(world.get(c, baseR - h))) h++;
  return { height: h, landY: (baseR - h + 1) * TILE - e.h, landX: dir > 0 ? c * TILE : c * TILE + TILE - e.w };
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
    if (e.stagger > 0) e.scramble = null;         // a hit knocks it back down
    e.climbing = false; e.scrambling = false;
    const ec = e.x + e.w / 2, ecy = e.y + e.h / 2;

    if (e.stunned) { e.dead += dt; }
    else {
      // ---- senses
      const dxp = pcx - ec;
      const canSee = !player.dead && vision.visible.has(world.idxAtPx(ec, ecy)) && Math.abs(dxp) < ZOMBIE.SIGHT_X && Math.abs(pcy - ecy) < ZOMBIE.SIGHT_Y;
      e.sees = canSee; if (canSee) anySees = true;
      if (canSee) {
        e.lastSeen = { x: pcx, y: pcy, t: 0 };
        // Only a grounded sighting counts as "they're on a different floor" — a mid-air jump
        // arc clears a tile of height easily and used to send zombies straight to the nearest
        // ladder in the world (usually the house's, wherever that was) every time the player
        // jumped, then back again on landing. Coast on the last grounded reading through a jump.
        if (player.onGround) e.lastGroundedY = pcy;
      } else if (e.lastSeen) {
        e.lastSeen.t += dt;
        const arrived = Math.abs(e.lastSeen.x - ec) < 12 && Math.abs(e.lastSeen.y - ecy) < TILE;
        if (e.lastSeen.t > ZOMBIE.MEMORY || arrived) { e.lastSeen = null; e.lastGroundedY = null; }
      }
      if (!e.lastSeen && state.attention && Math.abs(state.attention.x - ec) < ATTENTION.RANGE) {
        e.lastSeen = { x: state.attention.x, y: state.attention.y, t: ZOMBIE.MEMORY - 2 };
        e.lastGroundedY = null;   // attention's y isn't known to be grounded — assume same-level until proven otherwise
      }

      // ---- decide
      if (e.stagger > 0) { e.vx = e.kbDir * ZOMBIE.STAGGER_SPEED; e.chasing = !!e.lastSeen; }
      else if (e.lastSeen) {
        e.chasing = true;
        const targetAbove = e.lastGroundedY != null && e.lastGroundedY < e.y + e.h - TILE;   // climb until our feet are level with the target
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

    // ---- scrambling: clinging to a too-tall obstacle, visibly climbing it slowly (y eases from
    // where it grabbed on to the top of the stack — it used to just wait, then teleport, which
    // read as "stuck" rather than "climbing"). Overrides this frame's decided vx; x stays put
    // (still pressed against the face) until the very end, when it steps onto the ledge.
    if (e.scramble) {
      e.scrambling = true; e.vx = 0;          // stays true for the rest of this frame even on completion,
      e.scramble.t += dt;                     // so gravity doesn't nudge it the instant it lands
      const k = Math.min(1, e.scramble.t / ZOMBIE.SCRAMBLE_TIME);
      e.y = e.scramble.startY + (e.scramble.landY - e.scramble.startY) * k;
      if (k >= 1) { e.x = e.scramble.landX; e.y = e.scramble.landY; e.vy = 0; e.scramble = null; }
    }

    // ---- move. A climber (ladder or scramble) is on a surface: nothing blocks it and nothing
    // stands on it except tiles and the player.
    if (!e.climbing && !e.scrambling) e.vy = Math.min(PHYSICS.MAX_FALL, e.vy + PHYSICS.GRAV * dt);
    const others = (e.climbing || e.scrambling) ? [] : living.filter(o => o !== e && !o.climbing && !o.scrambling);
    moveBody(e, world.solidsNear(e).concat(e.stunned ? [] : [player, ...others]), dt);

    if (e.stunned) continue;

    // ---- blocked: attack anything damageable in front, climb a 1-tile step, scramble a 2-tile
    // one (slowly — DESIGN §8.4b), or turn around. A 3+ obstacle that isn't attackable just holds.
    if (!e.climbing && !e.scrambling && e.hitX && e.vx !== 0 && e.stagger === 0) {
      const hit = e.chasing ? attackableInFront(world, e) : null;
      if (hit) {
        e.attackT += dt;
        if (e.attackT >= ZOMBIE.ATTACK_PERIOD) {
          e.attackT = 0; e.lunge = ZOMBIE.LUNGE;
          const result = damageTile(hit.t, ZOMBIE.ATTACK_DMG);
          if (result === 'broke' && !isPortal(hit.t)) world.set(hit.c, hit.r, airAfter(hit.t, world.isUnderground(hit.c, hit.r)));
          world.touch();
        }
      } else if (e.chasing) {
        e.attackT = 0;
        const climbed = (e.onGround || onClimbable(world, e)) && tryClimb(world, e);
        if (!climbed) {
          const profile = obstacleProfile(world, e);
          if (profile.height >= 2 && profile.height <= ZOMBIE.SCRAMBLE_MAX) e.scramble = { t: 0, startY: e.y, landX: profile.landX, landY: profile.landY };
        }
      } else { e.attackT = 0; e.dir *= -1; e.timer = 0.5 + Math.random(); }
    } else if (!e.climbing && !e.scrambling) e.attackT = 0;

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
