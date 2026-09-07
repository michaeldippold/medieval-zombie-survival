// Owns the state object and runs the systems in order. See DESIGN §16.
import { VIEW } from './config.js';
import { createInput } from './input.js';
import { buildStarterMap } from './world/maps.js';
import { computeVision } from './world/vision.js';
import { createPlayer, updatePlayer } from './entities/player.js';
import { createZombie, updateZombies } from './entities/zombie.js';
import { updateCombat } from './combat.js';
import { menuItemsForTile } from './interactions.js';
import { ContextMenu } from './ui/menu.js';
import { render } from './render/renderer.js';

export function createGame({ canvas, menuEl, status }) {
  const ctx = canvas.getContext('2d');
  const input = createInput(canvas);
  const menu = new ContextMenu(menuEl, canvas);

  const state = {
    input, world: null, player: null, zombies: [], arrows: [], swing: null, bowCool: 0, aim: 0,
    held: 'sword', hotbarAnim: 0, camera: { x: 0, y: 0 }, vision: { visible: new Set(), exposed: true },
    attention: null, kills: 0, time: 0,
  };

  function restart() {
    const map = buildStarterMap();
    state.world = map.world;
    state.player = createPlayer(map.playerSpawn.x, map.playerSpawn.y);
    state.zombies = map.zombieSpawns.map(s => createZombie(s.x, s.y));
    state.arrows = []; state.swing = null; state.bowCool = 0; state.attention = null; state.kills = 0; state.time = 0;
    status.total.textContent = state.zombies.length;
  }
  restart();

  function updateCamera() {
    const { player: p, world, camera } = state;
    camera.x = Math.max(0, Math.min(world.pxWidth - VIEW.W, p.x + p.w / 2 - VIEW.W / 2));
    camera.y = Math.max(0, Math.min(world.pxHeight - VIEW.H, p.y + p.h / 2 - VIEW.H / 2));
    input.mouse.wx = input.mouse.sx + camera.x; input.mouse.wy = input.mouse.sy + camera.y;
    state.aim = Math.atan2(input.mouse.wy - (p.y + p.h / 2), input.mouse.wx - (p.x + p.w / 2));
    p.facing = Math.cos(state.aim) >= 0 ? 1 : -1;
  }

  function update(dt) {
    state.time += dt;
    const a = input.actions;
    if (a.restart) restart();
    if (a.closeMenu) menu.close();
    if (a.menuAt) {
      const c = state.world.colOf(input.mouse.wx), r = state.world.rowOf(input.mouse.wy);
      menu.open(menuItemsForTile(state, c, r), a.menuAt.clientX, a.menuAt.clientY);
    }

    updatePlayer(state, dt);
    const p = state.player;
    state.vision = computeVision(state.world, p.x + p.w / 2, p.y + p.h / 2);
    updateZombies(state, dt);
    updateCamera();
    updateCombat(state, dt);

    status.vis.textContent = state.vision.exposed ? 'exposed' : 'sealed';
    status.hit.textContent = state.kills;
    input.endFrame();
  }

  function draw() { render(ctx, state); }

  return { state, update, draw, restart };
}
