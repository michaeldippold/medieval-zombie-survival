// Draws the world from state. Reads only; never mutates state.
import { TILE as T, VIEW, COLORS } from '../config.js';
import { isPortal, isAir } from '../world/tiles.js';
import { ITEMS } from '../items.js';
import { paintTile } from './tiles.js';
import { drawPlayer, drawZombie, drawSwing, drawArrow, drawDrop } from './sprites.js';
import { drawHud } from '../ui/hud.js';

export function render(ctx, state) {
  const { world, camera, vision, player: p, input } = state;
  ctx.clearRect(0, 0, VIEW.W, VIEW.H);
  ctx.fillStyle = COLORS.sky; ctx.fillRect(0, 0, VIEW.W, VIEW.H);

  ctx.save();
  ctx.translate(-Math.round(camera.x), -Math.round(camera.y));

  // clouds: slow parallax against the camera, pinned to the sky band above the surface
  ctx.fillStyle = COLORS.cloud;
  const px = camera.x * 0.3, cy = Math.max(0, camera.y) * 0.5;
  for (let x = 120; x < world.pxWidth + 600; x += 520) {
    ctx.fillRect(x + px, 70 + cy, 90, 22); ctx.fillRect(x + 20 + px, 56 + cy, 50, 16); ctx.fillRect(x + 260 + px, 150 + cy, 70, 18);
    ctx.fillRect(x + 380 + px, 330 + cy, 80, 18); ctx.fillRect(x + 90 + px, 420 + cy, 60, 14);
  }

  const cFrom = Math.max(0, world.colOf(camera.x)), cTo = Math.min(world.cols - 1, world.colOf(camera.x + VIEW.W));
  const rFrom = Math.max(0, world.rowOf(camera.y)), rTo = Math.min(world.rows - 1, world.rowOf(camera.y + VIEW.H));
  for (let r = rFrom; r <= rTo; r++) for (let c = cFrom; c <= cTo; c++) { const t = world.grid[r][c]; if (t) paintTile(ctx, c, r, t); }

  ctx.fillStyle = COLORS.fog;
  for (let r = rFrom; r <= rTo; r++) for (let c = cFrom; c <= cTo; c++) if (!vision.visible.has(world.idx(c, r))) ctx.fillRect(c * T, r * T, T, T);

  for (const d of state.drops) if (vision.visible.has(world.idxAtPx(d.x + d.w / 2, d.y + d.h / 2))) drawDrop(ctx, d);
  for (const e of state.zombies) if (vision.visible.has(world.idxAtPx(e.x + e.w / 2, e.y + e.h / 2))) drawZombie(ctx, e);

  const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
  if (state.swing) drawSwing(ctx, pcx, pcy, state.swing);
  drawPlayer(ctx, p, state.aim, state.held);
  for (const a of state.arrows) drawArrow(ctx, a);

  // cursor feedback: portals and buildable air get an outline; a tool target gets a stronger one
  const mc = world.colOf(input.mouse.wx), mr = world.rowOf(input.mouse.wy);
  const hover = world.get(mc, mr);
  if (state.target) {
    ctx.strokeStyle = state.target.near ? COLORS.accent : 'rgba(242,177,52,0.4)'; ctx.lineWidth = 2;
    ctx.strokeRect(state.target.c * T - 2, state.target.r * T - 2, T + 4, T + 4);
  } else if (isPortal(hover) || (ITEMS[state.held].kind !== 'tool' && isAir(hover) && world.inBounds(mc, mr))) {
    ctx.strokeStyle = isPortal(hover) ? COLORS.accent : 'rgba(255,255,255,0.35)'; ctx.lineWidth = isPortal(hover) ? 2 : 1;
    ctx.strokeRect(mc * T - 2, mr * T - 2, T + 4, T + 4);
  }

  const { wx, wy } = input.mouse;
  ctx.strokeStyle = COLORS.crosshair; ctx.lineWidth = 1; ctx.beginPath();
  ctx.moveTo(wx - 8, wy); ctx.lineTo(wx - 3, wy); ctx.moveTo(wx + 3, wy); ctx.lineTo(wx + 8, wy);
  ctx.moveTo(wx, wy - 8); ctx.lineTo(wx, wy - 3); ctx.moveTo(wx, wy + 3); ctx.lineTo(wx, wy + 8); ctx.stroke();
  ctx.restore();

  drawHud(ctx, state);
}
