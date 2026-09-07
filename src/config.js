// Every tunable number in the game lives here. A literal in a system file is a bug.
// See docs/DESIGN.md for what each group means.

export const TILE = 40;

export const VIEW = { W: 960, H: 560 };

export const PHYSICS = { GRAV: 1800, MAX_FALL: 1000 };

export const PLAYER = {
  W: 26, H: 36,
  RUN_SPEED: 260, JUMP_V: -640, JUMP_CUT: -220,
  GROUND_BLEND: 18, AIR_BLEND: 8,
  CLIMB_SPEED: 180, SLIDE_SPEED: 70, LADDER_JUMP_GRACE: 0.3,
  HP: 100, HURT_FLASH: 0.25,
  REACH: 110,
};

export const INFECTION = { CHANCE: 0.25, TIME: 90, FEVER_AT: 0.6, FEVER_DRAIN: 0.4 };

export const ZOMBIE = {
  W: 30, H: 30, HP: 3,
  SPEED_MIN: 55, SPEED_VAR: 70, CHASE_MULT: 1.3, CLIMB_SPEED: 55, CLIMB_DRIFT: 40,
  SIGHT_X: 380, SIGHT_Y: 260, MEMORY: 6,
  ATTACK_PERIOD: 0.9, ATTACK_DMG: 20, LUNGE: 0.15,
  CONTACT_DMG: 20, CONTACT_CD: 0.8, KNOCKBACK_X: 240, KNOCKBACK_Y: -200,
  STAGGER: 0.22, STAGGER_SPEED: 160,
  DEATH_DUR: 0.3, CORPSE_LINGER: 2.5, CORPSE_FADE: 1.0,
  WANDER_MIN: 0.8, WANDER_VAR: 2.2,
};

export const ATTENTION = { RANGE: 900, LINGER: 5 };

export const SWORD = { REACH: 78, HALF_ARC: 0.95, WINDUP: 0.15, ACTIVE: 0.10, RECOVER: 0.35, DMG: 1 };
SWORD.TOTAL = SWORD.WINDUP + SWORD.ACTIVE + SWORD.RECOVER;

export const BOW = { RANGE: 800, COOLDOWN: 0.6, ARROW_SPEED: 1100, ARROW_STICK: 0.5, DMG: 2, MIN_FLIGHT: 0.08 };

export const PORTAL = { BAR_HP: 100, MAX_BARS: 2 };

export const UI = { HOTBAR_POP: 0.18, HOTBAR_SLOT: 48, HOTBAR_GAP: 6 };

export const COLORS = {
  sky: '#8fc5f0', cloud: 'rgba(255,255,255,0.85)',
  dirt: '#7a4f2a', grass: '#5cae3a', grassShade: '#4b9430', stone: '#7b7f86', bedrock: '#2b2d31',
  wall: '#c9a978', wallEdge: 'rgba(0,0,0,0.18)', plaster: '#e8d8b5', plasterStripe: 'rgba(0,0,0,0.05)', earthBack: '#4a3320',
  wood: '#8a5a30', woodDark: '#5a3d1e', frame: '#6b4a24', doorLeaf: '#a5703a', opening: '#8fc5f0',
  player: '#9aa0a8', playerHelm: '#6e757d', playerVisor: '#2b2f33', playerHurt: '#ff8a80', playerDead: '#5b6270',
  zombies: ['#4f9a3a', '#5aa843', '#478f35', '#63b04a'], zombieBrow: '#2f5a22', zombieEye: '#1d1f1e', corpse: '#6c7173', wound: '#7a1f1f',
  accent: '#f2b134', alert: '#e63946', fog: 'rgba(12,14,22,0.84)',
  arrowShaft: '#6b4a24', arrowHead: '#cfd4da', arrowFletch: '#eef1f4',
  hud: 'rgba(20,26,38,0.55)', hudText: 'rgba(20,26,38,0.7)', crosshair: 'rgba(20,26,38,0.75)',
};
