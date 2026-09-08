// Every tunable number in the game lives here. A literal in a system file is a bug.
// See docs/DESIGN.md for what each group means.

// Tile size 40 -> 32 and viewport 960x560 -> 1280x720: DESIGN §6.1, the two-tall scale change.
// Every px-based speed/reach/sight below is x0.8 (32/40) to keep its feel in TILE-relative
// terms identical to before; PLAYER/ZOMBIE dimensions are the new two-tall bodies outright,
// not a x0.8 rescale of the old ones (see DESIGN §5.1/§6.1 for why the two are different).
export const TILE = 32;

export const VIEW = { W: 1280, H: 720, CAMERA_Y_BIAS: 0.62 };   // bias > 0.5 keeps more sky above the player

export const PHYSICS = { GRAV: 1440, MAX_FALL: 800 };

export const WORLDGEN = { COLS: 120, ROWS: 40, SURFACE: 24, STONE_FROM: 32, TREES: 16, WIDE_TREE_CHANCE: 0.3, STONE_MOUNDS: 7, STONE_VEINS: 40, CAVES: 6, SEED: 7 };

export const PLAYER = {
  W: 24, H: 60,
  RUN_SPEED: 208, JUMP_V: -512, JUMP_CUT: -176,
  GROUND_BLEND: 18, AIR_BLEND: 8,
  CLIMB_SPEED: 144, SLIDE_SPEED: 56, LADDER_JUMP_GRACE: 0.3,
  HP: 100, HURT_FLASH: 0.25,
  REACH: 88,
};

export const INFECTION = { CHANCE: 0.25, TIME: 90, FEVER_AT: 0.6, FEVER_DRAIN: 0.4 };

export const ZOMBIE = {
  W: 26, H: 60, HP: 3,
  SPEED_MIN: 44, SPEED_VAR: 56, CHASE_MULT: 1.3, CLIMB_SPEED: 44, CLIMB_DRIFT: 32,
  SIGHT_X: 304, SIGHT_Y: 208, MEMORY: 6,
  ATTACK_PERIOD: 0.9, ATTACK_DMG: 20, LUNGE: 0.15,
  CONTACT_DMG: 20, CONTACT_CD: 0.8, KNOCKBACK_X: 192, KNOCKBACK_Y: -160,
  STAGGER: 0.22, STAGGER_SPEED: 128,
  DEATH_DUR: 0.3, CORPSE_LINGER: 2.5, CORPSE_FADE: 1.0,
  WANDER_MIN: 0.8, WANDER_VAR: 2.2,
  SCRAMBLE_MAX: 2, SCRAMBLE_TIME: 5,   // a stack this tall (in tiles) of non-attackable blocks can be scrambled over, this slowly; taller is impossible
};

export const ATTENTION = { RANGE: 720, LINGER: 5 };

export const SWORD = { REACH: 62, HALF_ARC: 0.95, WINDUP: 0.15, ACTIVE: 0.10, RECOVER: 0.35, DMG: 1 };
SWORD.TOTAL = SWORD.WINDUP + SWORD.ACTIVE + SWORD.RECOVER;

export const BOW = { RANGE: 640, COOLDOWN: 0.6, ARROW_SPEED: 880, ARROW_STICK: 0.5, DMG: 2, MIN_FLIGHT: 0.08, RECOVER_CHANCE: 0.6 };

export const TOOLS = { COOLDOWN: 0.3 };

// One stack per item id, stacks are unlimited; the slot count is the limit. Slots 0..HOTBAR_SIZE-1
// ARE the hotbar (see items.js STARTER_LOADOUT) — there is no separate hotbar array.
export const INVENTORY = { SLOTS: 20, COLS: 5, HOTBAR_SIZE: 5 };

export const DROPS = { SIZE: 12, FRICTION: 6, PICKUP_PAD: 6, POP_VX: 60, POP_VY: -220 };

export const PORTAL = { BAR_HP: 100, MAX_BARS: 2 };

export const UI = { HOTBAR_POP: 0.18, HOTBAR_SLOT: 48, HOTBAR_GAP: 6, HINT_TIME: 1.6 };

export const COLORS = {
  sky: '#8fc5f0', cloud: 'rgba(255,255,255,0.85)',
  dirt: '#7a4f2a', grass: '#5cae3a', grassShade: '#4b9430', stone: '#8a8d93', stoneEdge: 'rgba(0,0,0,0.22)', bedrock: '#2b2d31',
  trunk: '#6b4a24', trunkShade: '#54391a', leaf: '#3f8f3a', leafShade: '#2f7a2c',
  wall: '#c9a978', wallEdge: 'rgba(0,0,0,0.18)', wallStone: '#9a9da3', wallStoneEdge: 'rgba(0,0,0,0.3)',
  plaster: '#e8d8b5', plasterStripe: 'rgba(0,0,0,0.05)', earthBack: '#4a3320',
  wood: '#8a5a30', woodDark: '#5a3d1e', frame: '#6b4a24', doorLeaf: '#a5703a', opening: '#8fc5f0', metal: '#b8bec6',
  player: '#9aa0a8', playerHelm: '#6e757d', playerVisor: '#2b2f33', playerHurt: '#ff8a80', playerDead: '#5b6270',
  zombies: ['#4f9a3a', '#5aa843', '#478f35', '#63b04a'], zombieBrow: '#2f5a22', zombieEye: '#1d1f1e', corpse: '#6c7173', wound: '#7a1f1f',
  accent: '#f2b134', alert: '#e63946', fog: 'rgba(12,14,22,0.84)',
  arrowShaft: '#6b4a24', arrowHead: '#cfd4da', arrowFletch: '#eef1f4',
  hud: 'rgba(20,26,38,0.55)', hudText: 'rgba(20,26,38,0.7)', crosshair: 'rgba(20,26,38,0.75)',
  ghostOk: 'rgba(120,220,120,0.9)', ghostBad: 'rgba(230,57,70,0.9)',
  items: { dirt: '#7a4f2a', plank: '#a5703a', log: '#6b4a24', stone: '#8a8d93', leaf: '#3f8f3a', arrow: '#cfd4da' },
};
