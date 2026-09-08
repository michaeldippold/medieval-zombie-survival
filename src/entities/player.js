import { PHYSICS, PLAYER, INFECTION } from '../config.js';
import { moveBody, onClimbable } from '../physics.js';
import { contactDamage } from '../world/tiles.js';

export function createPlayer(x, y) {
  return {
    x, y, w: PLAYER.W, h: PLAYER.H, vx: 0, vy: 0, onGround: false, hitX: false, facing: 1,
    hp: PLAYER.HP, dead: false, cause: '', hurt: 0, ladderJump: 0, hazardCd: 0,
    infected: false, infectT: 0,
  };
}

export function updatePlayer(state, dt) {
  const { player: p, input, world } = state;
  p.hurt = Math.max(0, p.hurt - dt);
  if (p.dead) return;

  const target = input.axis() * PLAYER.RUN_SPEED;
  const blend = p.onGround ? PLAYER.GROUND_BLEND : PLAYER.AIR_BLEND;
  p.vx += (target - p.vx) * Math.min(1, dt * blend);
  if (Math.abs(p.vx) < 2 && target === 0) p.vx = 0;

  if (input.actions.jumpReleased && p.vy < PLAYER.JUMP_CUT) p.vy = PLAYER.JUMP_CUT;

  p.ladderJump = Math.max(0, p.ladderJump - dt);
  if (onClimbable(world, p) && p.ladderJump === 0) {
    // Minecraft rule: climb on W, drop on S, otherwise slide; Space jumps off with a short grace
    if (input.actions.jump) { p.vy = PLAYER.JUMP_V; p.ladderJump = PLAYER.LADDER_JUMP_GRACE; }
    else p.vy = input.held('KeyW', 'ArrowUp') ? -PLAYER.CLIMB_SPEED : input.held('KeyS', 'ArrowDown') ? PLAYER.CLIMB_SPEED : PLAYER.SLIDE_SPEED;
  } else {
    if (input.actions.jump && p.onGround) p.vy = PLAYER.JUMP_V;
    p.vy = Math.min(PHYSICS.MAX_FALL, p.vy + PHYSICS.GRAV * dt);
  }

  const living = state.zombies.filter(z => !z.stunned);
  moveBody(p, world.solidsNear(p).concat(living), dt);

  // Environmental hazards (spikes, ...): sampled at the feet, not the whole body, so you have
  // to actually be standing in it. Its own cooldown — this is not a bite, so no infection roll.
  p.hazardCd = Math.max(0, p.hazardCd - dt);
  if (p.hazardCd === 0) {
    const hazard = contactDamage(world.tileAtPx(p.x + p.w / 2, p.y + p.h - 2));
    if (hazard) { p.hp -= hazard.dmg; p.hurt = PLAYER.HURT_FLASH; p.hazardCd = hazard.cooldown; if (p.hp <= 0) kill(p, 'Impaled.'); }
  }

  if (p.infected) {
    p.infectT += dt;
    if (p.infectT / INFECTION.TIME > INFECTION.FEVER_AT) p.hp -= dt * INFECTION.FEVER_DRAIN;
    if (p.infectT >= INFECTION.TIME || p.hp <= 0) kill(p, 'The bite took you.');
  }
}

export function hurtPlayer(state, dmg, fromX) {
  const p = state.player;
  if (p.dead) return;
  p.hp -= dmg; p.hurt = PLAYER.HURT_FLASH;
  if (!p.infected && Math.random() < INFECTION.CHANCE) { p.infected = true; p.infectT = 0; }
  p.vx = Math.sign((p.x + p.w / 2) - fromX || 1) * 240; p.vy = Math.min(p.vy, -200);
  if (p.hp <= 0) kill(p, 'Torn apart.');
}

export const isFeverish = p => p.infected && p.infectT / INFECTION.TIME > INFECTION.FEVER_AT;

function kill(p, cause) { p.hp = 0; p.dead = true; p.cause = cause; }
