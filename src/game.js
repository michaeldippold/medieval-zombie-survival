// Owns the state object and runs the systems in order. See DESIGN §16.
import { VIEW, START_INVENTORY } from './config.js';
import { createInput } from './input.js';
import { buildStarterMap } from './world/maps.js';
import { computeVision } from './world/vision.js';
import { createPlayer, updatePlayer } from './entities/player.js';
import { createZombie, updateZombies } from './entities/zombie.js';
import { updateDrops } from './entities/drops.js';
import { updateCombat, updateHotbar } from './combat.js';
import { updateTools } from './tools.js';
import { updateHints } from './ui/hints.js';
import { menuItemsForTile } from './interactions.js';
import { ContextMenu } from './ui/menu.js';
import { render } from './render/renderer.js';

export function createGame({ canvas, menuEl, status }) {
  const ctx = canvas.getContext('2d');
  const input = createInput(canvas);
  const menu = new ContextMenu(menuEl, canvas);

  const state = {
    input, world: null, player: null, zombies: [], drops: [], arrows: [], inventory: {},
    swing: null, bowCool: 0, toolCool: 0, target: null, aim: 0, hint: null,
    held: 'sword', hotbarAnim: 0, camera: { x: 0, y: 0 }, vision: { visible: new Set(), exposed: true },
    attention: null, kills: 0, time: 0, paused: false,
  };

  function restart() {
    const map = buildStarterMap();
    state.world = map.world;
    state.player = createPlayer(map.playerSpawn.x, map.playerSpawn.y);
    state.zombies = map.zombieSpawns.map(s => createZombie(s.x, s.y));
    state.drops = []; state.arrows = []; state.inventory = { ...START_INVENTORY };
    state.swing = null; state.bowCool = 0; state.toolCool = 0; state.target = null; state.hint = null;
    state.attention = null; state.kills = 0; state.time = 0;
    status.total.textContent = state.zombies.length;
    updateCamera();
  }

  function updateCamera() {
    const { player: p, world, camera } = state;
    camera.x = Math.max(0, Math.min(world.pxWidth - VIEW.W, p.x + p.w / 2 - VIEW.W / 2));
    camera.y = Math.max(0, Math.min(world.pxHeight - VIEW.H, p.y + p.h / 2 - VIEW.H * VIEW.CAMERA_Y_BIAS));
    input.mouse.wx = input.mouse.sx + camera.x; input.mouse.wy = input.mouse.sy + camera.y;
    state.aim = Math.atan2(input.mouse.wy - (p.y + p.h / 2), input.mouse.wx - (p.x + p.w / 2));
    p.facing = Math.cos(state.aim) >= 0 ? 1 : -1;
  }

  function update(dt) {
    const a = input.actions;
    if (a.restart) { restart(); state.paused = false; }
    if (a.closeMenu) menu.close();
    // Escape closes whatever UI is open; with nothing open it toggles pause
    if (a.escape) { if (menu.isOpen) menu.close(); else state.paused = !state.paused; }
    if (state.paused) { input.endFrame(); return; }
    if (a.menuAt) {
      const c = state.world.colOf(input.mouse.wx), r = state.world.rowOf(input.mouse.wy);
      menu.open(menuItemsForTile(state, c, r), a.menuAt.clientX, a.menuAt.clientY);
    }

    state.time += dt;
    updateHotbar(state);
    updatePlayer(state, dt);
    const p = state.player;
    state.vision = computeVision(state.world, p.x + p.w / 2, p.y + p.h / 2);
    updateZombies(state, dt);
    updateCamera();
    updateTools(state, dt);
    updateCombat(state, dt);
    updateDrops(state, dt);
    updateHints(state, dt);

    status.vis.textContent = state.vision.exposed ? 'exposed' : 'sealed';
    status.hit.textContent = state.kills;
    input.endFrame();
  }

  function draw() { render(ctx, state); }

  restart();
  return { state, update, draw, restart };
}
